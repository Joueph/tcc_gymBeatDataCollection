#!/usr/bin/env python3
"""
Visualizador e Comparador de Sinais Normalizados de Repetições (Gymbeat)
Consome os dados do fetch_dataset.py, sintetiza os 6 eixos em sinais 1D e gera os gráficos comparativos.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import numpy as np

from fetch_dataset import fetch_dataset
from normalizer import process_session

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def plot_session_comparison(session: Dict[str, Any], processed: Dict[str, Any], output_path: Path) -> None:
    """Gera gráfico comparativo de 3 painéis evidenciando a transformação dos 6 eixos em sinal 1D."""
    samples = session.get("samples", [])
    if not samples or "error" in processed:
        return

    fs = 25.0
    t = np.arange(len(samples)) / fs
    data = processed["data"]

    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    fig.patch.set_facecolor("#121418")

    for ax in axes:
        ax.set_facecolor("#1A1D24")
        ax.grid(True, linestyle="--", alpha=0.3, color="#555B66")
        ax.tick_params(colors="#A0AEC0", labelsize=10)
        for spine in ax.spines.values():
            spine.set_color("#2D3748")

    # ==========================================
    # Painel 1: 6 Eixos Brutos do Apple Watch
    # ==========================================
    ax1 = axes[0]
    ax1.plot(t, data["ax"], label="Acc X (g)", color="#15685A", alpha=0.7, linewidth=1.2)
    ax1.plot(t, data["ay"], label="Acc Y (g)", color="#8B6FB3", alpha=0.7, linewidth=1.2)
    ax1.plot(t, data["az"], label="Acc Z (g)", color="#D9893D", alpha=0.7, linewidth=1.2)
    
    # Adiciona velocidade angular secundária no mesmo gráfico com escala tracejada
    ax1_twin = ax1.twinx()
    ax1_twin.set_facecolor("none")
    ax1_twin.tick_params(colors="#718096", labelsize=9)
    ax1_twin.plot(t, data["gx"], label="Gyro X", color="#3C7C8C", linestyle=":", alpha=0.5, linewidth=1.0)
    ax1_twin.plot(t, data["gy"], label="Gyro Y", color="#9B5F4A", linestyle=":", alpha=0.5, linewidth=1.0)
    ax1_twin.plot(t, data["gz"], label="Gyro Z", color="#4E6F3D", linestyle=":", alpha=0.5, linewidth=1.0)
    ax1_twin.set_ylabel("Giroscópio (rad/s)", color="#718096", fontsize=10)

    ax1.set_title(
        f"1. Sinais Inerciais Brutos (6 Canais @ 25 Hz) — {session.get('exerciseName')} | Voluntário: {session.get('userName')} ({session.get('userSex')}, {session.get('userAge')}a)",
        color="#FFFFFF",
        fontsize=12,
        fontweight="bold",
        pad=10,
    )
    ax1.set_ylabel("Aceleração (g)", color="#A0AEC0", fontsize=10)
    ax1.legend(loc="upper left", facecolor="#1A1D24", edgecolor="#2D3748", labelcolor="#E2E8F0", fontsize=9, ncol=3)

    # ==========================================
    # Painel 2: Métodos de Síntese 1D (Magnitude vs PCA)
    # ==========================================
    ax2 = axes[1]
    ax2.plot(t, processed["filtMagAcc"], label="Magnitude L2 Filtrada ||a||", color="#3182CE", linewidth=1.5, alpha=0.8)
    ax2.plot(t, processed["filtPcaAcc"], label="Projeção PCA 1D (Eixo Principal)", color="#ECC94B", linewidth=1.8)
    ax2.set_title(
        "2. Normalização e Síntese Dimensional (6D → 1D)",
        color="#FFFFFF",
        fontsize=12,
        fontweight="bold",
        pad=10,
    )
    ax2.set_ylabel("Amplitude Normalizada", color="#A0AEC0", fontsize=10)
    ax2.legend(loc="upper left", facecolor="#1A1D24", edgecolor="#2D3748", labelcolor="#E2E8F0", fontsize=9)

    # ==========================================
    # Painel 3: Sinal Sintetizado e Detecção de Repetições
    # ==========================================
    ax3 = axes[2]
    synthesized = processed["synthesizedSignal"]
    reps_detected = processed["detectedRepsSynthesized"]
    real_reps = session.get("reps", 0)

    ax3.plot(t, synthesized, label="Sinal de Repetição Gymbeat (Acel + Giro)", color="#48BB78", linewidth=2.0)

    # Marcar os picos de cada repetição
    peak_times = [r["timeSeconds"] for r in reps_detected]
    peak_values = [r["peakValue"] for r in reps_detected]

    if peak_times:
        ax3.scatter(
            peak_times,
            peak_values,
            color="#E53E3E",
            s=80,
            zorder=5,
            edgecolors="#FFFFFF",
            linewidth=1.5,
            label=f"Repetições Detectadas: {len(reps_detected)} (Ground Truth: {real_reps})",
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
                bbox=dict(boxstyle="round,pad=0.2", fc="#E53E3E", ec="none", alpha=0.8),
            )

    ax3.set_title(
        f"3. Curva Final com Repetições Evidenciadas [Contagem IA: {len(reps_detected)} | Real: {real_reps}]",
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
    """Gera um relatório HTML interativo com os gráficos e métricas de cada sessão."""
    cards_html = []

    for item in results:
        session = item["session"]
        processed = item["processed"]
        img_rel = item["img_rel"]

        real_reps = session.get("reps", 0)
        det_reps = len(processed.get("detectedRepsSynthesized", []))
        error = abs(real_reps - det_reps)
        badge_color = "#38A169" if error == 0 else "#DD6B20" if error <= 1 else "#E53E3E"

        cards_html.append(f"""
        <div class="card">
          <div class="card-header">
            <div>
              <h3>{session.get('exerciseName')}</h3>
              <p class="subtitle">Sessão: <code>{session.get('sessionId')}</code> | {session.get('userName')} ({session.get('userSex')}, {session.get('userAge')} anos, {session.get('userExperience')})</p>
            </div>
            <div class="badges">
              <span class="badge" style="background-color: {badge_color};">IA: {det_reps} reps | Real: {real_reps} reps (Erro: {error})</span>
              <span class="badge-neutral">{session.get('sampleCount')} amostras ({processed.get('durationSeconds', 0):.1f}s)</span>
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
    <p class="lead">Análise comparativa de redução dimensional dos 6 eixos inerciais e detecção automática de repetições.</p>
    {''.join(cards_html) if cards_html else '<p style="color: #A0AEC0;">Nenhuma sessão encontrada para os filtros selecionados.</p>'}
  </div>
</body>
</html>
"""
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_content)


def main():
    parser = argparse.ArgumentParser(
        description="Visualizador e Sintetizador de Sinais de Repetição (Gymbeat)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Repasse das flags de filtragem para o orquestrador
    parser.add_argument(
        "--user-age-range",
        "--user-age-rage",
        nargs=2,
        type=int,
        metavar=("MIN", "MAX"),
        help="Filtra por faixa etária",
    )
    parser.add_argument(
        "--user-email",
        action="append",
        dest="user_emails",
        metavar="EMAIL",
        help="Filtra por e-mail (acumulável)",
    )
    parser.add_argument("--user-sex", metavar="SEX", help="Filtra por sexo ('h'/'homem' ou 'm'/'mulher')")
    parser.add_argument("--user-experience", metavar="EXP", help="Filtra por experiência")
    parser.add_argument("--source", default="auto", choices=["auto", "firebase", "local"])
    parser.add_argument("--session-id", help="Processa apenas uma sessão específica por ID")
    parser.add_argument("--input-file", help="Carrega sessões diretamente de um arquivo JSON previamente extraído")

    args = parser.parse_args()

    # 1. Carregar sessões
    if args.input_file and Path(args.input_file).exists():
        print(f"[*] Carregando sessões do arquivo {args.input_file}...")
        with open(args.input_file, "r", encoding="utf-8") as f:
            sessions = json.load(f)
    else:
        print("[*] Obtendo sessões via fetch_dataset...")
        sessions = fetch_dataset(
            age_range=args.user_age_range,
            emails=args.user_emails,
            sex=args.user_sex,
            experience=args.user_experience,
            source=args.source,
        )

    if args.session_id:
        sessions = [s for s in sessions if s.get("sessionId") == args.session_id]

    print(f"[+] Total de sessões para visualização: {len(sessions)}")
    if not sessions:
        print("[!] Nenhuma sessão disponível para processar.")
        sys.exit(0)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report_items = []
    summary_metrics = []

    for idx, sess in enumerate(sessions):
        sess_id = sess.get("sessionId", f"sess_{idx}")
        ex_id = sess.get("exerciseId", "exercise")
        print(f"[*] Processando [{idx+1}/{len(sessions)}]: {sess.get('exerciseName')} ({sess_id})...")

        processed = process_session(sess.get("samples", []))
        if "error" in processed:
            print(f"    [!] Ignorado: {processed['error']}")
            continue

        plot_filename = f"plot_{sess_id}_{ex_id}.png"
        plot_path = OUTPUT_DIR / plot_filename

        plot_session_comparison(sess, processed, plot_path)

        det_reps = len(processed["detectedRepsSynthesized"])
        real_reps = sess.get("reps", 0)

        report_items.append({
            "session": sess,
            "processed": processed,
            "img_rel": plot_filename,
        })

        summary_metrics.append({
            "sessionId": sess_id,
            "exerciseName": sess.get("exerciseName"),
            "userAge": sess.get("userAge"),
            "userSex": sess.get("userSex"),
            "userExperience": sess.get("userExperience"),
            "sampleCount": processed["sampleCount"],
            "durationSeconds": processed["durationSeconds"],
            "realReps": real_reps,
            "detectedReps": det_reps,
            "errorReps": abs(real_reps - det_reps),
            "peaks": processed["detectedRepsSynthesized"],
        })

    # Gerar Relatório HTML e Métricas JSON
    report_html_path = OUTPUT_DIR / "report.html"
    generate_html_report(report_items, report_html_path)

    summary_json_path = OUTPUT_DIR / "metrics_summary.json"
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================")
    print(f"🎉 PROCESSAMENTO E SÍNTESE CONCLUÍDOS!")
    print(f"==========================================")
    print(f"Gráficos gerados em: {OUTPUT_DIR.resolve()}/")
    print(f"Relatório visual HTML: {report_html_path.resolve()}")
    print(f"Resumo métrico JSON: {summary_json_path.resolve()}")
    print(f"==========================================\n")


if __name__ == "__main__":
    main()
