import { requireNativeModule } from "expo";

import type {
  HealthMetricType,
  MetricSample,
  MetricSampleInterval,
  NativeWorkout,
} from "@/src/types/health";

type HealthKitNativeModule = {
  isHealthDataAvailable(): Promise<boolean>;
  requestAuthorization(): Promise<boolean>;
  getWorkouts(options: { startDate: string; endDate: string }): Promise<NativeWorkout[]>;
  getMetricSamples(options: {
    type: HealthMetricType;
    startDate: string;
    endDate: string;
    interval: MetricSampleInterval;
  }): Promise<MetricSample[]>;
};

const createUnavailableModule = (): HealthKitNativeModule => ({
  async isHealthDataAvailable() {
    return false;
  },
  async requestAuthorization() {
    return false;
  },
  async getWorkouts() {
    throw new Error("Cannot find native module HealthKit.");
  },
  async getMetricSamples() {
    throw new Error("Cannot find native module HealthKit.");
  },
});

let HealthKit: HealthKitNativeModule;

try {
  HealthKit = requireNativeModule<HealthKitNativeModule>("HealthKit");
} catch {
  HealthKit = createUnavailableModule();
}

export default HealthKit;
