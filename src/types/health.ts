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

export type TrainingExperience = "iniciante" | "intermediario" | "experiente";

export type UserSex = "homem" | "mulher";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  age: number;
  sex: UserSex;
  trainingExperience: TrainingExperience;
  createdAt: string;
};

export type LiveExerciseSample = {
  id?: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  timestamp: string;
  heartRate: number | null;
  activeEnergyBurned: number | null;
  distance: number | null;
  stepCount: number | null;
  oxygenSaturation: number | null;
  accelerationX: number | null;
  accelerationY: number | null;
  accelerationZ: number | null;
  gyroscopeX: number | null;
  gyroscopeY: number | null;
  gyroscopeZ: number | null;
};

export type LiveExerciseSession = {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  endedAt: string;
  setCount: number;
  reps: number | null;
  detectedReps?: number | null;
  samples: LiveExerciseSample[];
};

export type LiveExerciseGroup = {
  day: string;
  exerciseId: string;
  exerciseName: string;
  setCount: number;
  totalReps: number;
  startedAt: string;
  endedAt: string;
  samples: LiveExerciseSample[];
};

export type LiveExerciseSessionRecord = LiveExerciseSession & {
  day: string;
};
