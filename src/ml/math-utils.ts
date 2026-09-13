/**
 * Funções Matemáticas e Álgebra Linear Leve (Gymbeat ML)
 * Otimizado para arrays inerciais sem dependências externas (< 1ms).
 */

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / arr.length);
}

export function computeMagnitude(x: number[], y: number[], z: number[]): number[] {
  const n = x.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const xi = x[i] || 0;
    const yi = y[i] || 0;
    const zi = z[i] || 0;
    out[i] = Math.sqrt(xi * xi + yi * yi + zi * zi);
  }
  return Array.from(out);
}

/**
 * Projeção no Primeiro Componente Principal (PCA 1D - PC1).
 * Calcula a matriz de covariância 3x3 dos sinais e extrai o autovetor dominante via Power Iteration.
 * Alinha o sinal com assimetria positiva para preservar a fase concêntrica (+).
 */
export function computePCA1D(
  x: number[],
  y: number[],
  z: number[]
): { projected: number[]; principalAxis: [number, number, number] } {
  const n = x.length;
  if (n < 3) {
    return {
      projected: new Array(n).fill(0),
      principalAxis: [1, 0, 0],
    };
  }

  const mx = mean(x);
  const my = mean(y);
  const mz = mean(z);

  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  const cz = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    cx[i] = x[i] - mx;
    cy[i] = y[i] - my;
    cz[i] = z[i] - mz;
  }

  // Matriz de Covariância 3x3
  let c00 = 0, c01 = 0, c02 = 0;
  let c11 = 0, c12 = 0;
  let c22 = 0;

  for (let i = 0; i < n; i++) {
    const xi = cx[i];
    const yi = cy[i];
    const zi = cz[i];
    c00 += xi * xi;
    c01 += xi * yi;
    c02 += xi * zi;
    c11 += yi * yi;
    c12 += yi * zi;
    c22 += zi * zi;
  }

  c00 /= n; c01 /= n; c02 /= n;
  c11 /= n; c12 /= n;
  c22 /= n;

  const c10 = c01;
  const c20 = c02;
  const c21 = c12;

  // Power Iteration para obter o maior autovetor (v1)
  let vx = 0.577350269; // 1 / sqrt(3)
  let vy = 0.577350269;
  let vz = 0.577350269;

  for (let iter = 0; iter < 25; iter++) {
    const wx = c00 * vx + c01 * vy + c02 * vz;
    const wy = c10 * vx + c11 * vy + c12 * vz;
    const wz = c20 * vx + c21 * vy + c22 * vz;

    const norm = Math.sqrt(wx * wx + wy * wy + wz * wz);
    if (norm < 1e-12) break;

    vx = wx / norm;
    vy = wy / norm;
    vz = wz / norm;
  }

  // Projeção dos dados em v1
  const projected = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    projected[i] = cx[i] * vx + cy[i] * vy + cz[i] * vz;
  }

  // Cálculo de Skewness (assimetria) para manter a fase concêntrica positiva
  const pArr = Array.from(projected);
  const pMean = mean(pArr);
  const pStd = std(pArr);

  if (pStd > 1e-9) {
    let sumCube = 0;
    for (let i = 0; i < n; i++) {
      const diff = pArr[i] - pMean;
      sumCube += diff * diff * diff;
    }
    const skewness = (sumCube / n) / (pStd * pStd * pStd);

    // Se assimetria for negativa, inverte o sinal
    if (skewness < 0) {
      for (let i = 0; i < n; i++) {
        pArr[i] = -pArr[i];
      }
      vx = -vx;
      vy = -vy;
      vz = -vz;
    }
  }

  return {
    projected: pArr,
    principalAxis: [vx, vy, vz],
  };
}
