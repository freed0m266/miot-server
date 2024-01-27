import { getDesksFromCsv } from "./desks.service";
import { ZoneDto } from "../models/zone.model";

export async function getZonesService(): Promise<ZoneDto[]> {
  const csvRows = await getDesksFromCsv();

  const uniqueZoneIds = new Set<string>();

  return csvRows
    .filter((row) => {
      // Check if the zoneId is not in the Set
      if (!uniqueZoneIds.has(row.zoneId)) {
        // If not present, add it to the Set and return true to include it in the result
        uniqueZoneIds.add(row.zoneId);
        return true;
      }
      // If already present, return false to exclude it from the result
      return false;
    })
    .map((row) => {
      return {
        id: row.zoneId,
        name: row.zoneName,
      };
    });
}
