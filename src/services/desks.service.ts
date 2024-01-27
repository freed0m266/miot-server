import { DeskDto, DeskStatus } from "../models/desk.model";
import fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
import { DataPoint } from "../client/influx.client";
import {
  getLatestActiveDataPoint,
  getLatestDataPoint,
  getShortUsageCount,
  getAverage,
  getWorkdayAverage,
} from "./influx.service";

type GetDesksServiceParams = {
  zoneId: string;
  deskIds?: string[];
  count?: number;
  unit?: "day" | "week";
};

export type ManageDeskServiceParams = {
  zoneId: string;
  deskId: string;
  zoneName: string;
  deskName: string;
};

export async function getDesksService({
  zoneId,
  deskIds = [],
  count = 10,
  unit = "day",
}: GetDesksServiceParams): Promise<DeskDto[]> {
  const desksResult: DeskDto[] = [];

  const averageDataPoints: DataPoint[] = await getAverage(zoneId, count, unit);
  const workdayAverageDataPoints: DataPoint[] = await getWorkdayAverage(
    zoneId,
    count,
    unit,
  );
  //
  const latestDataPoints: DataPoint[] = await getLatestDataPoint(zoneId);
  const latestActiveDataPoints: DataPoint[] =
    await getLatestActiveDataPoint(zoneId);

  if (Array.isArray(deskIds) && deskIds.length > 0) {
    for (const deskId of deskIds) {
      const exists = await doesDeskAlreadyExist(zoneId, deskId);
      if (!exists) {
        continue;
      }
      const deskObject = await getDeskFromCsv(deskId, zoneId);
      desksResult.push(
        await mapToDeskDto(
          deskId,
          deskObject.deskName,
          zoneId,
          getDataPointForDesk(deskId, averageDataPoints),
          getDataPointForDesk(deskId, workdayAverageDataPoints),
          getDataPointForDesk(deskId, latestDataPoints),
          getDataPointForDesk(deskId, latestActiveDataPoints),
        ),
      );
    }
    return desksResult;
  } else {
    const allDesks = await getDesksFromCsv();
    const allZoneDesks = allDesks.filter((i) => i.zoneId === zoneId);
    for (const desk of allZoneDesks) {
      desksResult.push(
        await mapToDeskDto(
          desk.deskId,
          desk.deskName,
          zoneId,
          getDataPointForDesk(desk.deskId, averageDataPoints),
          getDataPointForDesk(desk.deskId, workdayAverageDataPoints),
          getDataPointForDesk(desk.deskId, latestDataPoints),
          getDataPointForDesk(desk.deskId, latestActiveDataPoints),
        ),
      );
    }
    return desksResult;
  }
}

export async function createDesksService({
  zoneId,
  deskId,
  zoneName,
  deskName,
}): Promise<number> {
  console.log("Creating desk");

  const exists = await doesDeskAlreadyExist(zoneId, deskId);
  if (exists) {
    return 400;
  }

  fs.appendFile(
    process.env.PERSISTENCE_PATH,
    `\n${deskId},${deskName},${zoneId},${zoneName}`,
    function (err) {
      if (err) throw err;
    },
  );

  return 201;
}

export async function deleteDesksService({ zoneId, deskId }): Promise<number> {
  console.log("Deleting desk");

  let response = null;
  const csvFilePath = path.resolve(process.env.PERSISTENCE_PATH);
  const headers = ["deskId", "deskName", "zoneId", "zoneName"];

  const rows: ManageDeskServiceParams[] = [];

  // Read CSV and filter rows
  const stream = fs.createReadStream(csvFilePath);
  const parser = parse({
    delimiter: ",",
    columns: headers,
  });

  stream.pipe(parser);

  parser.on("data", (row: ManageDeskServiceParams) => {
    if (
      !(
        row.zoneId.trim() === zoneId.trim() &&
        row.deskId.trim() === deskId.trim()
      )
    ) {
      rows.push(row); // Exclude the row to be deleted
    } else {
      response = 200;
    }
  });

  await new Promise<void>((resolve, reject) => {
    parser.on("end", () => {
      resolve();
    });

    parser.on("error", (error) => {
      response = 500;
      reject(error);
    });
  });

  // Write the updated content back to the CSV file
  const updatedCsvContent = rows
    .map((row) => Object.values(row).join(","))
    .join("\n");
  fs.writeFileSync(csvFilePath, updatedCsvContent, { encoding: "utf-8" });

  return response;
}

async function getDeskFromCsv(
  deskId: string,
  zoneId: string,
): Promise<ManageDeskServiceParams> {
  const allDesks = await getDesksFromCsv();
  const allZoneDesks = allDesks.filter((i) => i.zoneId === zoneId);
  return allZoneDesks.find((i) => i.deskId === deskId);
}

export async function getDesksFromCsv(): Promise<ManageDeskServiceParams[]> {
  const csvFilePath = path.resolve(process.env.PERSISTENCE_PATH);
  const headers = ["deskId", "deskName", "zoneId", "zoneName"];

  const desks: ManageDeskServiceParams[] = [];

  const stream = fs.createReadStream(csvFilePath);
  const parser = parse({
    delimiter: ",",
    columns: headers,
  });

  stream.pipe(parser);

  await new Promise<void>((resolve, reject) => {
    parser.on("data", (row: ManageDeskServiceParams) => {
      desks.push(row);
    });

    parser.on("end", () => {
      desks.shift(); // Remove headers
      resolve();
    });

    parser.on("error", (error) => {
      reject(error);
    });
  });

  return desks;
}

async function doesDeskAlreadyExist(
  zoneId: string,
  deskId: string,
): Promise<boolean> {
  const csvFilePath = path.resolve(process.env.PERSISTENCE_PATH);
  const headers = ["deskId", "deskName", "zoneId", "zoneName"];

  return new Promise<boolean>((resolve, reject) => {
    const stream = fs.createReadStream(csvFilePath);

    const parser = parse({
      delimiter: ",",
      columns: headers,
    });

    stream.pipe(parser);

    let deskExists = false;

    parser.on("data", (row: ManageDeskServiceParams) => {
      if (
        row.zoneId.trim() === zoneId.trim() &&
        row.deskId.trim() === deskId.trim()
      ) {
        deskExists = true;
      }
    });

    parser.on("end", () => {
      resolve(deskExists);
    });

    parser.on("error", (error) => {
      reject(error);
    });
  });
}

function mapToDeskDto(
  deskId: string,
  deskName: string,
  zoneId: string,
  averageDataPoint: DataPoint,
  workdayAverageDataPoint: DataPoint,
  latestDataPoint: DataPoint,
  latestActiveDataPoint: DataPoint,
): DeskDto {
  return {
    id: deskId,
    name: deskName,
    zoneId: zoneId,
    status: getDeskStatus(latestDataPoint),
    lastUsed: latestActiveDataPoint
      ? (latestActiveDataPoint.timestamp as Date)
      : null,
    averageWorkHoursUsage: workdayAverageDataPoint
      ? workdayAverageDataPoint.value
      : null,
    averageDailyUsage: averageDataPoint ? averageDataPoint.value : null,
    shortUsagesCount: Math.floor(Math.random() * (25 - 1 + 1) + 1),
  };
}

// If the desk has active usage (more than 500 rms_avg) and last data point is less than 16 minutes old
export function getDeskStatus(dataPoint: DataPoint): DeskStatus {
  if (!dataPoint) {
    return "offline";
  }

  const difInSecs =
    Math.abs(new Date(dataPoint.timestamp).valueOf() - Date.now().valueOf()) /
    1000;

  // Has the desk reported in last 31 minutes
  if (difInSecs < 60 * 31) {
    // Has the desk rms_avg over 500
    if (dataPoint.value >= 500) {
      return "active";
    } else {
      return "inactive";
    }
  } else {
    return "offline";
  }
}

function getDataPointForDesk(
  deskId: string,
  dataPoints: DataPoint[],
): DataPoint | undefined {
  if (!dataPoints) {
    return undefined;
  }
  return dataPoints.find((dataPoint) => dataPoint.deskId === deskId);
}
