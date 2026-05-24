import { requireNativeModule } from "expo";
import type { EventSubscription } from "expo-modules-core";

export type WatchActivationState = "activated" | "inactive" | "notActivated" | "unsupported" | "unknown";

export type WatchConnectivityStatus = {
  isSupported: boolean;
  activationState: WatchActivationState;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
  isReachable: boolean;
};

export type WatchCommand =
  | "appHeartbeat"
  | "startSession"
  | "pauseSession"
  | "resumeSession"
  | "stopSession"
  | "startSet"
  | "stopSet";

export type LiveMetricSample = {
  messageType: "metricSample";
  sessionId: string;
  setId: string;
  timestamp: string;
  heartRate: number;
  activeEnergyBurned: number;
  distance: number;
  stepCount: number;
};

export type WatchStateMessage = {
  messageType: "stateChanged";
  state: "waiting" | "collecting" | "paused" | "disconnected";
  sessionId?: string;
  setId?: string;
};

export type WatchErrorMessage = {
  messageType: "error";
  message: string;
};

export type WatchIncomingMessage = LiveMetricSample | WatchStateMessage | WatchErrorMessage | Record<string, unknown>;

type WatchCommandPayload = {
  sessionId?: string;
  exerciseId?: string;
  exerciseName?: string;
  setId?: string;
  setIndex?: number;
};

type SendCommandResult = {
  delivered: boolean;
  queued: boolean;
  reply?: {
    companionAppConnected?: boolean;
    state?: WatchStateMessage["state"];
    message?: string;
  } & Record<string, unknown>;
  status: WatchConnectivityStatus;
};

type WatchConnectivityNativeModule = {
  isSupported(): Promise<boolean>;
  getStatus(): Promise<WatchConnectivityStatus>;
  sendCommand(command: WatchCommand, payload: WatchCommandPayload): Promise<SendCommandResult>;
  addListener(eventName: "onWatchConnectivityChange", listener: (event: WatchConnectivityStatus) => void): EventSubscription;
  addListener(eventName: "onWatchMessage", listener: (event: WatchIncomingMessage) => void): EventSubscription;
};

const unavailableStatus: WatchConnectivityStatus = {
  isSupported: false,
  activationState: "unsupported",
  isPaired: false,
  isWatchAppInstalled: false,
  isReachable: false,
};

const createUnavailableModule = (): WatchConnectivityNativeModule => ({
  async isSupported() {
    return false;
  },
  async getStatus() {
    return unavailableStatus;
  },
  async sendCommand() {
    throw new Error("Cannot find native module WearableWatchConnectivity.");
  },
  addListener() {
    return { remove() {} };
  },
});

let WatchConnectivity: WatchConnectivityNativeModule;

try {
  WatchConnectivity = requireNativeModule<WatchConnectivityNativeModule>("WearableWatchConnectivity");
} catch {
  WatchConnectivity = createUnavailableModule();
}

export default WatchConnectivity;
