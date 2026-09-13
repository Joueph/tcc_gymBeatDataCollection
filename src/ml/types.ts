/**
 * Tipos de Dados do Módulo de Processamento Inercial e ML (Gymbeat)
 */

export type InertialSampleInput = {
  timestamp?: string;
  accelerationX?: number | null;
  accelerationY?: number | null;
  accelerationZ?: number | null;
  gyroscopeX?: number | null;
  gyroscopeY?: number | null;
  gyroscopeZ?: number | null;
  heartRate?: number | null;
  activeEnergyBurned?: number | null;
  oxygenSaturation?: number | null;
};

export type RepetitionPeak = {
  peakIndex: number;
  timeSeconds: number;
  peakValue: number;
};

export type ProcessedSeriesResult = {
  fs: number;
  durationSeconds: number;
  sampleCount: number;
  filtMagAcc: number[];
  filtPcaAcc: number[];
  filtGyro: number[];
  synthesizedSignal: number[];
  principalAxis: [number, number, number];
  detectedReps: RepetitionPeak[];
  repCount: number;
};
