/**
 * Motor de Processamento Inercial e Detecção de Repetições (Gymbeat ML)
 * Síntese dimensional 6D -> 1D e validação biomecânica de repetições.
 */

import { applyButterworthLowpass } from "./digital-filter";
import { computeMagnitude, computePCA1D, mean, std } from "./math-utils";
import type { InertialSampleInput, ProcessedSeriesResult, RepetitionPeak } from "./types";

/**
 * Estima a taxa de amostragem efetiva (Hz) da série com base nos timestamps.
 */
export function estimateSamplingRate(
  samples: InertialSampleInput[],
  startedAt?: string,
  endedAt?: string
): number {
  const n = samples.length;
  if (n < 2) return 25.0;

  // 1. Tentar startedAt e endedAt
  if (startedAt && endedAt) {
    const t0 = new Date(startedAt).getTime() / 1000;
    const t1 = new Date(endedAt).getTime() / 1000;
    const dt = t1 - t0;
    if (dt > 0.5) {
      return n / dt;
    }
  }

  // 2. Tentar timestamps das amostras
  const firstTs = samples[0]?.timestamp;
  const lastTs = samples[n - 1]?.timestamp;
  if (firstTs && lastTs) {
    const t0 = new Date(firstTs).getTime() / 1000;
    const t1 = new Date(lastTs).getTime() / 1000;
    const dt = t1 - t0;
    if (dt > 0.5) {
      return n / dt;
    }
  }

  return 25.0;
}

/**
 * Detecta picos de repetição no sinal sintetizado 1D aplicando restrições biomecânicas:
 * 1. Janela refratária fisiológica mínima (1.6s).
 * 2. Amplitude mínima positiva (descarta vales excêntricos negativos).
 * 3. Proeminência em relação às inflexões vizinhas.
 */
export function detectPeaksAndReps(
  signal: number[],
  fs: number,
  minIntervalSec = 1.6,
  minProminenceFactor = 0.30,
  minHeight = 0.20
): RepetitionPeak[] {
  const n = signal.length;
  if (n < 5) return [];

  const minDistSamples = Math.max(1, Math.floor(minIntervalSec * fs));
  const signalStd = std(signal);
  const minProminence = Math.max(0.10, signalStd * minProminenceFactor);

  // 1. Encontrar todos os picos candidatos (máximos locais)
  type Candidate = { index: number; value: number };
  const candidates: Candidate[] = [];

  for (let i = 1; i < n - 1; i++) {
    const val = signal[i];
    if (val >= minHeight && val > signal[i - 1] && val >= signal[i + 1]) {
      candidates.push({ index: i, value: val });
    }
  }

  if (candidates.length === 0) return [];

  // 2. Avaliar proeminência e filtrar com janela refratária
  const validatedPeaks: RepetitionPeak[] = [];
  let lastPeakIndex = -minDistSamples;

  for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
    const { index: i, value: val } = candidates[cIdx];

    // Verificar se respeita o intervalo mínimo em relação ao último pico aceito
    if (i - lastPeakIndex < minDistSamples) {
      // Se este pico for maior que o anterior e estiver muito próximo, substitui se aplicável
      if (
        validatedPeaks.length > 0 &&
        val > validatedPeaks[validatedPeaks.length - 1].peakValue
      ) {
        validatedPeaks[validatedPeaks.length - 1] = {
          peakIndex: i,
          timeSeconds: i / fs,
          peakValue: val,
        };
        lastPeakIndex = i;
      }
      continue;
    }

    // Calcular proeminência à esquerda (vale mínimo até o pico anterior ou início)
    let leftMin = val;
    const scanLeftStart = Math.max(0, lastPeakIndex >= 0 ? lastPeakIndex : 0);
    for (let l = i - 1; l >= scanLeftStart; l--) {
      if (signal[l] < leftMin) leftMin = signal[l];
    }

    // Calcular proeminência à direita (vale mínimo até o próximo candidato ou fim)
    let rightMin = val;
    const scanRightEnd = Math.min(n - 1, i + minDistSamples);
    for (let r = i + 1; r <= scanRightEnd; r++) {
      if (signal[r] < rightMin) rightMin = signal[r];
    }

    const prominence = val - Math.max(leftMin, rightMin);

    if (prominence >= minProminence) {
      validatedPeaks.push({
        peakIndex: i,
        timeSeconds: i / fs,
        peakValue: val,
      });
      lastPeakIndex = i;
    }
  }

  return validatedPeaks;
}

/**
 * Processa um conjunto de amostras inerciais de uma série, sintetizando os 6 canais em 1D
 * e detectando as repetições realizadas.
 */
export function processSessionSamples(
  samples: InertialSampleInput[],
  startedAt?: string,
  endedAt?: string
): ProcessedSeriesResult | null {
  const n = samples.length;
  if (n < 3) return null;

  const fs = estimateSamplingRate(samples, startedAt, endedAt);
  const durationSeconds = n / fs;

  const ax = new Array(n);
  const ay = new Array(n);
  const az = new Array(n);
  const gx = new Array(n);
  const gy = new Array(n);
  const gz = new Array(n);

  for (let i = 0; i < n; i++) {
    const s = samples[i];
    ax[i] = s.accelerationX ?? 0;
    ay[i] = s.accelerationY ?? 0;
    az[i] = s.accelerationZ ?? 0;
    gx[i] = s.gyroscopeX ?? 0;
    gy[i] = s.gyroscopeY ?? 0;
    gz[i] = s.gyroscopeZ ?? 0;
  }

  // 1. Magnitude Euclidiana
  const magAcc = computeMagnitude(ax, ay, az);
  const magGyro = computeMagnitude(gx, gy, gz);

  // 2. Projeção PCA 1D (Eixo de maior variância)
  const { projected: pcaAcc, principalAxis } = computePCA1D(ax, ay, az);

  // 3. Filtragem Passa-Baixa Digital Adaptativa
  const filtMagAcc = applyButterworthLowpass(magAcc, fs, 1.2);
  const filtPcaAcc = applyButterworthLowpass(pcaAcc, fs, 1.2);
  const filtGyro = applyButterworthLowpass(magGyro, fs, 1.2);

  // 4. Sinal de Repetição Sintetizado Gymbeat (80% PCA + 20% Envelope de Giroscópio)
  const stdPca = std(filtPcaAcc) + 1e-6;
  const meanPca = mean(filtPcaAcc);
  const stdGyro = std(filtGyro) + 1e-6;
  const meanGyro = mean(filtGyro);

  const synthesized = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const normPca = (filtPcaAcc[i] - meanPca) / stdPca;
    const normGyro = (filtGyro[i] - meanGyro) / stdGyro;
    synthesized[i] = 0.80 * normPca + 0.20 * Math.max(0, normGyro);
  }
  const synthesizedSignal = Array.from(synthesized);

  // 5. Detecção de Repetições
  const detectedReps = detectPeaksAndReps(synthesizedSignal, fs, 1.6, 0.30, 0.20);

  return {
    fs,
    durationSeconds,
    sampleCount: n,
    filtMagAcc,
    filtPcaAcc,
    filtGyro,
    synthesizedSignal,
    principalAxis,
    detectedReps,
    repCount: detectedReps.length,
  };
}
