import {
  DataPoint,
  flushToInflux,
  queryInflux,
  writeToInflux,
} from "../client/influx.client";
import { createDesksService, getDesksFromCsv } from "./desks.service";

const bucket = process.env.INFLUXDB_BUCKET;

const valueMin: number = 200;
const valueMax: number = 850;
const activeMinimum: number = 500;

export async function saveDataPoint(
  timestamp: number,
  deskId: string,
  value: number,
): Promise<void> {
  let desks = await getDesksFromCsv();
  let real_desk = desks.find((i) => i.deskId === deskId);
  if (real_desk == undefined) {
    await createDesksService({
      zoneId: "zone1",
      deskId: deskId,
      zoneName: "Conference Room",
      deskName: "Real Desk",
    });
    desks = await getDesksFromCsv();
    real_desk = desks.find((i) => i.deskId === deskId);
  }

  // Write data of real desk (current) to influx
  writeToInflux({
    timestamp: timestamp,
    deskId: real_desk.deskId,
    zoneId: real_desk.zoneId,
    value: value,
  });

  desks
    .filter(
      (i) => i.deskId !== real_desk.deskId || i.zoneId !== real_desk.zoneId,
    )
    .forEach((desk) => {
      // Write data of other desks (virtual) to influx
      writeToInflux({
        timestamp: timestamp,
        deskId: desk.deskId,
        zoneId: desk.zoneId,
        value: Math.floor(Math.random() * (valueMax - valueMin + 1) + valueMin),
      });
    });

  flushToInflux();
}

export async function getAverage(
  zoneId: string,
  count: number = 10,
  unit: "day" | "week" = "day",
): Promise<DataPoint[]> {
  let fluxQuery = `from(bucket: "${bucket}")
  |> range(start: ${convertTimeRange(count, unit)})
  |>filter(fn: (r) => r["zoneId"] == "${zoneId}")
  |> filter(fn: (r) => 
      r._measurement == "current" and 
      r._field == "rms_avg")
  |> mean()`;

  // console.log(fluxQuery);

  return queryInflux(fluxQuery);
}

export async function getWorkdayAverage(
  zoneId: string,
  count: number = 10,
  unit: "day" | "week" = "day",
): Promise<DataPoint[]> {
  let fluxQuery = `
  import "date"
  from(bucket: "${bucket}")
  |> range(start: ${convertTimeRange(count, unit)})
  |>filter(fn: (r) => r["zoneId"] == "${zoneId}")
  |> filter(fn: (r) => 
      r._measurement == "current" and 
      r._field == "rms_avg")
  |> map(fn: (r) => ({ r with dayOfWeek: date.weekDay(t: r._time) }))
  |> filter(fn: (r) => r.dayOfWeek >= 1 and r.dayOfWeek <= 5)
  |> hourSelection(start: 9, stop: 17)
  |> mean()`;

  // console.log(fluxQuery);

  return queryInflux(fluxQuery);
}

export async function getLatestDataPoint(zoneId: string): Promise<DataPoint[]> {
  let fluxQuery = `from(bucket: "${bucket}")
      |> range(start: -90d)
      |> filter(fn: (r) => r["_measurement"] == "current")
      |> filter(fn: (r) => r["_field"] == "rms_avg")
      |> filter(fn: (r) => r["zoneId"] == "${zoneId}")
      |> last()`;

  // console.log(fluxQuery);

  return queryInflux(fluxQuery);
}

export async function getLatestActiveDataPoint(
  zoneId: string,
): Promise<DataPoint[]> {
  let fluxQuery = `from(bucket: "${bucket}")
      |> range(start: -90d)
      |> filter(fn: (r) => r["_measurement"] == "current")
      |> filter(fn: (r) => r["_field"] == "rms_avg")
      |> filter(fn: (r) => r["zoneId"] == "${zoneId}")
      |> filter(fn: (r) => r["_value"] > ${activeMinimum})
      |> last()`;

  // console.log(fluxQuery);

  return queryInflux(fluxQuery);
}

export async function getLatestTwoDataPoints(
  zoneId: string,
  deskId: string,
): Promise<DataPoint[]> {
  let fluxQuery = `from(bucket: "${bucket}")
      |> range(start: -44m)
      |> filter(fn: (r) => r["_measurement"] == "current")
      |> filter(fn: (r) => r["_field"] == "rms_avg")
      |> filter(fn: (r) => r["zoneId"] == "${zoneId}")
      |> filter(fn: (r) => r["deskId"] == "${deskId}")
      |> aggregateWindow(every: 23m, fn: last)`;

  // console.log(fluxQuery);

  return queryInflux(fluxQuery);
}

export async function getShortUsageCount(
  zoneId: string,
  count: number,
  unit: "day" | "week" = "day",
): Promise<DataPoint[]> {
  let fluxQuery = `baseData = from(bucket: "${bucket}")
  |> range(start: ${convertTimeRange(count, unit)})
  |> filter(fn: (r) => 
      r._measurement == "current" and 
      r._field == "rms_avg")
  
nextData = baseData |> duplicate(column: "_time", as: "next_time") |> timeShift(duration: -5m, columns: ["_time"]) 
prevData = baseData |> duplicate(column: "_time", as: "prev_time") |> timeShift(duration: 5m, columns: ["_time"])

join1 = join(tables: {nowRun: baseData, prevRun: prevData}, on: ["_time", "deskId", "_measurement", "_field", "zoneId"], method: "inner")
join2 = join(tables: {nowRun: join1, nextRun: nextData}, on: ["_time", "deskId", "_measurement", "_field", "zoneId"], method: "inner")

join2
  |> map(fn: (r) => ({
      _time: r._time,
      deskId: r.deskId,
      zoneId: r.zoneId,
      patternMatch: r._value_prevRun < ${activeMinimum} and r._value_nowRun > ${activeMinimum} and r._value < ${activeMinimum}
    }))
  |> filter(fn: (r) => r.patternMatch)
  |> group(columns: ["deskId", "zoneId"])
  |> filter(fn: (r) => r["zoneId"] == "${zoneId}")
  |> duplicate(column: "patternMatch", as: "_value")
  |> count()`;

  return queryInflux(fluxQuery);
}

function convertTimeRange(count: number, unit: "day" | "week"): string {
  switch (unit) {
    case "day": {
      return `-${count.toString()}d`;
    }
    case "week": {
      return `-${count.toString()}w`;
    }
  }
}

function getAggregateWindow(count: number, unit: "day" | "week"): string {
  switch (unit) {
    case "day": {
      return `${(count + 1).toString()}d`;
    }
    case "week": {
      return `${(count + 1).toString()}w`;
    }
  }
}
