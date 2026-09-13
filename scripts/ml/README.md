# Pipeline de Coleta, Normalização e Síntese Inercial (Gymbeat ML)

Este diretório contém os scripts do pipeline de dados para extração, filtragem por voluntário e síntese dimensional dos 6 eixos inerciais (Aceleração + Giroscópio) em um único sinal representativo para contagem de repetições.

---

## 📂 Estrutura dos Scripts

```
scripts/ml/
├── fetch_dataset.py           # Orquestrador CLI de coleta e filtragem (Firebase / SQLite)
├── normalizer.py              # Módulo matemático (Magnitude L2, PCA 1D, Butterworth)
├── visualize_reps.py          # Gerador de gráficos comparativos e relatórios em /output
├── generate_sample_series.py  # Gerador de séries sintéticas para calibração e teste
├── requirements.txt           # Dependências do Python
└── output/                    # Diretório de artefatos gerados (.png, .json, .html)
```

---

## 🚀 Como Executar

### 1. Configurar Ambiente Virtual

```bash
python3 -m venv scripts/ml/.venv
source scripts/ml/.venv/bin/activate
pip install -r scripts/ml/requirements.txt
```

---

### 2. Coletar e Filtrar Dados (`fetch_dataset.py`)

O script orquestrador conecta-se automaticamente ao Firebase Firestore (com fallback automático para a base local SQLite do app).

#### Flags Disponíveis:

| Flag | Descrição | Exemplo |
| :--- | :--- | :--- |
| `--user-age-range MIN MAX` | Filtra pela faixa etária dos voluntários | `--user-age-range 18 30` |
| `--user-email EMAIL` | Filtra por e-mail (**acumulável** / stackable) | `--user-email jose@teste.com --user-email maria@teste.com` |
| `--user-sex SEX` | Filtra por sexo (`h`/`homem` ou `m`/`mulher`) | `--user-sex h` |
| `--user-experience EXP` | Filtra por nível de experiência (`iniciante`/`i`, `intermediario`/`int`, `experiente`/`e`) | `--user-experience iniciante` |
| `--source` | Fonte de dados: `auto`, `firebase` ou `local` (padrão: `auto`) | `--source auto` |
| `--output` | Caminho do arquivo JSON gerado (padrão: `output/dataset.json`) | `--output scripts/ml/output/dataset.json` |

#### Exemplos de Execução:

```bash
# Filtrar homens entre 18 e 30 anos com nível iniciante
python3 scripts/ml/fetch_dataset.py --user-age-range 18 30 --user-sex h --user-experience iniciante

# Filtrar e-mails específicos
python3 scripts/ml/fetch_dataset.py --user-email jose@teste.com --user-email voluntario2@gymbeat.app
```

---

### 3. Gerar Gráficos e Síntese 1D (`visualize_reps.py`)

Consome os dados filtrados pelo orquestrador, sintetiza os 6 eixos em 1 sinal representativo e plota a comparação:

```bash
# Visualizar dados filtrados diretamente
python3 scripts/ml/visualize_reps.py --user-sex h --user-experience iniciante

# Visualizar a partir de um dataset exportado
python3 scripts/ml/visualize_reps.py --input-file scripts/ml/output/dataset.json

# Testar com a série sintética de 10 repetições
python3 scripts/ml/generate_sample_series.py
python3 scripts/ml/visualize_reps.py --input-file scripts/ml/output/synthetic_session.json
```

#### Saídas geradas em `scripts/ml/output/`:
- `plot_<sessionId>_<exerciseId>.png`: Gráfico comparativo de alta resolução em 3 painéis:
  1. **6 Eixos Brutos** (@ 25 Hz).
  2. **Normalização 1D** (Magnitude L2 vs PCA $PC_1$).
  3. **Curva Final com Repetições Detectadas** versus Ground Truth.
- `report.html`: Relatório HTML com visualização interativa de todas as séries.
- `metrics_summary.json`: Métricas de cada sessão (repetições reais vs preditas, erro absoluto, timestamps dos picos).
```

#### Saídas geradas:
- `plot_<sessionId>_<exerciseId>.png`: Gráfico comparativo de alta resolução em 3 painéis:
  1. **6 Eixos Brutos** (Aceleração X/Y/Z + Giroscópio X/Y/Z).
  2. **Normalização 1D** (Magnitude Euclidiana L2 vs Projeção PCA $PC_1$).
  3. **Curva de Repetição Gymbeat** com picos marcados e contagem de repetições.
- `report.html`: Relatório HTML moderno para inspeção visual rápida.
- `metrics_summary.json`: Resumo com taxa de amostragem real, repetições detectadas, erro absoluto e instantes de pico.
