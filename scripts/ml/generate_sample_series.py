#!/usr/bin/env python3
"""
Gerador de Série Sintética Realista de Exercício (Gymbeat)
Simula 10 repetições de supino/agachamento a 25 Hz para calibração e teste imediato do pipeline.
"""

import json
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "synthetic_session.json"


def generate_synthetic_session(
    reps: int = 10,
    rep_duration_sec: float = 2.5,
    rest_duration_sec: float = 3.0,
    fs: float = 25.0,
) -> dict:
    total_time = rest_duration_sec + (reps * rep_duration_sec) + rest_duration_sec
    n_samples = int(total_time * fs)
    t = np.linspace(0, total_time, n_samples)

    # Inicializar eixos com ruído e componente da gravidade
    # Suponha que o relógio está inclinado no pulso:
    # A aceleração da repetição ocorre na direção de um vetor v = [0.2, 0.9, 0.38] normalizado
    v_dir = np.array([0.2, 0.9, 0.38])
    v_dir = v_dir / np.linalg.norm(v_dir)

    ax = np.random.normal(0, 0.03, n_samples)
    ay = np.random.normal(0.98, 0.03, n_samples)  # Gravidade estática ~1g
    az = np.random.normal(-0.15, 0.03, n_samples)

    gx = np.random.normal(0, 0.05, n_samples)
    gy = np.random.normal(0, 0.05, n_samples)
    gz = np.random.normal(0, 0.05, n_samples)

    start_idx = int(rest_duration_sec * fs)
    samples_per_rep = int(rep_duration_sec * fs)

    for i in range(reps):
        rep_start = start_idx + i * samples_per_rep
        rep_end = rep_start + samples_per_rep
        t_cycle = np.linspace(0, 2 * np.pi, rep_end - rep_start)

        # Perfil inercial da repetição:
        # Fase excêntrica (descida): desaceleração negativa
        # Fase concêntrica (subida): aceleração positiva acentuada
        # Forma: -sin(t) com harmônicos
        acc_pattern = -1.2 * np.sin(t_cycle) + 0.3 * np.sin(2 * t_cycle)
        gyro_pattern = 0.8 * np.abs(np.cos(t_cycle))

        for offset, (a_val, g_val) in enumerate(zip(acc_pattern, gyro_pattern)):
            idx = rep_start + offset
            if idx < n_samples:
                ax[idx] += a_val * v_dir[0]
                ay[idx] += a_val * v_dir[1]
                az[idx] += a_val * v_dir[2]
                gx[idx] += g_val * 0.4
                gy[idx] += g_val * 0.7
                gz[idx] += g_val * 0.3

    samples = []
    base_timestamp = 1726240000000

    for idx in range(n_samples):
        ts_ms = base_timestamp + int(idx * (1000 / fs))
        samples.append({
            "timestamp": f"2026-09-13T12:00:{idx*0.04:05.2f}Z",
            "accelerationX": float(ax[idx]),
            "accelerationY": float(ay[idx]),
            "accelerationZ": float(az[idx]),
            "gyroscopeX": float(gx[idx]),
            "gyroscopeY": float(gy[idx]),
            "gyroscopeZ": float(gz[idx]),
            "heartRate": 125.0 + float(np.sin(idx / 50.0) * 10),
        })

    session = {
        "userId": "synthetic-user",
        "userName": "Voluntário Teste Sintético",
        "userEmail": "teste@gymbeat.app",
        "userAge": 24,
        "userSex": "homem",
        "userExperience": "intermediario",
        "sessionId": "synthetic-session-10reps",
        "exerciseId": "bench-press",
        "exerciseName": "Supino reto (Sintético - 10 Reps)",
        "startedAt": samples[0]["timestamp"],
        "endedAt": samples[-1]["timestamp"],
        "setCount": 1,
        "reps": reps,
        "sampleCount": len(samples),
        "samples": samples,
        "source": "synthetic_generator",
    }

    return session


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    session = generate_synthetic_session(reps=10)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump([session], f, indent=2, ensure_ascii=False)

    print(f"[+] Série sintética de 10 repetições gerada com sucesso!")
    print(f"[+] Total de amostras: {session['sampleCount']} ({session['sampleCount']/25.0:.1f}s)")
    print(f"[+] Arquivo salvo em: {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
