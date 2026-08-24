# Roadmap Técnico: IA para Contagem de Repetições em Tempo Real (Gymbeat)

Este documento descreve a arquitetura, metodologia científica e etapas de implementação para o desenvolvimento e integração do modelo de Inteligência Artificial responsável pela **contagem de repetições em tempo real** a partir de dados inerciais de sensores vestíveis (Apple Watch) processados no smartphone (iPhone).

---

## 🗺️ Visão Geral das Fases

O projeto está estruturado em 3 fases fundamentais:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Coleta de Dados (Wearable) & Extração do Firestore              │
│  - Streaming do Apple Watch (IMU) → iPhone → Nuvem (Firebase)           │
│  - Pipeline de extração para dataset local em Python                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Treinamento e Comparativo de Abordagens de IA                   │
│  - Abordagem 1: Deep Learning (1D-CNN / LSTM para fases do exercício)   │
│  - Abordagem 2: Processamento de Sinais (Picos) + IA Clássica           │
│  - Validação Cruzada LOSO (Leave-One-Subject-Out) & Seleção do Vencedor │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: Integração da Inferência em Tempo Real no Smartphone            │
│  - Apple Watch atua apenas como sensor inercial (streaming puro)        │
│  - iPhone executa motor de inferência (Buffer + ONNX/TFLite + UI)       │
│  - Feedback visual e háptico ao vivo durante a série                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Fase 1: Coleta de Dados e Extração do Firestore

> **Diagrama Arquitetural da Fase 1:** [fase-1-coleta-e-extracao.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-1-coleta-e-extracao.drawio)

### 1.1 Coleta de Dados no App Existente
A infraestrutura já implementada no projeto realiza a coleta contínua:
- **Apple Watch ([native/watch-app/WorkoutManager.swift](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/native/watch-app/WorkoutManager.swift)):**
  - Coleta `accelerationX/Y/Z` e `gyroscopeX/Y/Z` via `CMMotionManager`.
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
  "sampleCount": 220,
  "samples": [
    {
      "timestamp": "2026-08-24T16:00:00.250Z",
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
Para transferir os dados do Firebase para o ambiente local de treino, utiliza-se um script com `firebase-admin`:

```python
# scripts/ml/export_dataset.py
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
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

## 🧠 Fase 2: Treinamento e Comparativo de Abordagens de IA

> **Diagrama do Pipeline da Fase 2:** [fase-2-treinamento-ia-comparativo.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-2-treinamento-ia-comparativo.drawio)

Nesta fase, duas abordagens distintas serão desenvolvidas e avaliadas sob as mesmas condições. A abordagem com melhores métricas será a integrada no aplicativo final.

### 2.1 Pré-processamento dos Sinais Inerciais
1. **Filtro Passa-Baixa (Butterworth de 4ª ordem, corte em 3 Hz - 5 Hz):** Atenua tremores, ruídos eletrônicos e micro-movimentos espúrios.
2. **Cálculo da Magnitude dos Vetores:**
   $$\|\mathbf{a}\| = \sqrt{a_x^2 + a_y^2 + a_z^2}, \quad \|\boldsymbol{\omega}\| = \sqrt{\omega_x^2 + \omega_y^2 + \omega_z^2}$$
3. **Janelamento Deslizante (Sliding Window):** Janelas de 2.0 a 3.0 segundos (ex: 50 amostras a 25 Hz) com sobreposição de 50%.
4. **Normalização (Z-Score):** $z = \frac{x - \mu}{\sigma}$ por eixo/sensor.

---

### 2.2 Abordagem 1: Deep Learning para Fases do Exercício (1D-CNN / BiLSTM)
- **Conceito:** A rede neural recebe uma janela temporal multicanal e classifica cada instante em uma das 3 classes:
  - `0: Repouso / Pausa`
  - `1: Fase Excêntrica (Descida / Alongamento sob tensão)`
  - `2: Fase Concêntrica (Subida / Contração máxima)`
- **Arquitetura:**
  - Camadas Convolucionais 1D (para extração automática de padrões morfológicos no sinal).
  - Camada Recorrente Bidirecional (BiLSTM ou GRU) para aprendizado de dependência temporal sequencial.
  - Camada Densa com Softmax.
- **Contador:** Uma Máquina de Estados Finitos (FSM) incrementa $+1$ repetição sempre que ocorre o ciclo completo: `Repouso → Excêntrica → Concêntrica → Retorno`.

```
               ┌──────────┐
               │ Repouso  │
               └────┬─────┘
                    │ Inicia movimento
                    ▼
               ┌──────────┐
               │Excêntrica│
               └────┬─────┘
                    │ Transição de pico
                    ▼
               ┌──────────┐
               │Concêntrica│
               └────┬─────┘
                    │ Fim do ciclo
                    ▼
       ┌─────────────────────────┐
       │ reps = reps + 1         │
       │ (Retorna para Repouso)  │
       └─────────────────────────┘
```

---

### 2.3 Abordagem 2: Detecção de Picos + IA Clássica (Híbrida)
- **Conceito:** Combina técnicas de Processamento Digital de Sinais (DSP) para localizar potenciais repetições com um classificador de Machine Learning tradicional (Random Forest, SVM ou XGBoost) para validar se o pico encontrado é uma repetição legítima.
- **Etapas:**
  1. **Algoritmo de Detecção de Picos (Peak Detection):** Identifica vales e cristas na magnitude da aceleração filtrada baseado em parâmetros de distância temporal mínima ($t_{min}$) e proeminência de pico ($h_{min}$).
  2. **Extração de Atributos Estatísticos do Pico:**
     - Amplitude máxima e mínima do ciclo.
     - Duração do ciclo (tempo entre vales).
     - Energia do sinal, variância e assimetria (skewness).
  3. **Classificador Binário:** Classifica o evento do pico em:
     - `1: Repetição Válida` (soma +1 rep).
     - `0: Ruído / Ajuste postural / Repetição incompleta` (descarta).

---

### 2.4 Metodologia Científica e Comparativo para o TCC
Para garantir rigor acadêmico e evitar *overfitting* de voluntário:

#### Estratégia de Validação Cruzada: LOSO (*Leave-One-Subject-Out*)
- Se houver $N$ voluntários coletados, o modelo é treinado com os dados de $N-1$ participantes e testado no participante restante.
- O processo é repetido $N$ vezes. Isso atesta que a IA funciona para novos usuários desconhecidos.

#### Tabela de Comparação de Resultados (Exemplo de Apresentação):

| Métrica | Abordagem 1 (1D-CNN / LSTM) | Abordagem 2 (Picos + Random Forest) |
| :--- | :---: | :---: |
| **MAE (Erro Médio Absoluto)** | *A definir nos testes* | *A definir nos testes* |
| **RMSE (Raiz do Erro Quadrático)** | *A definir nos testes* | *A definir nos testes* |
| **Taxa de Acerto Exato (%)** | *A definir nos testes* | *A definir nos testes* |
| **Latência por Inferência (ms)** | *A definir nos testes* | *A definir nos testes* |
| **Tamanho do Modelo (KB)** | *A definir nos testes* | *A definir nos testes* |

> **Critério de Seleção:** A abordagem com **menor MAE** e **alta acurácia exata** com tempo de inferência compatível com tempo real (< 50ms no celular) será exportada para **ONNX** (`model.onnx`) ou **TFLite** (`model.tflite`).

---

## 📱 Fase 3: Integração da Inferência em Tempo Real no Smartphone

> **Diagrama do Fluxo da Fase 3:** [fase-3-integracao-tempo-real-smartphone.drawio](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/docs/roadmap/fase-3-integracao-tempo-real-smartphone.drawio)

### 3.1 Divisão de Responsabilidades
- **Apple Watch:** Funciona exclusivamente como **dispositivo sensor**. Não executa modelos pesados, garantindo alta duração de bateria e simplicidade no watchOS.
- **iPhone (App React Native):** Centraliza toda a inteligência artificial, processamento de sinais, máquina de estados e atualização da interface gráfica.

---

### 3.2 Componentes do Módulo de IA no Smartphone

#### 1. Buffer Circular em Memória (`src/ai/CircularBuffer.ts`)
Mantém as últimas $W$ amostras de sensores recebidas em uma janela FIFO deslizante sem alocações contínuas de memória:

```typescript
export class CircularBuffer {
  private buffer: number[][];
  private size: number;

  constructor(size: number, featureCount: number = 6) {
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

  public getMatrix(): number[][] {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = [];
  }
}
```

#### 2. Motor de Inferência e Contador (`src/ai/RepetitionCounter.ts`)
Executa o modelo ONNX / TFLite no smartphone e mantém o estado das repetições:

```typescript
import { CircularBuffer } from "./CircularBuffer";

export class RepetitionCounter {
  private buffer: CircularBuffer;
  private currentReps = 0;
  private currentPhase: "rest" | "eccentric" | "concentric" = "rest";

  constructor(windowSize = 50) {
    this.buffer = new CircularBuffer(windowSize, 6);
  }

  public addSample(sample: {
    accX: number;
    accY: number;
    accZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  }): { reps: number; phase: string } {
    this.buffer.push([
      sample.accX,
      sample.accY,
      sample.accZ,
      sample.gyroX,
      sample.gyroY,
      sample.gyroZ,
    ]);

    if (this.buffer.isFull()) {
      this.evaluateWindow();
    }

    return { reps: this.currentReps, phase: this.currentPhase };
  }

  private evaluateWindow() {
    // 1. Executa inferência com o modelo vencedor (ex: ONNX Runtime)
    // 2. Atualiza máquina de estados (FSM)
    // 3. Se ciclo completou: this.currentReps += 1
  }

  public reset() {
    this.buffer.clear();
    this.currentReps = 0;
    this.currentPhase = "rest";
  }
}
```

#### 3. Integração na Tela de Treino ao Vivo ([app/live/[id].tsx](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/app/live/%5Bid%5D.tsx))
- A tela exibe o contador dinâmico de repetições calculadas pela IA durante a execução.
- Ao clicar em "Finalizar Série", o app exibe a contagem automática da IA e permite ao usuário confirmar ou ajustar as repetições reais, salvando ambos os valores para auditoria e melhoria contínua.

---

## 📁 Estrutura de Arquivos Criada no Projeto

```
tcc-gymbeatDataCollection/
├── docs/
│   ├── watch-connectivity-architecture.drawio
│   ├── watch-user-flow-simplified.drawio
│   └── roadmap/
│       ├── ROADMAP.md                                  # Este documento
│       ├── fase-1-coleta-e-extracao.drawio             # Diagrama Fase 1
│       ├── fase-2-treinamento-ia-comparativo.drawio    # Diagrama Fase 2
│       └── fase-3-integracao-tempo-real-smartphone.drawio # Diagrama Fase 3
├── scripts/
│   └── ml/                                             # Scripts de exportação e treino
├── src/
│   ├── ai/                                             # Módulos de inferência e contagem
│   ├── firebase/                                       # Sincronização em nuvem
│   └── watch/                                          # Conectividade Watch
└── native/
    └── watch-app/                                      # App watchOS (coletor)
```
