/**
 * Motor de Detecção de Repetições em Tempo Real / Streaming (Gymbeat ML)
 * Processa amostras inerciais continuamente à medida que chegam via Bluetooth,
 * utilizando buffer deslizante O(1), filtro causal IIR e Moving PCA.
 */

import { CircularBuffer } from "./circular-buffer";
import { CausalBiquadFilter } from "./digital-filter";
import { computePCA1D, mean, std } from "./math-utils";
import type { InertialSampleInput } from "./types";

export type StreamingRepetitionEvent = {
  isRepetition: boolean;
  currentReps: number;
  peakSampleIndex: number;
  signalValue: number;
};

export class StreamingRepetitionCounter {
  private sampleBuffer: CircularBuffer<InertialSampleInput>;
  private signalBuffer: CircularBuffer<number>;
  private filterPca: CausalBiquadFilter;

  private fs: number;
  private currentReps = 0;
  private sampleCount = 0;
  private lastPeakSampleIndex = -100;
  private principalAxis: [number, number, number] = [0, 1, 0];

  // Restrições Biomecânicas
  private readonly minIntervalSec = 1.6; // Janela refratária fisiológica mínima
  private readonly minPeakHeight = 0.25;  // Limiar de amplitude positiva mínima

  constructor(fs = 4.4, bufferSize = 35) {
    this.fs = fs;
    this.sampleBuffer = new CircularBuffer<InertialSampleInput>(bufferSize);
    this.signalBuffer = new CircularBuffer<number>(bufferSize);
    this.filterPca = new CausalBiquadFilter(fs, 1.2);
  }

  /**
   * Reinicializa o motor para uma nova série de exercícios.
   */
  public reset(): void {
    this.sampleBuffer.clear();
    this.signalBuffer.clear();
    this.filterPca.reset();

    this.currentReps = 0;
    this.sampleCount = 0;
    this.lastPeakSampleIndex = -100;
    this.principalAxis = [0, 1, 0];
  }

  /**
   * Configura a taxa de amostragem estimada.
   */
  public setSamplingRate(newFs: number): void {
    if (newFs > 0.5 && Math.abs(newFs - this.fs) > 0.5) {
      this.fs = newFs;
      this.filterPca.configure(newFs, 1.2);
    }
  }

  /**
   * Processa uma nova amostra inercial recebida em streaming.
   * Retorna um evento indicando se uma repetição foi completada nesta amostra.
   */
  public pushSample(sample: InertialSampleInput): StreamingRepetitionEvent {
    const currentIndex = this.sampleCount;
    this.sampleCount++;
    this.sampleBuffer.push(sample);

    const ax = sample.accelerationX ?? 0;
    const ay = sample.accelerationY ?? 0;
    const az = sample.accelerationZ ?? 0;

    // 1. Moving PCA: atualiza a direção do movimento sobre a janela móvel
    const recentSamples = this.sampleBuffer.toArray();
    if (recentSamples.length >= 8) {
      const winAx = recentSamples.map((s) => s.accelerationX ?? 0);
      const winAy = recentSamples.map((s) => s.accelerationY ?? 0);
      const winAz = recentSamples.map((s) => s.accelerationZ ?? 0);

      const pcaResult = computePCA1D(winAx, winAy, winAz);
      this.principalAxis = pcaResult.principalAxis;
    }

    // 2. Projeção instantânea no eixo principal
    const valPca =
      ax * this.principalAxis[0] +
      ay * this.principalAxis[1] +
      az * this.principalAxis[2];

    // 3. Filtragem Causal IIR em Streaming (< 0.05ms)
    const filtPca = this.filterPca.step(valPca);
    this.signalBuffer.push(filtPca);

    // 4. Normalização com Média e Desvio Padrão da Janela Deslizante
    const sigs = this.signalBuffer.toArray();
    let normVal = 0;
    let repConfirmed = false;

    // Exigir pelo menos 8 amostras para aquecimento da janela estatística (~1.8s)
    if (this.sampleCount >= 8 && sigs.length >= 8) {
      const m = mean(sigs);
      const sd = std(sigs) + 1e-6;
      normVal = (filtPca - m) / sd;

      // 5. Detecção de Pico Local (avaliando crista no instante anterior currentIndex - 1)
      const s0 = (sigs[sigs.length - 3] - m) / sd;
      const s1 = (sigs[sigs.length - 2] - m) / sd;
      const s2 = normVal;

      // Crista local: s1 > s0 e s1 >= s2, com amplitude mínima
      if (s1 > s0 && s1 >= s2 && s1 >= this.minPeakHeight) {
        const peakIdx = currentIndex - 1;
        const minDistSamples = Math.floor(this.minIntervalSec * this.fs);

        // Verificar janela refratária fisiológica
        if (peakIdx - this.lastPeakSampleIndex >= minDistSamples) {
          this.currentReps++;
          this.lastPeakSampleIndex = peakIdx;
          repConfirmed = true;
        }
      }
    }

    return {
      isRepetition: repConfirmed,
      currentReps: this.currentReps,
      peakSampleIndex: this.lastPeakSampleIndex,
      signalValue: normVal,
    };
  }

  public getRepCount(): number {
    return this.currentReps;
  }

  public getRecentSignal(): number[] {
    return this.signalBuffer.toArray();
  }
}
