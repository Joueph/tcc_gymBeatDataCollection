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
