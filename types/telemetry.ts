// GymBeat — React Native
// types/telemetry.ts
// Interfaces TypeScript espelhando os modelos Swift do watchOS.
// Fonte única de verdade para os tipos de dados trafegados no sistema.

// MARK: - Motion Data

export interface MotionData {
  ax: number; // Aceleração X (m/s²)
  ay: number; // Aceleração Y (m/s²)
  az: number; // Aceleração Z (m/s²)
  gx: number; // Giroscópio X (rad/s)
  gy: number; // Giroscópio Y (rad/s)
  gz: number; // Giroscópio Z (rad/s)
}

// MARK: - Telemetry Sample

export interface TelemetrySample {
  t: number;           // Timestamp Unix ms
  hr?: number;         // Heart rate (bpm)
  o2?: number;         // SpO2 (%)
  motion?: MotionData; // Dados inerciais (apenas exercícios alvo)
}

// MARK: - Exercise

export type ExerciseID =
  | 'supino_reto'
  | 'supino_inclinado'
  | 'rosca_biceps'
  | 'elevacao_lateral'
  | 'abdominal';

export interface Exercise {
  id: ExerciseID;
  displayName: string;
  requiresMotionTracking: boolean;
  icon: string;
}

// MARK: - Session

export type SessionMode = 'full' | 'physiological_only';

export interface WorkoutSession {
  sessionID: string;
  exerciseID: ExerciseID;
  startedAt: number;   // Unix ms
  endedAt?: number;    // Unix ms
  samples: TelemetrySample[];
  userId?: string;
}

// MARK: - WatchConnectivity Message Types

export type WCCommand =
  | 'START_SESSION'
  | 'STOP_SESSION'
  | 'UPDATE_CONTEXT'
  | 'TIME_HANDSHAKE'
  | 'HEARTBEAT';

export interface WCStartPayload {
  command: 'START_SESSION';
  sessionID: string;
  exerciseID: ExerciseID;
  mode: SessionMode;
  systemTime: number;
}

export interface WCStopPayload {
  command: 'STOP_SESSION';
}

export interface WCUpdateContextPayload {
  command: 'UPDATE_CONTEXT';
  exerciseID: ExerciseID;
  mode: SessionMode;
}

export interface WCHeartbeatPayload {
  command: 'HEARTBEAT';
  heartRate?: number;
}

export interface WCBatchPayload {
  command: 'STOP_SESSION';
  sessionID: string;
  samples: string; // JSON stringificado de TelemetrySample[]
}
