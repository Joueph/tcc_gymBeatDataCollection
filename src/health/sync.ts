import { database } from "@/src/storage/database";
import type { HealthMetricType } from "@/src/types/health";

import { healthKit } from "./health-kit";

const metrics: HealthMetricType[] = ["heartRate", "activeEnergyBurned", "stepCount", "distance"];

export type SyncResult = {
  workoutCount: number;
  sampleCount: number;
  syncedAt: string;
};

export const syncHealthData = async (lookbackDays = 30): Promise<SyncResult> => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const workouts = await healthKit.getWorkouts(startDate, endDate);
  await database.saveWorkouts(workouts);

  let sampleCount = 0;
  for (const metric of metrics) {
    const samples = await healthKit.getMetricSamples(metric, startDate, endDate, "day");
    sampleCount += samples.length;
    await database.saveMetricSamples(samples);
  }

  const syncedAt = new Date().toISOString();
  await database.setLastSyncAt(syncedAt);

  return {
    workoutCount: workouts.length,
    sampleCount,
    syncedAt,
  };
};
