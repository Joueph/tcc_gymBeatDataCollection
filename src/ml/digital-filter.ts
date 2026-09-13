/**
 * Filtro Digital Passa-Baixa Butterworth Zero-Phase (Gymbeat ML)
 * Implementação exata em equações de diferenças com passagem bidirecional (filtfilt)
 * para eliminar qualquer atraso de fase no sinal inercial.
 */

function runBiquadFilter(
  input: number[],
  b0: number,
  b1: number,
  b2: number,
  a1: number,
  a2: number
): number[] {
  const n = input.length;
  const out = new Float64Array(n);
  let prevRaw = input[0] || 0;
  let prevPrevRaw = input[0] || 0;
  let prevFilt = input[0] || 0;
  let prevPrevFilt = input[0] || 0;

  for (let i = 0; i < n; i++) {
    const currRaw = input[i];
    const currFilt =
      b0 * currRaw +
      b1 * prevRaw +
      b2 * prevPrevRaw -
      a1 * prevFilt -
      a2 * prevPrevFilt;

    out[i] = currFilt;
    prevPrevRaw = prevRaw;
    prevRaw = currRaw;
    prevPrevFilt = prevFilt;
    prevFilt = currFilt;
  }

  return Array.from(out);
}

/**
 * Aplica filtro passa-baixa Butterworth de 2ª ordem adaptativo com zero-phase (filtfilt).
 * @param signal Array de entrada (1D)
 * @param fs Taxa de amostragem em Hz
 * @param fc Frequência de corte (padrão 1.2 Hz)
 */
export function applyButterworthLowpass(
  signal: number[],
  fs: number,
  fc = 1.2
): number[] {
  const n = signal.length;
  if (n < 5) {
    return [...signal];
  }

  // Garantir que a frequência de corte respeite Nyquist (fc < fs/2)
  const safeFc = Math.max(0.2, Math.min(fc, fs * 0.40));

  // Coeficientes do filtro Butterworth de 2ª ordem
  const w0 = (2 * Math.PI * safeFc) / fs;
  const alpha = Math.sin(w0) / (2.0 * Math.SQRT2);
  let b0 = (1 - Math.cos(w0)) / 2;
  let b1 = 1 - Math.cos(w0);
  let b2 = (1 - Math.cos(w0)) / 2;
  const a0 = 1 + alpha;
  let a1 = -2 * Math.cos(w0);
  let a2 = 1 - alpha;

  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  a1 /= a0;
  a2 /= a0;

  // Passagem direta (Forward)
  const forward = runBiquadFilter(signal, b0, b1, b2, a1, a2);

  // Inversão para passagem reversa (Backward) -> anula o atraso de fase
  forward.reverse();
  const backward = runBiquadFilter(forward, b0, b1, b2, a1, a2);
  backward.reverse();

  return backward;
}

/**
 * Filtro Causal Passo-a-Passo (IIR Biquad) para inferência streaming em tempo real.
 * Mantém memória de estado entre chamadas sucessivas de amostras sem latência perceptível (~120ms).
 */
export class CausalBiquadFilter {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  private prevRaw = 0;
  private prevPrevRaw = 0;
  private prevFilt = 0;
  private prevPrevFilt = 0;
  private initialized = false;

  constructor(fs = 4.4, fc = 1.2) {
    this.configure(fs, fc);
  }

  public configure(fs: number, fc = 1.2): void {
    const safeFc = Math.max(0.2, Math.min(fc, fs * 0.40));
    const w0 = (2 * Math.PI * safeFc) / fs;
    const alpha = Math.sin(w0) / (2.0 * Math.SQRT2);
    let b0 = (1 - Math.cos(w0)) / 2;
    let b1 = 1 - Math.cos(w0);
    let b2 = (1 - Math.cos(w0)) / 2;
    const a0 = 1 + alpha;
    let a1 = -2 * Math.cos(w0);
    let a2 = 1 - alpha;

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  /**
   * Processa uma única amostra escalar em O(1).
   */
  public step(val: number): number {
    if (!this.initialized) {
      this.prevRaw = val;
      this.prevPrevRaw = val;
      this.prevFilt = val;
      this.prevPrevFilt = val;
      this.initialized = true;
      return val;
    }

    const filtered =
      this.b0 * val +
      this.b1 * this.prevRaw +
      this.b2 * this.prevPrevRaw -
      this.a1 * this.prevFilt -
      this.a2 * this.prevPrevFilt;

    this.prevPrevRaw = this.prevRaw;
    this.prevRaw = val;
    this.prevPrevFilt = this.prevFilt;
    this.prevFilt = filtered;

    return filtered;
  }

  public reset(): void {
    this.prevRaw = 0;
    this.prevPrevRaw = 0;
    this.prevFilt = 0;
    this.prevPrevFilt = 0;
    this.initialized = false;
  }
}
