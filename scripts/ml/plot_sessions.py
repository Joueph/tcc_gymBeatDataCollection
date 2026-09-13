#!/usr/bin/env python3
"""
Plotador de Séries e Detecção de Repetições (Gymbeat)
Gera gráficos e relatórios dinamicamente para CADA BLOCO de sessão em dataset.json,
sem nenhum exercício hardwired nos snippets.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import numpy as np

from normalizer import process_session_block

OUTPUT_BASE = Path(__file__).resolve().parent / "output"
USERDATA_DIR = OUTPUT_BASE / "userdata"
SAMPLE_DIR = OUTPUT_BASE / "sample"
DEFAULT_INPUT = USERDATA_DIR / "dataset.json"


def plot_single_block(block: Dict[str, Any], processed: Dict[str, Any], output_path: Path) -> None:
    """Gera o gráfico de 3 painéis para um bloco de sessão individual."""
    fs = processed.get("fs", 25.0)
    samples = block.get("samples", [])
    data = processed["data"]
    t = np.arange(len(samples)) / fs

    exercise_name = block.get("exerciseName", block.get("exerciseId", "Exercício"))
    user_name = block.get("userName", "Voluntário")
    user_sex = block.get("userSex", "N/D")
    user_age = block.get("userAge", "N/D")
    user_exp = block.get("userExperience", "N/D")
    real_reps = block.get("reps", 0)
    detected_reps = processed.get("detectedReps", [])
    num_detected = len(detected_reps)

    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    fig.patch.set_facecolor("#121418")

    for ax in axes:
        ax.set_facecolor("#1A1D24")
        ax.grid(True, linestyle="--", alpha=0.3, color="#555B66")
        ax.tick_params(colors="#A0AEC0", labelsize=10)
        for spine in ax.spines.values():
            spine.set_color("#2D3748")

    # -------------------------------------------------------------
    # Painel 1: 6 Eixos Brutos do Apple Watch (@ fs estimada)
    # -------------------------------------------------------------
    ax1 = axes[0]
    ax1.plot(t, data["ax"], label="Acc X (g)", color="#15685A", alpha=0.8, linewidth=1.2)
    ax1.plot(t, data["ay"], label="Acc Y (g)", color="#8B6FB3", alpha=0.8, linewidth=1.2)
    ax1.plot(t, data["az"], label="Acc Z (g)", color="#D9893D", alpha=0.8, linewidth=1.2)
    ax1.set_ylabel("Aceleração (g)", color="#A0AEC0", fontsize=10)

    # Eixo secundário para Giroscópio
    ax1_twin = ax1.twinx()
    ax1_twin.set_facecolor("none")
    ax1_twin.tick_params(colors="#718096", labelsize=9)
    ax1_twin.plot(t, data["gx"], label="Gyro X", color="#3C7C8C", linestyle=":", alpha=0.6, linewidth=1.1)
    ax1_twin.plot(t, data["gy"], label="Gyro Y", color="#9B5F4A", linestyle=":", alpha=0.6, linewidth=1.1)
    ax1_twin.plot(t, data["gz"], label="Gyro Z", color="#4E6F3D", linestyle=":", alpha=0.6, linewidth=1.1)
    ax1_twin.set_ylabel("Giroscópio (rad/s)", color="#718096", fontsize=10)

    ax1.set_title(
        f"1. Sinais Inerciais Brutos (6 Canais @ {fs:.1f} Hz) — {exercise_name} | {user_name} ({user_sex}, {user_age} anos, {user_exp})",
        color="#FFFFFF",
        fontsize=12,
        fontweight="bold",
        pad=10,
    )
    ax1.legend(loc="upper left", facecolor="#1A1D24", edgecolor="#2D3748", labelcolor="#E2E8F0", fontsize=9, ncol=3)

    # -------------------------------------------------------------
    # Painel 2: Normalização e Síntese 1D (Magnitude vs PCA)
    # -------------------------------------------------------------
    ax2 = axes[1]
    ax2.plot(t, processed["filtMagAcc"], label="Magnitude Euclidiana ||a||", color="#3182CE", linewidth=1.5, alpha=0.8)
    ax2.plot(t, processed["filtPcaAcc"], label="Projeção PCA 1D (Eixo Principal)", color="#ECC94B", linewidth=1.8)
    ax2.set_ylabel("Amplitude Normalizada", color="#A0AEC0", fontsize=10)
    ax2.set_title(
        "2. Normalização e Síntese Dimensional (6D → 1D)",
        color="#FFFFFF",
        fontsize=12,
        fontweight="bold",
        pad=10,
    )
    ax2.legend(loc="upper left", facecolor="#1A1D24", edgecolor="#2D3748", labelcolor="#E2E8F0", fontsize=9)

    # -------------------------------------------------------------
    # Painel 3: Sinal Final de Repetição com Picos Marcados
    # -------------------------------------------------------------
    ax3 = axes[2]
    synthesized = processed["synthesizedSignal"]
    ax3.plot(t, synthesized, label="Sinal de Repetição Gymbeat (Acel + Giro)", color="#48BB78", linewidth=2.0)

    # Plotar os picos detectados
    peak_times = [r["timeSeconds"] for r in detected_reps]
    peak_values = [r["peakValue"] for r in detected_reps]

    if peak_times:
        ax3.scatter(
            peak_times,
            peak_values,
            color="#E53E3E",
            s=90,
            zorder=5,
            edgecolors="#FFFFFF",
            linewidth=1.5,
            label=f"Repetições Detectadas: {num_detected} (Ground Truth: {real_reps})",
        )
        for idx, (pt, pv) in enumerate(zip(peak_times, peak_values)):
            ax3.annotate(
                f"#{idx+1}",
                (pt, pv),
                textcoords="offset points",
                xytext=(0, 10),
                ha="center",
                color="#FFFFFF",
                fontsize=9,
                fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.25", fc="#E53E3E", ec="none", alpha=0.9),
            )

    ax3.set_title(
        f"3. Curva Final com Repetições Evidenciadas [Contagem IA: {num_detected} | Real: {real_reps}]",
        color="#FFFFFF",
        fontsize=12,
        fontweight="bold",
        pad=10,
    )
    ax3.set_xlabel("Tempo decorrido na série (segundos)", color="#A0AEC0", fontsize=11)
    ax3.set_ylabel("Índice de Repetição", color="#A0AEC0", fontsize=10)
    ax3.legend(loc="upper left", facecolor="#1A1D24", edgecolor="#2D3748", labelcolor="#E2E8F0", fontsize=9)

    plt.tight_layout()
    plt.savefig(output_path, dpi=180, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close()


def generate_html_report(results: List[Dict[str, Any]], report_path: Path) -> None:
    """Gera um relatório HTML interativo com os cards de cada bloco de sessão processado."""
    cards_html = []

    for item in results:
        block = item["block"]
        processed = item["processed"]
        img_rel = item["img_rel"]

        exercise_name = block.get("exerciseName", block.get("exerciseId", "Exercício"))
        session_id = block.get("sessionId", "")
        user_name = block.get("userName", "Voluntário")
        user_sex = block.get("userSex", "N/D")
        user_age = block.get("userAge", "N/D")
        user_exp = block.get("userExperience", "N/D")

        real_reps = block.get("reps", 0)
        det_reps = len(processed.get("detectedReps", []))
        error = abs(real_reps - det_reps)
        badge_color = "#38A169" if error == 0 else "#DD6B20" if error <= 2 else "#E53E3E"

        cards_html.append(f"""
        <div class="card">
          <div class="card-header">
            <div>
              <h3>{exercise_name}</h3>
              <p class="subtitle">Sessão: <code>{session_id}</code> | Voluntário: <b>{user_name}</b> ({user_sex}, {user_age} anos, {user_exp})</p>
            </div>
            <div class="badges">
              <span class="badge" style="background-color: {badge_color};">IA: {det_reps} reps | Real: {real_reps} reps (Erro: {error})</span>
              <span class="badge-neutral">{processed.get('sampleCount')} amostras ({processed.get('durationSeconds', 0):.1f}s @ {processed.get('fs', 0):.1f} Hz)</span>
            </div>
          </div>
          <div class="card-body">
            <img src="{img_rel}" alt="Gráfico Comparativo da Sessão" class="plot-img" />
          </div>
        </div>
        """)

    html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Gymbeat — Relatório de Normalização e Detecção de Repetições</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B0D11;
      color: #E2E8F0;
      margin: 0;
      padding: 32px 20px;
    }}
    .container {{
      max-width: 1200px;
      margin: 0 auto;
    }}
    h1 {{
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 6px;
    }}
    .lead {{
      color: #718096;
      font-size: 14px;
      margin-bottom: 28px;
    }}
    .card {{
      background: #161920;
      border: 1px solid #232732;
      border-radius: 12px;
      margin-bottom: 28px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #232732;
      background: #1A1E27;
    }}
    .card-header h3 {{
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #F7FAFC;
    }}
    .subtitle {{
      margin: 0;
      font-size: 13px;
      color: #718096;
    }}
    code {{
      background: #2D3748;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #CBD5E0;
    }}
    .badges {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    .badge {{
      color: #FFFFFF;
      font-weight: 700;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 6px;
    }}
    .badge-neutral {{
      background: #2D3748;
      color: #A0AEC0;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 6px;
    }}
    .card-body {{
      padding: 16px;
      text-align: center;
    }}
    .plot-img {{
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid #232732;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h1>Gymbeat — Relatório de Normalização de Sinais (6D → 1D)</h1>
    <p class="lead">Processamento dinâmico de blocos de sessão: redução dimensional 6D → 1D e validação biomecânica de repetições.</p>
    {''.join(cards_html) if cards_html else '<p style="color: #A0AEC0;">Nenhum bloco de sessão disponível.</p>'}
  </div>
</body>
</html>
"""
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_content)


def main():
    parser = argparse.ArgumentParser(
        description="Gera gráficos de repetição baseados em cada bloco do dataset.json",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--input-file",
        default=str(DEFAULT_INPUT),
        help=f"Arquivo JSON contendo os blocos de sessão (padrão: {DEFAULT_INPUT})",
    )
    parser.add_argument("--session-id", help="Processa apenas um sessionId específico")
    parser.add_argument("--exercise-id", help="Filtra por exerciseId (ex: squat, bench-press)")
    parser.add_argument(
        "--output-dir",
        help="Diretório de saída dos gráficos e relatório (padrão: mesmo diretório do arquivo de entrada)",
    )

    args = parser.parse_args()
    input_path = Path(args.input_file)

    if not input_path.exists():
        legacy_path = OUTPUT_BASE / "dataset.json"
        if legacy_path.exists() and input_path == DEFAULT_INPUT:
            input_path = legacy_path
        else:
            print(f"[Erro] Arquivo de dados '{input_path}' não encontrado.", file=sys.stderr)
            print("Execute primeiro o fetch_dataset.py para gerar o arquivo dataset.json em output/userdata/.", file=sys.stderr)
            sys.exit(1)

    print(f"[*] Lendo blocos de sessão de: {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    if not isinstance(dataset, list):
        print(f"[Erro] Estrutura inválida em '{input_path}'. Esperava-se uma lista de blocos.", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output_dir) if args.output_dir else input_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # Filtrar se solicitado
    blocks_to_process = dataset
    if args.session_id:
        blocks_to_process = [b for b in blocks_to_process if b.get("sessionId") == args.session_id]
    if args.exercise_id:
        blocks_to_process = [b for b in blocks_to_process if b.get("exerciseId") == args.exercise_id]

    print(f"[+] Total de blocos identificados para plot: {len(blocks_to_process)}")
    if not blocks_to_process:
        print("[!] Nenhum bloco corresponde aos filtros informados.")
        sys.exit(0)

    results = []
    summary_list = []

    for idx, block in enumerate(blocks_to_process):
        session_id = block.get("sessionId", f"sess_{idx}")
        exercise_id = block.get("exerciseId", "exercise")
        exercise_name = block.get("exerciseName", exercise_id)

        print(f"\n[*] Processando Bloco [{idx+1}/{len(blocks_to_process)}]: {exercise_name} ({session_id})...")

        processed = process_session_block(block)
        if "error" in processed:
            print(f"    [!] Ignorado: {processed['error']}")
            continue

        plot_filename = f"plot_{session_id}_{exercise_id}.png"
        plot_path = out_dir / plot_filename

        plot_single_block(block, processed, plot_path)
        print(f"    [✓] Gráfico gerado: {plot_filename}")

        real_reps = block.get("reps", 0)
        detected_reps = processed.get("detectedReps", [])
        num_detected = len(detected_reps)
        error = abs(real_reps - num_detected)

        results.append({
            "block": block,
            "processed": processed,
            "img_rel": plot_filename,
        })

        summary_list.append({
            "sessionId": session_id,
            "exerciseId": exercise_id,
            "exerciseName": exercise_name,
            "userName": block.get("userName"),
            "userEmail": block.get("userEmail"),
            "userAge": block.get("userAge"),
            "userSex": block.get("userSex"),
            "userExperience": block.get("userExperience"),
            "sampleCount": processed["sampleCount"],
            "durationSeconds": round(processed["durationSeconds"], 2),
            "effectiveFsHz": round(processed["fs"], 2),
            "realReps": real_reps,
            "detectedReps": num_detected,
            "errorReps": error,
            "peaks": detected_reps,
        })

    # Atualizar relatório HTML e resumo JSON
    report_path = out_dir / "report.html"
    generate_html_report(results, report_path)

    summary_path = out_dir / "metrics_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_list, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================")
    print(f"🎉 PLOTAGEM DINÂMICA CONCLUÍDA COM SUCESSO!")
    print(f"==========================================")
    print(f"Blocos processados: {len(results)}")
    print(f"Gráficos salvos em: {out_dir.resolve()}/")
    print(f"Relatório visual HTML: {report_path.resolve()}")
    print(f"Resumo métrico JSON: {summary_path.resolve()}")
    print(f"==========================================\n")


if __name__ == "__main__":
    main()
