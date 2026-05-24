import HealthKitNative from "@/modules/health-kit/src";

import type {
  HealthMetricType,
  MetricSample,
  MetricSampleInterval,
  NativeWorkout,
} from "@/src/types/health";

const fallbackWorkouts: NativeWorkout[] = [
  {
    id: "demo-run",
    activityType: "Corrida",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 38).toISOString(),
    duration: 60 * 38,
    activeEnergyBurned: 316,
    distance: 5200,
    sourceName: "Demo",
  },
  {
    id: "demo-strength",
    activityType: "Treino funcional",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 44).toISOString(),
    duration: 60 * 44,
    activeEnergyBurned: 248,
    distance: 0,
    sourceName: "Demo",
  },
];

const buildDemoSamples = (
  type: HealthMetricType,
  startDate: string,
  endDate: string,
  interval: MetricSampleInterval,
): MetricSample[] => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const step = interval === "hour" ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24;
  const values: Record<HealthMetricType, { unit: string; base: number; variance: number }> = {
    heartRate: { unit: "bpm", base: 112, variance: 24 },
    activeEnergyBurned: { unit: "kcal", base: 82, variance: 38 },
    stepCount: { unit: "count", base: 2400, variance: 900 },
    distance: { unit: "m", base: 1800, variance: 700 },
  };

  const metric = values[type];
  const samples: MetricSample[] = [];

  for (let cursor = start; cursor < end; cursor += step) {
    const index = samples.length;
    samples.push({
      type,
      startDate: new Date(cursor).toISOString(),
      endDate: new Date(Math.min(cursor + step, end)).toISOString(),
      value: Math.max(0, Math.round(metric.base + Math.sin(index + 1) * metric.variance)),
      unit: metric.unit,
    });
  }

  return samples;
};

const isNativeModuleUnavailable = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Cannot find native module|not been exported|Native module cannot be null/i.test(error.message);
};

export const healthKit = {
  async isHealthDataAvailable() {
    try {
      return await HealthKitNative.isHealthDataAvailable();
    } catch (error) {
      if (isNativeModuleUnavailable(error)) {
        return false;
      }
      throw error;
    }
  },

  async requestAuthorization() {
    try {
      return await HealthKitNative.requestAuthorization();
    } catch (error) {
      if (isNativeModuleUnavailable(error)) {
        return false;
      }
      throw error;
    }
  },

  async getWorkouts(startDate: Date, endDate: Date) {
    try {
      return await HealthKitNative.getWorkouts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } catch (error) {
      if (isNativeModuleUnavailable(error)) {
        return fallbackWorkouts;
      }
      throw error;
    }
  },

  async getMetricSamples(
    type: HealthMetricType,
    startDate: Date,
    endDate: Date,
    interval: MetricSampleInterval,
  ) {
    try {
      return await HealthKitNative.getMetricSamples({
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval,
      });
    } catch (error) {
      if (isNativeModuleUnavailable(error)) {
        return buildDemoSamples(type, startDate.toISOString(), endDate.toISOString(), interval);
      }
      throw error;
    }
  },
};
