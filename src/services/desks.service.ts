import { DeskDto, DeskStatus } from "../models/desk.model";
import fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
import { DataPoint } from "../client/influx.client";
import {
  getLatestActiveDataPoint,
  getLatestDataPoint,
  getStats,
} from "./influx.service";

type GetDesksServiceParams = {
  zoneId: string;
  deskIds?: string[];
  count?: number;
  unit?: "day" | "week" | "month" | "year";
};

export type ManageDeskServiceParams = {
  zoneId: string;
  deskId: string;
};

export async function getDesksService({
  zoneId,
  deskIds = [],
  count = 10,
  unit = "day",
}: GetDesksServiceParams): Promise<DeskDto[]> {
  const desksResult: DeskDto[] = [];

  if (Array.isArray(deskIds) && deskIds.length > 0) {
    for (const deskId of deskIds) {
      const exists = await doesDeskAlreadyExist(zoneId, deskId);
      if (!exists) {
        continue;
      }
      desksResult.push(await getDeskData(deskId, zoneId, count, unit));
    }
    return desksResult;
  } else {
    const allDesks = await getDesksFromCsv();
    const allZoneDesks = allDesks.filter((i) => i.zoneId === zoneId);
    const zoneDeskIds = allZoneDesks.map((i) => i.deskId);
    for (const deskId of zoneDeskIds) {
      desksResult.push(await getDeskData(deskId, zoneId, count, unit));
    }
    return desksResult;
  }
}

export async function createDesksService({
  zoneId,
  deskId,
}: ManageDeskServiceParams): Promise<number> {
  console.log("Creating desk");

  const exists = await doesDeskAlreadyExist(zoneId, deskId);
  if (exists) {
    return 400;
  }

  fs.appendFile(
    "../server/src/persistence/desks.csv",
    `\n${deskId}, ${zoneId}`,
    function (err) {
      if (err) throw err;
    },
  );

  return 201;
}

export async function deleteDesksService({
  zoneId,
  deskId,
}: ManageDeskServiceParams): Promise<number> {
  console.log("Deleting desk");

  let response = null;
  const csvFilePath = path.resolve("../server/src/persistence/desks.csv");
  const headers = ["deskId", "zoneId"];

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

export async function getDesksFromCsv(): Promise<ManageDeskServiceParams[]> {
  const csvFilePath = path.resolve("../server/src/persistence/desks.csv");
  const headers = ["deskId", "zoneId"];

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

async function getDeskData(deskId, zoneId, count, unit): Promise<DeskDto> {
  const statsPromises = [];
  const latestDataPromises = [];
  const latestActiveDataPromises = [];

  statsPromises.push(getStats(zoneId, deskId, count, unit));
  latestDataPromises.push(getLatestDataPoint(zoneId, deskId, count, unit));
  latestActiveDataPromises.push(
    getLatestActiveDataPoint(zoneId, deskId, count, unit),
  );

  const stats: DataPoint[][] = await Promise.all(statsPromises);
  const latestDataPoint: DataPoint[][] = await Promise.all(latestDataPromises);
  const latestActiveDataPoint: DataPoint[][] = await Promise.all(
    latestActiveDataPromises,
  );

  // If some data are not available, return an offline desk with null stats
  if (
    stats === undefined ||
    stats.length == 0 ||
    stats[0] === undefined ||
    stats[0].length == 0 ||
    latestDataPoint === undefined ||
    latestDataPoint.length == 0 ||
    latestDataPoint[0] === undefined ||
    latestDataPoint[0].length == 0 ||
    latestActiveDataPoint === undefined ||
    latestActiveDataPoint.length == 0 ||
    latestActiveDataPoint[0] === undefined ||
    latestActiveDataPoint[0].length == 0
  ) {
    return {
      id: deskId,
      zoneId: zoneId,
      status: "offline",
      lastUsed: null,
      averageWorkHoursUsage: null,
      averageDailyUsage: null,
      shortUsagesCount: null,
    };
  } else {
    return mapToDeskDto(
      stats[0][0],
      latestDataPoint[0][0],
      latestActiveDataPoint[0][0],
    );
  }
}

async function doesDeskAlreadyExist(
  zoneId: string,
  deskId: string,
): Promise<boolean> {
  const csvFilePath = path.resolve("../server/src/persistence/desks.csv");
  const headers = ["deskId", "zoneId"];

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
  stats: DataPoint,
  latestDataPoint: DataPoint,
  latestActiveDataPoint: DataPoint,
): DeskDto {
  return {
    id: stats.deskId,
    zoneId: stats.zoneId,
    status: getDeskStatus(latestDataPoint),
    lastUsed: latestActiveDataPoint.timestamp as Date,
    averageWorkHoursUsage: stats.value, // ToDo
    averageDailyUsage: stats.value, // ToDo
    shortUsagesCount: 2, // ToDo
  };
}

// If the desk has active usage (more than 300 rms_avg) and last data point is less than 5 minutes old
export function getDeskStatus(dataPoint: DataPoint): DeskStatus {
  const difInSecs =
    Math.abs(new Date(dataPoint.timestamp).valueOf() - Date.now().valueOf()) /
    1000;

  // Has the desk reported in last 3 minutes
  if (difInSecs < 60 * 3) {
    // ToDo: does 5 minutes make sense?
    // Has the desk rms_avg over 300
    if (dataPoint.value > 300) {
      // ToDo: set accurate limit
      return "active";
    } else {
      return "inactive";
    }
  } else {
    return "offline";
  }
}
