import { DeskDto } from "../models/desk.model";

type GetDesksServiceParams = {
  zoneId: string;
  deskIds?: string[];
  count?: number;
  unit?: "day" | "week" | "month" | "year";
};

type ManageDeskServiceParams = {
  zoneId: string;
  deskId: string;
};

export function getDesksService({
  zoneId,
  deskIds = [],
  count,
  unit,
}: GetDesksServiceParams): DeskDto[] {
  console.log("Fetching desks");
  return [
    {
      id: "18eebf7a-7e72-4a5a-8b6a-ad26694283ab",
      zoneId: "floor-1",
      status: "inactive",
      lastUsed: new Date("2023-12-20"),
      averageWorkHoursUsage: 8,
      averageDailyUsage: 5,
      shortUsagesCount: 4,
    },
    {
      id: "04814482-d1fb-4d96-ae11-813181dfc15f",
      zoneId: "floor-1",
      status: "active",
      lastUsed: new Date("2024-01-3"),
      averageWorkHoursUsage: 16,
      averageDailyUsage: 9,
      shortUsagesCount: 2,
    },
    {
      id: "c5dbe9ef-c9f5-467d-b212-4f53cabe3b6c",
      zoneId: "floor-2",
      status: "offline",
      lastUsed: new Date("2021-01-01"),
      averageWorkHoursUsage: 0,
      averageDailyUsage: 0,
      shortUsagesCount: 0,
    },
  ];
}

export function createDesksService({
  zoneId,
  deskId,
}: ManageDeskServiceParams): void {
  console.log("Creating desk");
}

export function deleteDesksService({
  zoneId,
  deskId,
}: ManageDeskServiceParams): void {
  console.log("Deleting desk");
}
