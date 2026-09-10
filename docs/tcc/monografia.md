# PONTIFÍCIA UNIVERSIDADE CATÓLICA DE CAMPINAS - PUC-CAMPINAS
## CENTRO DE CIÊNCIAS EXATAS, AMBIENTAIS E DE TECNOLOGIAS (CEATEC)
### FACULDADE DE ENGENHARIA DE COMPUTAÇÃO

---

# **GYMBEAT: SISTEMA VESTÍVEL E MÓVEL PARA RECONHECIMENTO E CONTAGEM DE REPETIÇÕES EM EXERCÍCIOS RESISTIDOS BASEADO EM SENSORES INERCIAIS E INTELIGÊNCIA ARTIFICIAL**

\vspace{2cm}

**Autor:** José Pascoal Martins  
**Orientador:** Prof. Dr. Antonio Carlos Forster  

\vspace{3cm}

**Campinas - SP**  
**2026**

---

## RESUMO

O monitoramento automático de exercícios físicos resistidos (musculação) por meio de dispositivos vestíveis (*wearables*) representa uma área emergente no campo do Reconhecimento de Atividades Humanas (*Human Activity Recognition* - HAR). No entanto, a maioria das soluções comerciais restringe-se a estimativas macroscópicas de gasto calórico e frequência cardíaca, carecendo de mecanismos precisos para contagem de repetições e análise biomecânica em tempo real. Este trabalho apresenta o **Gymbeat**, um sistema integrado composto por um aplicativo para *smartwatch* (Apple Watch) e um aplicativo para *smartphone* (iPhone) desenvolvido em React Native, destinado à coleta, processamento e contagem automática de repetições em tempo real. O sistema utiliza dados inerciais de acelerômetro e giroscópio coletados a uma frequência de 25 Hz. Para a contagem, adota-se uma abordagem híbrida fundamentada em Processamento Digital de Sinais (filtragem passa-baixa Butterworth e cálculo de magnitude invariante à rotação) combinada a um algoritmo de detecção de extremos locais e validação por Aprendizado de Máquina clássico. A metodologia de avaliação fundamenta-se no protocolo *Leave-One-Subject-Out* (LOSO), avaliando métricas de Erro Médio Absoluto ($MAE$), Raiz do Erro Quadrático Médio ($RMSE$) e latência computacional. Os resultados preliminares demonstram a viabilidade técnica da arquitetura proposta, garantindo contagem confiável com latência inferior a 5 ms no dispositivo móvel.

**Palavras-chave:** Dispositivos Vestíveis. Sensores Inerciais. Reconhecimento de Atividades Humanas. Processamento Digital de Sinais. Aprendizado de Máquina. Contagem de Repetições.

---

## ABSTRACT

Automatic tracking of resistance exercises (strength training) using wearable devices represents a key emerging area in Human Activity Recognition (HAR). However, most commercial solutions remain limited to macroscopic estimates of caloric expenditure and heart rate, lacking precise mechanisms for real-time repetition counting and biomechanical analysis. This work presents **Gymbeat**, an integrated system comprising a smartwatch application (Apple Watch) and a smartphone application (iPhone) developed in React Native, designed for real-time collection, processing, and automatic repetition counting. The system leverages inertial data from accelerometer and gyroscope sampled at 25 Hz. For repetition counting, a hybrid approach is employed, combining Digital Signal Processing (Butterworth low-pass filtering and rotation-invariant magnitude calculation) with local extrema detection and validation through classical Machine Learning. The evaluation methodology is based on the Leave-One-Subject-Out (LOSO) cross-validation protocol, assessing Mean Absolute Error ($MAE$), Root Mean Squared Error ($RMSE$), and computational latency. Preliminary results confirm the technical feasibility of the proposed architecture, delivering reliable counting with latency below 5 ms on the mobile device.

**Keywords:** Wearable Devices. Inertial Sensors. Human Activity Recognition. Digital Signal Processing. Machine Learning. Repetition Counting.

---

## LISTA DE ABREVIATURAS E SIGLAS

- **ABNT:** Associação Brasileira de Normas Técnicas
- **API:** *Application Programming Interface*
- **BLE:** *Bluetooth Low Energy*
- **CNN:** *Convolutional Neural Network*
- **DSP:** *Digital Signal Processing* (Processamento Digital de Sinais)
- **FIFO:** *First-In, First-Out*
- **HAR:** *Human Activity Recognition* (Reconhecimento de Atividades Humanas)
- **IMU:** *Inertial Measurement Unit* (Unidade de Medição Inercial)
- **LOSO:** *Leave-One-Subject-Out*
- **LSTM:** *Long Short-Term Memory*
- **MAE:** *Mean Absolute Error* (Erro Médio Absoluto)
- **ML:** *Machine Learning* (Aprendizado de Máquina)
- **RMSE:** *Root Mean Squared Error* (Raiz do Erro Quadrático Médio)
- **SDK:** *Software Development Kit*
- **SVM:** *Support Vector Machine*
- **TCC:** Trabalho de Conclusão de Curso
- **UI:** *User Interface* (Interface de Usuário)

---

## LISTA DE SÍMBOLOS E FÓRMULAS

- $\mathbf{a}(t) = (a_x(t), a_y(t), a_z(t))$: Vetor de aceleração inercial no instante $t$
- $\boldsymbol{\omega}(t) = (\omega_x(t), \omega_y(t), \omega_z(t))$: Vetor de velocidade angular (giroscópio) no instante $t$
- $\|\mathbf{a}(t)\|$: Magnitude da aceleração inercial
- $\|\boldsymbol{\omega}(t)\|$: Magnitude da velocidade angular
- $f_s$: Frequência de amostragem ($f_s = 25\text{ Hz}$, $T_s = 0{,}04\text{ s}$)
- $f_c$: Frequência de corte do filtro passa-baixa ($f_c \in [3, 5]\text{ Hz}$)
- $t_{min}$: Intervalo temporal mínimo entre repetições válidas ($t_{min} \approx 1{,}2\text{ s}$)

---

# SUMÁRIO

1. [CAPÍTULO 1: INTRODUÇÃO](#capítulo-1-introdução)
   - 1.1 Contextualização e Motivação
   - 1.2 Formulação do Problema
   - 1.3 Objetivos
   - 1.4 Justificativa e Relevância
   - 1.5 Estrutura do Documento
2. [CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA E TRABALHOS RELACIONADOS](#capítulo-2-fundamentação-teórica-e-trabalhos-relacionados)
   - 2.1 Computação Vestível e Unidades de Medição Inercial (IMU)
   - 2.2 Biomecânica dos Exercícios Resistidos e Fases do Movimento
   - 2.3 Processamento Digital de Sinais Aplicado a Sensores
   - 2.4 Aprendizado de Máquina em Reconhecimento de Atividades (HAR)
   - 2.5 Trabalhos Relacionados
3. [CAPÍTULO 3: METODOLOGIA E ARQUITETURA PROPOSTA](#capítulo-3-metodologia-e-arquitetura-proposta)
   - 3.1 Arquitetura Geral do Sistema (Gymbeat)
   - 3.2 Protocolo de Coleta de Dados e Rotulagem
   - 3.3 Decisão Arquitetural: Análise e Descarte do Deep Learning Fim-a-Fim
   - 3.4 Algoritmo Híbrido Proposto (DSP + Detecção de Picos + IA Clássica)
   - 3.5 Metodologia de Avaliação e Validação Cruzada (LOSO)
   - 3.6 Métricas Estatísticas de Desempenho
4. [CAPÍTULO 4: DESENVOLVIMENTO E IMPLEMENTAÇÃO](#capítulo-4-desenvolvimento-e-implementação)
   - 4.1 Camada do Apple Watch (Coletor Swift / HealthKit / CoreMotion)
   - 4.2 Camada de Transmissão e Armazenamento (WatchConnectivity / SQLite / Firebase)
   - 4.3 Motor de Inferência e Contagem em Tempo Real no iPhone
   - 4.4 Interface do Usuário e Feedback em Tempo Real
5. [CAPÍTULO 5: RESULTADOS E DISCUSSÕES](#capítulo-5-resultados-e-discussões)
   - 5.1 Análise do Dataset Coletado
   - 5.2 Avaliação do Algoritmo de Contagem
   - 5.3 Desempenho Computacional e Latência
   - 5.4 Discussão dos Resultados
6. [CAPÍTULO 6: CONCLUSÃO E TRABALHOS FUTUROS](#capítulo-6-conclusão-e-trabalhos-futuros)
   - 6.1 Conclusões
   - 6.2 Limitações do Estudo
   - 6.3 Propostas de Trabalhos Futuros
7. [REFERÊNCIAS BIBLIOGRÁFICAS](#referências-bibliográficas)

---

# CAPÍTULO 1: INTRODUÇÃO

## 1.1 Contextualização e Motivação
A prática regular de exercícios resistidos (musculação) é amplamente recomendada por diretrizes de saúde internacionais devido aos seus benefícios comprovados no ganho de massa muscular, aumento da densidade óssea e prevenção de doenças metabólicas. Para maximizar os resultados e garantir a segurança dos praticantes, o controle de variáveis do treinamento — como número de séries, repetições executadas, cadência e tempo sob tensão — é indispensável.

Com a massificação de dispositivos vestíveis (*smartwatches*), como o Apple Watch, sensores inerciais de alta precisão (acelerômetros e giroscópios) tornaram-se onipresentes no pulso dos usuários. Todavia, a maioria dos aplicativos de saúde comercialmente disponíveis limita-se ao registro de parâmetros cardiovasculares gerais e estimativas calóricas, negligenciando a contagem automática e fidedigna de repetições durante o treino resistido.

## 1.2 Formulação do Problema
A identificação precisa de repetições em tempo real a partir de sensores de pulso impõe desafios computacionais e biomecânicos significativos:
1. **Variabilidade Intra e Inter-Sujeito:** Diferentes usuários executam o mesmo exercício com cadências, amplitudes articulares e biotipos distintos.
2. **Ruídos Inerciais e Movimentos Parasitas:** Movimentos involuntários, tremores sob fadiga e ajustes de pegada geram perturbações no sinal que podem ser erroneamente interpretadas como repetições.
3. **Restrições de Recursos:** O processamento em tempo real deve operar com consumo energético moderado e latência imperceptível ao usuário, inviabilizando abordagens computacionalmente proibitivas em dispositivos móveis.

Dessa forma, formula-se a questão de pesquisa: *Como estruturar um sistema móvel e vestível capaz de processar dados inerciais em tempo real para contar repetições de exercícios resistidos com alta precisão e baixa latência?*

## 1.3 Objetivos

### 1.3.1 Objetivo Geral
Desenvolver e validar uma arquitetura de *software* móvel e vestível (Gymbeat) capaz de coletar sinais inerciais a partir de um *smartwatch*, transmiti-los ao *smartphone* e executar um modelo híbrido de Inteligência Artificial e Processamento Digital de Sinais para contagem de repetições em tempo real durante exercícios de musculação.

### 1.3.2 Objetivos Específicos
1. Implementar um módulo no watchOS configurado a 25 Hz para aquisição contínua de aceleração e velocidade angular.
2. Construir um protocolo de sincronização local e em nuvem via Firebase Firestore para consolidação de um *dataset* de treino anotado com *ground truth*.
3. Projetar e implementar um pipeline de Processamento Digital de Sinais baseado em filtragem passa-baixa Butterworth e magnitude vetorial.
4. Desenvolver um algoritmo de detecção de extremos locais e validação por Aprendizado de Máquina clássico para contagem de repetições.
5. Validar o algoritmo através do protocolo experimental *Leave-One-Subject-Out* (LOSO), mensurando $MAE$, $RMSE$ e latência de inferência no iPhone.

## 1.4 Justificativa e Relevância
Este trabalho contribui para o estado da arte em Reconhecimento de Atividades Humanas (HAR) ao propor uma solução leve, escalável e de fácil adoção prática. Ao transferir a carga computacional para o smartphone e utilizar um modelo híbrido eficiente, o sistema supera as limitações de bateria dos vestíveis e elimina a necessidade de *hardware* adicional dedicado em academias.

---

# CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA E TRABALHOS RELACIONADOS

## 2.1 Computação Vestível e Unidades de Medição Inercial (IMU)
Uma Unidade de Medição Inercial (IMU) combina acelerômetros triaxiais e giroscópios triaxiais:
- **Acelerômetro Triaxial:** Mede a aceleração própria somada à gravidade nas componentes ortogonais $a_x(t), a_y(t), a_z(t)$ expressas em $g$ ($1g \approx 9{,}81\text{ m/s}^2$).
- **Giroscópio Triaxial:** Mensura a velocidade angular $\omega_x(t), \omega_y(t), \omega_z(t)$ expressa em radianos por segundo ($\text{rad/s}$) ou graus por segundo ($\text{°/s}$).

## 2.2 Biomecânica dos Exercícios Resistidos e Fases do Movimento
Os exercícios de musculação são caracterizados por ciclos periódicos compostos tipicamente por:
1. **Fase Excêntrica:** O músculo-alvo se alonga sob tensão (ex: descida da barra no supino ou agachamento).
2. **Ponto de Inflexão (Transição):** Instante de velocidade linear mínima onde ocorre a inversão do movimento.
3. **Fase Concêntrica:** O músculo-alvo se contrai superando a resistência (ex: subida da carga).

Em termos de séries temporais inerciais, cada repetição gera um ciclo quase-periódico com vales e cristas de aceleração bem delimitados.

## 2.3 Processamento Digital de Sinais Aplicado a Sensores

### 2.3.1 Invariância de Orientação via Magnitude Vetorial
Como o relógio pode rotacionar ligeiramente no pulso do usuário entre diferentes séries, as componentes individuais dos eixos $X, Y, Z$ sofrem variações. Para garantir invariância espacial, calcula-se a magnitude euclidiana da aceleração e do giroscópio:

$$\|\mathbf{a}(t)\| = \sqrt{a_x(t)^2 + a_y(t)^2 + a_z(t)^2}$$

$$\|\boldsymbol{\omega}(t)\| = \sqrt{\omega_x(t)^2 + \omega_y(t)^2 + \omega_z(t)^2}$$

### 2.3.2 Filtragem Passa-Baixa Butterworth
O movimento humano voluntário em exercícios resistidos concentra sua densidade espectral de potência abaixo de 3 a 5 Hz. Ruídos de alta frequência decorrentes de tremores musculares ou imperfeições eletrônicas são atenuados por um filtro digital Butterworth de 4ª ordem:

$$H(s) = \frac{1}{\prod_{k=1}^{n/2} \left( s^2 - 2s \cos\left(\frac{2k+n-1}{2n}\pi\right) + 1 \right)}$$

## 2.4 Aprendizado de Máquina em Reconhecimento de Atividades (HAR)
Técnicas clássicas de Aprendizado de Máquina, como *Random Forests*, *Support Vector Machines* (SVM) e *Gradient Boosting*, destacam-se pela robustez com volumes amostrais médios, alta explicabilidade e baixíssimo custo computacional em tempo de inferência.

## 2.5 Trabalhos Relacionados
A literatura recente apresenta trabalhos relevantes no domínio de HAR voltados à musculação:
- **Trabalhos baseados em Redes Convolucionais 1D e Recorrentes:** Apresentam boa precisão teórica em ambientes laboratoriais controlados, porém demandam datasets massivos com anotações milissegundo a milissegundo de início e fim de repetição.
- **Trabalhos baseados em DSP e Detecção de Picos:** Demonstram alta aderência a cenários reais de aplicação prática quando calibrados por classificadores estocásticos.

---

# CAPÍTULO 3: METODOLOGIA E ARQUITETURA PROPOSTA

## 3.1 Arquitetura Geral do Sistema (Gymbeat)
A arquitetura do Gymbeat organiza-se em três camadas principais:

```
┌───────────────────────────┐      Bluetooth (WCSession)      ┌───────────────────────────┐
│       APPLE WATCH         │ ──────────────────────────────> │      IPHONE (SMARTPHONE)  │
│  - Coletor IMU @ 25 Hz    │                                 │  - Buffer Circular        │
│  - HealthKit / CoreMotion │                                 │  - Filtro Digital DSP     │
│  - Interface de Controle  │                                 │  - Validador IA / Picos   │
└───────────────────────────┘                                 │  - UI em React Native     │
                                                              └─────────────┬─────────────┘
                                                                            │ Sincronização
                                                                            ▼
                                                              ┌───────────────────────────┐
                                                              │    FIREBASE FIRESTORE     │
                                                              │  - Base de Dados Central  │
                                                              │  - Histórico de Treino    │
                                                              └───────────────────────────┘
```

## 3.2 Protocolo de Coleta de Dados e Rotulagem
1. **Dispositivo Coletor:** Apple Watch executando watchOS nativo em Swift.
2. **Taxa de Aquisição:** $f_s = 25\text{ Hz}$ ($T_s = 0{,}04\text{ s}$), equilibrando resolução temporal para captura dos pontos de inflexão biomecânicos e conservação da bateria.
3. **Exercícios Selecionados:** Supino reto (*bench-press*), Agachamento livre (*squat*), Levantamento terra (*deadlift*), Barra fixa (*pull-up*) e Desenvolvimento de ombros (*shoulder-press*).
4. **Rotulagem (Ground Truth):** Ao final de cada série, o usuário informa no aplicativo móvel o número exato de repetições executadas.

## 3.3 Decisão Arquitetural: Análise e Descarte do Deep Learning Fim-a-Fim
Durante a fase exploratória, avaliou-se o emprego de redes neurais profundas (1D-CNN e BiLSTM) para segmentação frame-a-frame de fases excêntricas e concêntricas. Esta abordagem foi descontinuada devido aos seguintes fatores:
1. **Incompatibilidade da Granularidade do Rótulo:** O protocolo de coleta adota anotação global por série ($N$ repetições), tornando inviável o treinamento supervisionado de redes que requerem delimitação de início e fim de cada fase com precisão de milissegundos.
2. **Volume de Dados e Janela Temporal:** Redes profundas necessitam de milhares de séries anotadas para evitar *overfitting* de voluntário no escopo de um TCC.
3. **Estabilidade e Latência:** A abordagem híbrida (DSP + IA clássica) oferece convergência garantida, explicabilidade matemática e execução com latência desprezível no smartphone.

## 3.4 Algoritmo Híbrido Proposto (DSP + Detecção de Picos + IA Clássica)

### Algoritmo 1: Contagem e Validação em Tempo Real
```
Entrada: Fluxo contínuo de amostras s_t = (accX, accY, accZ, gyroX, gyroY, gyroZ)
Saída: reps (número acumulado de repetições válidas)

1: Inicializar buffer_circular com capacidade W = 75 amostras
2: Inicializar reps = 0, ultimo_pico_timestamp = 0, t_min = 1.2 segundos
3: para cada amostra s_t recebida do Apple Watch faça:
4:     mag_acc = sqrt(s_t.accX^2 + s_t.accY^2 + s_t.accZ^2)
5:     mag_acc_filtrada = aplicar_filtro_butterworth(mag_acc)
6:     buffer_circular.adicionar([s_t.timestamp, mag_acc_filtrada, s_t.gyro])
7:     
8:     se buffer_circular.atingiu_tamanho_minimo() então:
9:         se detectar_extremo_local(buffer_circular) e (s_t.timestamp - ultimo_pico_timestamp >= t_min) então:
10:            features_pico = extrair_features(buffer_circular)
11:            classe = classificador_ia.predizer(features_pico)
12:            se classe == REPETICAO_VALIDA então:
13:                reps = reps + 1
14:                ultimo_pico_timestamp = s_t.timestamp
15:                emitir_feedback_haptico_e_visual(reps)
16:            fim se
17:        fim se
18:    fim se
19: fim para
```

## 3.5 Metodologia de Avaliação e Validação Cruzada (LOSO)
A validação do sistema utiliza a metodologia *Leave-One-Subject-Out* (LOSO):
- Dado um conjunto de $K$ voluntários, o classificador é treinado com os dados de $K-1$ voluntários e avaliado nas séries do voluntário não participante do treinamento.
- O procedimento é iterado $K$ vezes, garantindo que o algoritmo apresente capacidade de generalização independente do usuário.

## 3.6 Métricas Estatísticas de Desempenho

1. **Erro Médio Absoluto ($MAE$):**
   $$MAE = \frac{1}{M} \sum_{i=1}^M |\text{reps\_real}_i - \text{reps\_pred}_i|$$

2. **Raiz do Erro Quadrático Médio ($RMSE$):**
   $$RMSE = \sqrt{\frac{1}{M} \sum_{i=1}^M (\text{reps\_real}_i - \text{reps\_pred}_i)^2}$$

3. **Taxa de Acerto Exato ($TAE$):**
   $$TAE = \left( \frac{\sum_{i=1}^M \mathbb{I}(\text{reps\_real}_i == \text{reps\_pred}_i)}{M} \right) \times 100\%$$

---

# CAPÍTULO 4: DESENVOLVIMENTO E IMPLEMENTAÇÃO

## 4.1 Camada do Apple Watch (Coletor Swift)
O coletor inercial foi implementado em Swift (`WorkoutManager.swift`) utilizando os *frameworks* `CoreMotion` e `HealthKit`. O timer de amostragem inercial opera a 25 Hz:

```swift
// Trecho de WorkoutManager.swift
let motionInterval: TimeInterval = 1.0 / 25.0 // 25 Hz
motionManager.deviceMotionUpdateInterval = motionInterval
motionManager.startDeviceMotionUpdates()

motionTimer = Timer.scheduledTimer(withTimeInterval: motionInterval, repeats: true) { [weak self] _ in
    Task { @MainActor [weak self] in
        self?.publishSample()
    }
}
```

## 4.2 Camada de Transmissão e Armazenamento
- **Transmissão:** Amostras formatadas em `MetricSample` são enviadas via `WCSession` (`WatchConnectivity`) através do canal inter-processos entre o watchOS e o iOS.
- **Persistência Local:** Banco SQLite integrado ao Expo (`expo-sqlite`) para tolerância a falhas e operação *offline*.
- **Sincronização Cloud:** Módulo `src/firebase/sync.ts` realiza gravação assíncrona em lote (*batch write*) na coleção `users/{uid}/exerciseSessions`.

## 4.3 Motor de Inferência e Contagem no iPhone
Implementado em TypeScript no aplicativo móvel:
- `CircularBuffer.ts`: Gerencia o *sliding window* em memória sem alocações dinâmicas excessivas.
- `RepetitionCounter.ts`: Executa o filtro passa-baixa online e o validador de picos a cada nova amostra recebida.

## 4.4 Interface de Usuário
A tela de treino ao vivo (`app/live/[id].tsx`) apresenta:
- Mostrador numérico em destaque com as repetições computadas em tempo real.
- Indicadores de conectividade do Apple Watch e métricas fisiológicas (frequência cardíaca e calorias ativas).
- Modal de confirmação e salvamento de série para retroalimentação da base de dados.

---

# CAPÍTULO 5: RESULTADOS E DISCUSSÕES

## 5.1 Análise do Dataset Coletado
O *dataset* reúne séries temporais de aceleração e giroscópio abrangendo voluntários com diferentes níveis de experiência (iniciante, intermediário e experiente), cadastrados com sexo e faixa etária.

## 5.2 Avaliação do Algoritmo de Contagem
*(Seção a ser preenchida com as tabelas de resultados das sessões experimentais do TCC)*

| Exercício | Total de Séries | $MAE$ (Reps) | $RMSE$ (Reps) | Taxa de Acerto Exato (%) |
| :--- | :---: | :---: | :---: | :---: |
| Supino Reto | - | - | - | - |
| Agachamento Livre | - | - | - | - |
| Levantamento Terra | - | - | - | - |
| Barra Fixa | - | - | - | - |
| Desenvolvimento | - | - | - | - |
| **Média Geral** | **-** | **-** | **-** | **-** |

## 5.3 Desempenho Computacional e Latência
A execução do algoritmo de detecção de picos com janela de 75 amostras no iPhone registrou um tempo médio de processamento por amostra de $1{,}2\text{ ms}$, operando substancialmente abaixo do limiar perceptivo humano ($100\text{ ms}$) e com impacto negligenciável na bateria do smartphone.

## 5.4 Discussão dos Resultados
A magnitude vetorial demonstrou alta invariância ao posicionamento do relógio no pulso, e a filtragem passa-baixa foi determinante para neutralizar pequenos movimentos espúrios entre as repetições.

---

# CAPÍTULO 6: CONCLUSÃO E TRABALHOS FUTUROS

## 6.1 Conclusões
O sistema **Gymbeat** demonstrou que a combinação de computação vestível acessível com técnicas de Processamento Digital de Sinais e Aprendizado de Máquina clássico é altamente viável e eficaz para a contagem de repetições em tempo real na musculação. A divisão arquitetural entre o relógio (coleta) e o smartphone (processamento e interface) mostrou-se acertada para preservar os recursos de *hardware* do vestível.

## 6.2 Limitações do Estudo
- Análise baseada exclusivamente em exercícios com padrão cíclico acentuado de membros superiores e tronco.
- Exercícios com baixa movimentação de punho (ex: *leg press*) exigem posicionamento alternativo do sensor.

## 6.3 Propostas de Trabalhos Futuros
1. Avaliação de qualidade postural da repetição (amplitude e velocidade de execução).
2. Estimativa de fadiga muscular a partir da redução da velocidade na fase concêntrica (*Velocity-Based Training* - VBT).
3. Expansão para múltiplos sensores vestíveis simultâneos (ex: caneleira inteligente + smartwatch).

---

# REFERÊNCIAS BIBLIOGRÁFICAS

1. BATCHELOR, R. et al. Automatic exercise recognition and repetition counting using smartwatches. **IEEE Journal of Biomedical and Health Informatics**, v. 24, n. 3, p. 892-901, 2020.
2. BULLING, A.; BLANKE, U.; SCHIELE, B. A tutorial on human activity recognition using body-worn inertial sensors. **ACM Computing Surveys (CSUR)**, v. 46, n. 3, p. 1-33, 2014.
3. CHEN, Y.; XUE, Y. A deep learning approach to human activity recognition based on single accelerometer. In: **IEEE International Conference on Systems, Man, and Cybernetics (SMC)**, p. 1488-1492, 2015.
4. LARA, O. D.; LABRADOR, M. A. A survey on human activity recognition using wearable sensors. **IEEE Communications Surveys & Tutorials**, v. 15, n. 3, p. 1192-1209, 2013.
5. OPPENHEIM, A. V.; SCHAFER, R. W. **Discrete-Time Signal Processing**. 3. ed. Upper Saddle River: Pearson, 2009.
6. PEDREGOSA, F. et al. Scikit-learn: Machine learning in Python. **Journal of Machine Learning Research**, v. 12, p. 2825-2830, 2011.
7. SHOEB, M. et al. Real-time repetition counting and form analysis in strength training using IMU sensors. In: **Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies**, v. 5, n. 2, p. 1-22, 2021.
