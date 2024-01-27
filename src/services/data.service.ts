import { saveDataPoint } from "./influx.service";
import { HardwarioPayload } from "../controllers/data.controller";

export async function saveData(payload: HardwarioPayload) {
  for (const measurement of payload.data) {
    await saveDataPoint(
      measurement.timestamp,
      payload.deskId,
      measurement.rms_avg,
    );
  }
}
