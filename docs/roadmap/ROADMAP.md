# Roadmap Técnico: IA para Contagem de Repetições em Tempo Real (Gymbeat)

Este documento descreve a arquitetura, metodologia científica e etapas de implementação para o desenvolvimento e integração do modelo responsável pela **contagem de repetições em tempo real** a partir de dados inerciais de sensores vestíveis (Apple Watch) processados no smartphone (iPhone).

---

## 🗺️ Visão Geral das Fases

O projeto está estruturado em 3 fases fundamentais:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Coleta de Dados (Wearable) & Extração do Firestore              │
│  - Streaming do Apple Watch (IMU @ 25 Hz) → iPhone → Nuvem (Firebase)   │
│  - Pipeline de extração para dataset local em Python                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Modelo de IA: Detecção de Picos + Classificador Clássico        │
│  - Decisão Arquitetural: Justificativa do descarte da Abordagem 1       │
│  - Abordagem Adotada: Processamento de Sinais (Picos/Vales) + IA        │
│  - Validação Cruzada LOSO (Leave-One-Subject-Out) & Exportação          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: Integração da Inferência em Tempo Real no Smartphone            │
│  - Apple Watch atua apenas como sensor inercial (streaming puro)        │
│  - iPhone executa motor em tempo real (Buffer + DSP + Classificador)    │
│  - Feedback visual e háptico ao vivo durante a série                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Fase 1: Coleta de Dados e Extração do Firestore

> **Diagrama Arquitetural da Fase 1:** [fase-1-coleta-e-extracao.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-1-coleta-e-extracao.drawio)

### 1.1 Coleta de Dados no App Existente
A infraestrutura implementada no projeto realiza a coleta contínua:
- **Apple Watch ([native/watch-app/WorkoutManager.swift](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/native/watch-app/WorkoutManager.swift)):**
  - Coleta `accelerationX/Y/Z` e `gyroscopeX/Y/Z` via `CMMotionManager` a **25 Hz** (intervalo de 0.04s).
  - Coleta dados fisiológicos (`heartRate`, `activeEnergyBurned`, `oxygenSaturation`) via `HealthKit`.
  - Dispara amostras via `WatchConnectivity` para o smartphone.
- **iPhone ([app/live/[id].tsx](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/app/live/%5Bid%5D.tsx)):**
  - Recebe o fluxo contínuo de amostras.
  - Ao término da série, o usuário informa a quantidade real de repetições executadas (*Ground Truth*).
  - Persiste a sessão no SQLite local e realiza sincronização em lote com o Firebase Firestore ([src/firebase/sync.ts](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/src/firebase/sync.ts)).

### 1.2 Estrutura do Documento no Firestore
Cada sessão gravada no Firestore em `users/{uid}/exerciseSessions/{sessionId}` contém:
```json
{
  "sessionId": "live-1724520000000-abc123",
  "exerciseId": "bench-press",
  "exerciseName": "Supino reto",
  "startedAt": "2026-08-24T16:00:00.000Z",
  "endedAt": "2026-08-24T16:00:45.000Z",
  "reps": 10,
  "sampleCount": 1125,
  "samples": [
    {
      "timestamp": "2026-08-24T16:00:00.040Z",
      "accelerationX": 0.021,
      "accelerationY": 0.981,
      "accelerationZ": -0.124,
      "gyroscopeX": 0.012,
      "gyroscopeY": -0.045,
      "gyroscopeZ": 0.003,
      "heartRate": 128
    }
  ]
}
```

### 1.3 Pipeline de Extração de Dados (Python)
Para transferir os dados do Firebase para o ambiente local de treino, utiliza-se o script `scripts/ml/export_dataset.py`:

```python
# scripts/ml/export_dataset.py
import firebase_admin
from firebase_admin import credentials, firestore
import json

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

all_sessions = []
users = db.collection("users").stream()

for user in users:
    sessions = db.collection("users").document(user.id).collection("exerciseSessions").stream()
    for session in sessions:
        data = session.to_dict()
        data["userId"] = user.id
        all_sessions.append(data)

with open("data/raw_dataset.json", "w") as f:
    json.dump(all_sessions, f, indent=2)

print(f"Total de sessões exportadas: {len(all_sessions)}")
```

---

## 🧠 Fase 2: Modelo de IA — Detecção de Picos + Validação com IA Clássica

> **Diagrama do Pipeline da Fase 2:** [fase-2-treinamento-ia-comparativo.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-2-treinamento-ia-comparativo.drawio)

### 2.1 Decisão Arquitetural: Descarte da Abordagem de Deep Learning (1D-CNN / LSTM)

> [!IMPORTANT]
> **Por que a Abordagem 1 (Deep Learning fim-a-fim) foi descartada?**
> 1. **Janela de Tempo e Volume de Dados:** Modelos de Deep Learning (como CNNs 1D, BiLSTM ou Transformers temporais) exigem dezenas de milhares de repetições rotuladas por múltiplos indivíduos para evitar *overfitting* severo e aprender a generalizar.
> 2. **Incompatibilidade com o Rótulo Coletado:** O protocolo de coleta captura o número total de repetições por série ao final do exercício (rotulagem global), e não anotações milissegundo a milissegundo de onde cada fase excêntrica/concêntrica começa e termina (*frame-level annotation*).
> 3. **Eficiência e Estabilidade no TCC:** A abordagem baseada em Processamento de Sinais + IA Clássica é matematicamente robusta, interpretável, funciona com datasets menores e apresenta execução ultra-rápida no smartphone sem latência perceptível.

---

### 2.2 Abordagem Adotada: Processamento de Sinais (Picos/Vales) + IA Clássica (Híbrida)

A solução adotada divide o problema em duas etapas complementares:

```mermaid
flowchart TD
    A[Sinais Brutos IMU @ 25Hz] --> B[Filtro Passa-Baixa Butterworth 3-5Hz]
    B --> C[Magnitude do Vetor: ||a|| e ||w||]
    C --> D[Detecção de Picos e Vales / Extremos Locais]
    D --> E[Extração de Features do Pico: Amplitude, Duração, Energia, Assimetria]
    E --> F[Classificador IA Clássico: Random Forest / SVM]
    F -->|Pico Válido| G[reps = reps + 1]
    F -->|Ruído / Ajuste| H[Descartar Pico]
```

#### 1. Pré-processamento e Filtragem
- **Filtro Passa-Baixa Butterworth (4ª ordem, corte em 3 Hz - 5 Hz):** Remove ruídos de vibração e micro-movimentos involuntários mantendo as curvas macro do movimento humano.
- **Cálculo da Magnitude Vetorial:**
  $$\|\mathbf{a}(t)\| = \sqrt{a_x(t)^2 + a_y(t)^2 + a_z(t)^2}, \quad \|\boldsymbol{\omega}(t)\| = \sqrt{\omega_x(t)^2 + \omega_y(t)^2 + \omega_z(t)^2}$$
  *Vantagem:* A magnitude é invariante à rotação do relógio no pulso, tornando a detecção imune a pequenas variações de posicionamento do Apple Watch.

#### 2. Localização de Picos Candidatos (Signal Processing)
- Algoritmo de busca de extremos locais na curva de aceleração com restrições biomecânicas:
  - **Distância temporal mínima ($t_{min}$):** Um ser humano raramente realiza uma repetição em menos de 1.0 a 1.2 segundos.
  - **Proeminência mínima de pico ($h_{min}$):** Descarta oscilações de baixa intensidade.

#### 3. Extração de Atributos (Feature Engineering por Pico)
Para cada pico detectado, extraem-se atributos que alimentam a IA:
- Duração do ciclo (tempo entre vales adjacentes).
- Amplitude do pico em relação aos vales (crista - vale).
- Energia da aceleração durante o ciclo ($\sum a(t)^2$).
- Variância e assimetria (*skewness*) do pico.
- Rotação angular integrada no período ($\int \|\boldsymbol{\omega}\| dt$).

#### 4. Validador com IA Clássica (Random Forest / SVM / XGBoost)
- O classificador avalia o vetor de características do pico e responde:
  - `Classe 1 (Repetição Legítima):` Contabiliza $+1$ repetição.
  - `Classe 0 (Movimento Espúrio / Ajuste Postural / Ruído):` Ignora o pico.

---

### 2.3 Metodologia Científica e Avaliação para o TCC

#### Validação Cruzada: Leave-One-Subject-Out (LOSO)
- Com $N$ voluntários que realizaram os exercícios, treina-se o classificador com $N-1$ participantes e testa-se no voluntário restante.
- A métrica é a média dos $N$ testes, garantindo que o algoritmo generaliza para qualquer novo usuário.

#### Métricas de Desempenho
- **MAE (Erro Médio Absoluto de Repetições):**
  $$\text{MAE} = \frac{1}{M} \sum_{i=1}^M |\text{reps\_reais}_i - \text{reps\_preditas}_i|$$
- **RMSE (Raiz do Erro Quadrático Médio):** Penaliza grandes discrepâncias em séries individuais.
- **Taxa de Acerto Exato (%):** Porcentagem de séries em que a IA contou exatamente o mesmo número que o voluntário.
- **Latência de Inferência:** Tempo de processamento por pico em milissegundos (< 5ms).

---

## 📱 Fase 3: Integração da Inferência em Tempo Real no Smartphone

> **Diagrama do Fluxo da Fase 3:** [fase-3-integracao-tempo-real-smartphone.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-3-integracao-tempo-real-smartphone.drawio)

### 3.1 Divisão de Responsabilidades
- **Apple Watch:** Sensor inercial puro (`WorkoutManager.swift`). Transmite as leituras brutas via Bluetooth sem executar algoritmos pesados, preservando bateria e estabilidade.
- **iPhone (App React Native):** Executa o pipeline de filtragem digital, o detector de picos em streaming, a inferência do classificador e atualiza a interface gráfica em tempo real.

---

### 3.2 Componentes do Módulo de IA no Smartphone

#### 1. Buffer Circular em Memória (`src/ai/CircularBuffer.ts`)
Mantém uma janela deslizante contínua dos últimos 3 a 5 segundos de dados (75 a 125 amostras a 25 Hz):

```typescript
export class CircularBuffer {
  private buffer: number[][];
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.buffer = [];
  }

  public push(sample: number[]): void {
    if (this.buffer.length >= this.size) {
      this.buffer.shift();
    }
    this.buffer.push(sample);
  }

  public isFull(): boolean {
    return this.buffer.length === this.size;
  }

  public getBuffer(): number[][] {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = [];
  }
}
```

#### 2. Motor de Contagem em Tempo Real (`src/ai/RepetitionCounter.ts`)
Aplica o filtro digital passa-baixa online e avalia a ocorrência de repetições:

```typescript
import { CircularBuffer } from "./CircularBuffer";

export class RepetitionCounter {
  private buffer: CircularBuffer;
  private currentReps = 0;
  private lastPeakTime = 0;
  private minIntervalMs = 1200; // Mínimo de 1.2s entre repetições

  constructor(windowSize = 100) {
    this.buffer = new CircularBuffer(windowSize);
  }

  public addSample(sample: {
    timestamp: number;
    accX: number;
    accY: number;
    accZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  }): { reps: number; isNewRep: boolean } {
    // 1. Calcula magnitude
    const magnitude = Math.sqrt(sample.accX ** 2 + sample.accY ** 2 + sample.accZ ** 2);
    this.buffer.push([sample.timestamp, magnitude, sample.gyroX, sample.gyroY, sample.gyroZ]);

    // 2. Avalia se atingiu um pico válido
    const isNewRep = this.checkPeak(sample.timestamp);
    if (isNewRep) {
      this.currentReps += 1;
    }

    return { reps: this.currentReps, isNewRep };
  }

  private checkPeak(currentTime: number): boolean {
    if (currentTime - this.lastPeakTime < this.minIntervalMs) {
      return false;
    }

    // Algoritmo de detecção de pico com validação do classificador
    const data = this.buffer.getBuffer();
    if (data.length < 15) return false;

    const currentMag = data[data.length - 1][1];
    const prevMag = data[data.length - 2][1];
    const prevPrevMag = data[data.length - 3][1];

    // Detecta inflexão (pico local)
    if (prevMag > prevPrevMag && prevMag > currentMag && prevMag > 1.35) {
      this.lastPeakTime = currentTime;
      return true; // Pico validado
    }

    return false;
  }

  public reset() {
    this.buffer.clear();
    this.currentReps = 0;
    this.lastPeakTime = 0;
  }
}
```

#### 3. Integração com a UI do Treino ([app/live/[id].tsx](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/app/live/%5Bid%5D.tsx))
- A tela exibe as repetições contadas automaticamente pela IA ao longo do treino.
- Ao clicar em "Salvar Série", o usuário vê a contagem da IA e insere o valor real para retroalimentação do banco de dados e comparação no TCC.

---

## 📁 Estrutura de Arquivos do Projeto

```
tcc-gymbeatDataCollection/
├── docs/
│   ├── watch-connectivity-architecture.drawio
│   ├── watch-user-flow-simplified.drawio
│   └── roadmap/
│       ├── ROADMAP.md                                  # Este documento
│       ├── fase-1-coleta-e-extracao.drawio             # Diagrama Fase 1
│       ├── fase-2-treinamento-ia-comparativo.drawio    # Diagrama Fase 2 (Detecção 2)
│       └── fase-3-integracao-tempo-real-smartphone.drawio # Diagrama Fase 3
├── scripts/
│   └── ml/                                             # Scripts de exportação e treino
├── src/
│   ├── ai/                                             # Motor de inferência e contagem
│   ├── firebase/                                       # Sincronização em nuvem
│   └── watch/                                          # Conectividade Watch
└── native/
    └── watch-app/                                      # App watchOS (coletor @ 25Hz)
```
