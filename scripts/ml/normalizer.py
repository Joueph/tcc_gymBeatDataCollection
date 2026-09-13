#!/usr/bin/env python3
"""
Módulo de Normalização, Compensação e Síntese de Sinais Inerciais (Gymbeat)
Processa qualquer bloco de exercício de forma totalmente dinâmica (sem hardcoding).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

try:
    from scipy.signal import butter, filtfilt, find_peaks
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


def estimate_sampling_rate(
    samples: List[Dict[str, Any]],
    started_at: Optional[str] = None,
    ended_at: Optional[str] = None,
) -> float:
    """Calcula a taxa de amostragem efetiva (Hz) baseada na duração real da série."""
    n = len(samples)
    if n < 2:
        return 25.0

    # 1. Tentar started_at e ended_at do bloco
    if started_at and ended_at:
        try:
            t0 = datetime.fromisoformat(started_at.replace("Z", "+00:00")).timestamp()
            t1 = datetime.fromisoformat(ended_at.replace("Z", "+00:00")).timestamp()
            dt = t1 - t0
            if dt > 0.5:
                return float(n / dt)
        except Exception:
            pass

    # 2. Tentar timestamps das amostras
    try:
        t0_str = samples[0].get("timestamp", "")
        t1_str = samples[-1].get("timestamp", "")
        t0 = datetime.fromisoformat(t0_str.replace("Z", "+00:00")).timestamp()
        t1 = datetime.fromisoformat(t1_str.replace("Z", "+00:00")).timestamp()
        dt = t1 - t0
        if dt > 0.5:
            return float(n / dt)
    except Exception:
        pass

    return 25.0


def extract_sensor_arrays(samples: List[Dict[str, Any]]) -> Dict[str, np.ndarray]:
    """Extrai matrizes numpy a partir da lista de amostras."""
    timestamps = [s.get("timestamp", "") for s in samples]

    def get_axis(key: str) -> np.ndarray:
        return np.array([float(s.get(key) if s.get(key) is not None else 0.0) for s in samples], dtype=np.float64)

    return {
        "timestamps": np.array(timestamps),
        "ax": get_axis("accelerationX"),
        "ay": get_axis("accelerationY"),
        "az": get_axis("accelerationZ"),
        "gx": get_axis("gyroscopeX"),
        "gy": get_axis("gyroscopeY"),
        "gz": get_axis("gyroscopeZ"),
    }


def compute_euclidean_magnitude(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
    """Calcula a norma euclidiana invariante à rotação: sqrt(x^2 + y^2 + z^2)."""
    return np.sqrt(x**2 + y**2 + z**2)


def compute_pca_1d(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Projeta o vetor 3D no primeiro componente principal (PC1).
    Captura a direção espacial de maior variação do exercício preservando o sentido concêntrico (+) e excêntrico (-).
    """
    if len(x) < 3:
        return np.zeros_like(x), np.zeros(3)

    data = np.column_stack((x, y, z))
    mean = np.mean(data, axis=0)
    centered = data - mean

    # SVD
    u, s, vt = np.linalg.svd(centered, full_matrices=False)
    v1 = vt[0]

    projected = np.dot(centered, v1)

    # Inverter sinal se assimetria for negativa para manter concêntrico positivo
    std = np.std(projected)
    if std > 1e-9:
        skewness = np.mean((projected - np.mean(projected))**3) / (std**3)
        if skewness < 0:
            projected = -projected
            v1 = -v1

    return projected, v1


def apply_lowpass_filter(signal: np.ndarray, fs: float, fc: float = 1.2) -> np.ndarray:
    """
    Aplica filtro passa-baixa digital adaptativo.
    Se scipy estiver disponível, utiliza filtfilt (zero phase delay).
    Caso contrário, utiliza implementação biquad IIR em loop.
    """
    if len(signal) < 5:
        return signal.copy()

    # Garantir que a frequência de corte esteja dentro dos limites de Nyquist (fc < fs/2)
    safe_fc = min(fc, fs * 0.40)
    if safe_fc <= 0.1:
        safe_fc = 0.5

    if HAS_SCIPY:
        b, a = butter(2, safe_fc / (fs / 2.0), btype="low")
        return filtfilt(b, a, signal)

    # Fallback IIR
    w0 = 2 * np.pi * safe_fc / fs
    alpha = np.sin(w0) / (2.0 * np.sqrt(2.0))
    b0 = (1 - np.cos(w0)) / 2
    b1 = 1 - np.cos(w0)
    b2 = (1 - np.cos(w0)) / 2
    a0 = 1 + alpha
    a1 = -2 * np.cos(w0)
    a2 = 1 - alpha

    b0 /= a0
    b1 /= a0
    b2 /= a0
    a1 /= a0
    a2 /= a0

    out = np.zeros_like(signal)
    prev_raw = signal[0]
    prev_prev_raw = signal[0]
    prev_filt = signal[0]
    prev_prev_filt = signal[0]

    for i in range(len(signal)):
        curr_raw = signal[i]
        curr_filt = b0 * curr_raw + b1 * prev_raw + b2 * prev_prev_raw - a1 * prev_filt - a2 * prev_prev_filt
        out[i] = curr_filt

        prev_prev_raw = prev_raw
        prev_raw = curr_raw
        prev_prev_filt = prev_filt
        prev_filt = curr_filt

    return out


def detect_peaks_and_reps(
    signal: np.ndarray,
    fs: float,
    min_interval_sec: float = 1.6,
    min_prominence_factor: float = 0.30,
    min_height: float = 0.20,
) -> List[Dict[str, Any]]:
    """
    Detecta repetições sobre o sinal 1D sintetizado.
    Descarta ondulações excêntricas negativas exigindo amplitude mínima (min_height)
    e janela refratária fisiológica mínima entre repetições (min_interval_sec).
    """
    if len(signal) < 5:
        return []

    min_dist_samples = max(1, int(min_interval_sec * fs))
    std_val = float(np.std(signal))
    prominence = max(0.10, std_val * min_prominence_factor)

    if HAS_SCIPY:
        peaks, _ = find_peaks(
            signal,
            distance=min_dist_samples,
            prominence=prominence,
            height=min_height,
        )
        return [
            {
                "peakIndex": int(p),
                "peakValue": float(signal[p]),
                "timeSeconds": float(p / fs),
            }
            for p in peaks
        ]

    # Detecção manual robusta
    mean_val = np.mean(signal)
    threshold = max(min_height, mean_val + prominence)
    reps = []
    last_idx = -min_dist_samples

    for i in range(2, len(signal) - 1):
        if signal[i] > signal[i - 1] and signal[i] >= signal[i + 1]:
            if signal[i] >= threshold and (i - last_idx) >= min_dist_samples:
                reps.append({
                    "peakIndex": int(i),
                    "peakValue": float(signal[i]),
                    "timeSeconds": float(i / fs),
                })
                last_idx = i

    return reps


def process_session_block(session_block: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processa um bloco completo de sessão de forma totalmente dinâmica.
    Extrai as informações sem qualquer hardcoding de exercício.
    """
    samples = session_block.get("samples", [])
    if not samples:
        return {"error": "Sessão sem amostras"}

    fs = estimate_sampling_rate(
        samples,
        started_at=session_block.get("startedAt"),
        ended_at=session_block.get("endedAt"),
    )

    data = extract_sensor_arrays(samples)
    n_points = len(data["ax"])

    if n_points < 3:
        return {"error": "Número insuficiente de amostras"}

    # 1. Magnitude Euclidiana
    mag_acc = compute_euclidean_magnitude(data["ax"], data["ay"], data["az"])
    mag_gyro = compute_euclidean_magnitude(data["gx"], data["gy"], data["gz"])

    # 2. Projeção PCA 1D no eixo principal
    pca_acc, principal_axis = compute_pca_1d(data["ax"], data["ay"], data["az"])

    # 3. Filtragem Passa-Baixa adaptativa
    filt_mag_acc = apply_lowpass_filter(mag_acc, fs=fs, fc=1.2)
    filt_pca_acc = apply_lowpass_filter(pca_acc, fs=fs, fc=1.2)
    filt_gyro = apply_lowpass_filter(mag_gyro, fs=fs, fc=1.2)

    # 4. Sinal de Repetição Sintetizado Gymbeat (PCA + Envelope do Giroscópio)
    std_pca = np.std(filt_pca_acc) + 1e-6
    std_gyro = np.std(filt_gyro) + 1e-6
    norm_pca = (filt_pca_acc - np.mean(filt_pca_acc)) / std_pca
    norm_gyro = (filt_gyro - np.mean(filt_gyro)) / std_gyro
    synthesized_signal = 0.80 * norm_pca + 0.20 * np.maximum(0, norm_gyro)

    # 5. Detecção de Repetições
    detected_reps = detect_peaks_and_reps(synthesized_signal, fs=fs)

    return {
        "fs": fs,
        "sampleCount": n_points,
        "durationSeconds": float(n_points / fs),
        "data": data,
        "magAcc": mag_acc,
        "magGyro": mag_gyro,
        "pcaAcc": pca_acc,
        "principalAxis": principal_axis.tolist(),
        "filtMagAcc": filt_mag_acc,
        "filtPcaAcc": filt_pca_acc,
        "filtGyro": filt_gyro,
        "synthesizedSignal": synthesized_signal,
        "detectedReps": detected_reps,
    }
