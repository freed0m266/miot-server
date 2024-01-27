import { InfluxDB, Point } from "@influxdata/influxdb-client";

export type DataPoint = {
  timestamp: number | Date;
  deskId: string;
  zoneId: string;
  value: number;
};

const token = process.env.INFLUXDB_TOKEN;
const url = process.env.INFLUXDB_URL;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

const client = new InfluxDB({ url, token });

let queryClient = client.getQueryApi(org);
let writeClient = client.getWriteApi(org, bucket, "s");

export function queryInflux(fluxQuery: string): Promise<DataPoint[]> {
  return new Promise((resolve, reject) => {
    const results: DataPoint[] = [];

    queryClient.queryRows(fluxQuery, {
      next: (row, tableMeta) => {
        const tableObject = tableMeta.toObject(row);
        const result: DataPoint = {
          timestamp: new Date(tableObject._time),
          deskId: tableObject.deskId,
          zoneId: tableObject.zoneId,
          value: tableObject._value,
        };
        results.push(result);
      },
      error: (error) => {
        console.error("\nError running Influx query", error);
        reject(error);
      },
      complete: () => {
        // console.log('\nSuccess');
        // console.log(results);
        resolve(results);
      },
    });
  });
}

export function writeToInflux({
  timestamp,
  deskId,
  zoneId,
  value,
}: DataPoint): void {
  let point = new Point("current")
    .tag("deskId", deskId)
    .tag("zoneId", zoneId)
    .intField("rms_avg", value)
    .timestamp(timestamp as number); // should be Unix timestamp in seconds: Math.floor(new Date().getTime() / 1000)

  writeClient.writePoint(point);
  // console.log("Write point: " + point.toLineProtocol());
}

export function flushToInflux(): void {
  writeClient.flush().then(() => {
    console.log("WRITE FINISHED");
  });
}
