export type HealthMetricType = "heartRate" | "activeEnergyBurned" | "stepCount" | "distance";

export type MetricSampleInterval = "hour" | "day";

export type NativeWorkout = {
  id: string;
  activityType: string;
  startDate: string;
  endDate: string;
  duration: number;
  activeEnergyBurned: number;
  distance: number;
  sourceName: string;
};

export type Workout = NativeWorkout & {
  durationMinutes: number;
};

export type MetricSample = {
  type: HealthMetricType;
  startDate: string;
  endDate: string;
  value: number;
  unit: string;
};

export type DashboardSummary = {
  workoutCount: number;
  totalDurationMinutes: number;
  totalEnergyBurned: number;
  totalDistance: number;
  lastSyncAt: string | null;
};
