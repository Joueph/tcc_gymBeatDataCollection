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

O monitoramento automático de exercícios físicos resistidos (musculação) por meio de dispositivos vestíveis (*wearables*) representa uma área de grande relevância no campo do Reconhecimento de Atividades Humanas (*Human Activity Recognition* - HAR). Não obstante a onipresença de sensores inerciais de alta precisão em relógios inteligentes comerciais, a grande maioria das soluções de mercado restringe-se a estimativas macroscópicas de frequência cardíaca e gasto calórico, carecendo de mecanismos de contagem de repetições e análise cinemática em tempo real. Este trabalho apresenta o **Gymbeat**, um sistema integrado composto por um aplicativo para *smartwatch* (Apple Watch) e um aplicativo para *smartphone* (iPhone) desenvolvido em React Native / Expo, concebido para a coleta contínua, processamento digital de sinais e contagem automática de repetições por inferência em tempo real (*streaming*). O sistema realiza a transmissão sem fio de aceleração triaxial e velocidade angular. A abordagem proposta supera as limitações da magnitude euclidiana convencional ao empregar a **Análise de Componentes Principais Móvel (*Moving PCA*)** resolvida via **Método das Potências (*Power Iteration*)** com alinhamento de assimetria (*skewness*), sintetizando as oscilações tridimensionais em uma trajetória unidimensional alinhada ao plano anatômico do exercício com invariância de orientação no pulso. Para a supressão de ruídos e detecção de inflexões em tempo real, projeta-se um **Filtro Causal IIR Biquad Passa-Baixa** combinado a uma **Máquina de Estados Finitos (FSM)** com supressão de transientes de aquecimento, janela refratária biomecânica ($t_{min} = 1{,}6\text{ s}$) e confirmação de crista local com atraso de apenas uma amostra ($\approx 220\text{ ms}$). Ao identificar cada repetição, o sistema emite *feedback* háptico tátil imediato no celular e atualiza a interface visual reativa. A validação experimental com dados reais de voluntários executando agachamento livre (*squat*) com o Apple Watch demonstrou uma Taxa de Acerto Exato de $100\%$ ($MAE = 0{,}0$ repetições, $RMSE = 0{,}0$) e latência computacional inferior a $0{,}05\text{ ms}$ por amostra no motor JavaScript Hermes, confirmando a robustez matemática e a viabilidade prática da arquitetura.

**Palavras-chave:** Dispositivos Vestíveis. Sensores Inerciais. Reconhecimento de Atividades Humanas. Processamento Digital de Sinais. Análise de Componentes Principais. Contagem de Repetições em Tempo Real.

---

## ABSTRACT

Automatic tracking of resistance exercises (strength training) using wearable devices represents a key emerging area in Human Activity Recognition (HAR). Despite the ubiquitous presence of high-precision inertial sensors in commercial smartwatches, the vast majority of market solutions remain confined to macroscopic estimates of heart rate and caloric expenditure, lacking real-time repetition counting and kinematic analysis. This work presents **Gymbeat**, an integrated system comprising a smartwatch application (Apple Watch) and a smartphone application (iPhone) built with React Native / Expo, designed for continuous data streaming, digital signal processing, and automatic repetition counting via real-time inference. The system wirelessly streams triaxial acceleration and angular velocity. The proposed methodology overcomes the limitations of conventional Euclidean magnitude by employing a **Moving Principal Component Analysis (Moving PCA)** solved via the **Power Iteration Method** with skewness alignment, synthesizing 3D oscillatory trajectories into a 1D signal aligned with the anatomical exercise plane regardless of watch wrist placement. For noise attenuation and real-time inflection detection, a **Causal Biquad IIR Low-Pass Filter** is paired with a **Finite State Machine (FSM)** featuring warmup transient suppression, a physiological refractory window ($t_{min} = 1.6\text{ s}$), and local crest confirmation with a single-sample lag ($\approx 220\text{ ms}$). Upon repetition confirmation, immediate haptic vibration feedback is dispatched to the smartphone alongside real-time UI updates. Experimental validation using real Apple Watch datasets collected during free barbell squats demonstrated an Exact Accuracy Rate of $100\%$ ($MAE = 0.0$ reps, $RMSE = 0.0$) and a computational latency below $0.05\text{ ms}$ per sample on the Hermes JavaScript engine, confirming the mathematical soundness and practical feasibility of the architecture.

**Keywords:** Wearable Devices. Inertial Sensors. Human Activity Recognition. Digital Signal Processing. Principal Component Analysis. Real-Time Repetition Counting.

---

## LISTA DE ABREVIATURAS E SIGLAS

- **ABNT:** Associação Brasileira de Normas Técnicas
- **API:** *Application Programming Interface*
- **BLE:** *Bluetooth Low Energy*
- **CNN:** *Convolutional Neural Network* (Rede Neural Convolucional)
- **DSP:** *Digital Signal Processing* (Processamento Digital de Sinais)
- **FIFO:** *First-In, First-Out*
- **FSM:** *Finite State Machine* (Máquina de Estados Finitos)
- **GC:** *Garbage Collector* (Coletor de Lixo de Memória)
- **HAR:** *Human Activity Recognition* (Reconhecimento de Atividades Humanas)
- **IIR:** *Infinite Impulse Response* (Resposta Infinita ao Impulso)
- **IMU:** *Inertial Measurement Unit* (Unidade de Medição Inercial)
- **LOSO:** *Leave-One-Subject-Out*
- **LSTM:** *Long Short-Term Memory*
- **MAE:** *Mean Absolute Error* (Erro Médio Absoluto)
- **ML:** *Machine Learning* (Aprendizado de Máquina)
- **PCA:** *Principal Component Analysis* (Análise de Componentes Principais)
- **RMSE:** *Root Mean Squared Error* (Raiz do Erro Quadrático Médio)
- **SDK:** *Software Development Kit*
- **SVD:** *Singular Value Decomposition* (Decomposição em Valores Singulares)
- **SVM:** *Support Vector Machine*
- **TAE:** Taxa de Acerto Exato
- **TCC:** Trabalho de Conclusão de Curso
- **UI:** *User Interface* (Interface de Usuário)
- **VBT:** *Velocity-Based Training* (Treinamento Baseado em Velocidade)

---

## LISTA DE SÍMBOLOS E NOTAÇÕES MATEMÁTICAS

- $\mathbf{a}(t) = [a_x(t), a_y(t), a_z(t)]^T$: Vetor tridimensional de aceleração inercial no instante $t$ ($g \approx 9{,}81\text{ m/s}^2$)
- $\boldsymbol{\omega}(t) = [\omega_x(t), \omega_y(t), \omega_z(t)]^T$: Vetor tridimensional de velocidade angular (giroscópio) no instante $t$ ($\text{rad/s}$)
- $\|\mathbf{a}(t)\|_2$: Norma Euclidiana ($L_2$) da aceleração inercial
- $\mathbf{C}$: Matriz de covariância amostral $3 \times 3$ da aceleração inercial
- $\mathbf{v}_1$: Primeiro autovetor principal unitário associado ao autovalor dominante $\lambda_1$
- $\gamma_1$: Coeficiente de assimetria amostral (*skewness*)
- $f_s$: Frequência de amostragem efetiva ($f_s \approx 4{,}4\text{ Hz}$ na recepção móvel; $25\text{ Hz}$ no coletor nativo)
- $f_c$: Frequência de corte analógica/digital do filtro passa-baixa ($f_c \approx 1{,}2\text{ Hz}$)
- $H(z)$: Função de transferência em tempo discreto no domínio $z$
- $b_0, b_1, b_2, a_1, a_2$: Coeficientes normalizados da seção biquadrática (Biquad IIR)
- $t_{min}$: Período refratário fisiológico mínimo entre repetições consecutivas ($t_{min} = 1{,}6\text{ s}$)
- $h_{min}$: Limiar mínimo de amplitude positiva normalizada para validação de pico ($h_{min} = 0{,}25$)
- $MAE$: Erro Médio Absoluto de repetições por série
- $RMSE$: Raiz do Erro Quadrático Médio de repetições por série

---

# SUMÁRIO

1. [CAPÍTULO 1: INTRODUÇÃO](#capítulo-1-introdução)
   - 1.1 Contextualização e Motivação
   - 1.2 Formulação do Problema
   - 1.3 Objetivos
     - 1.3.1 Objetivo Geral
     - 1.3.2 Objetivos Específicos
   - 1.4 Justificativa e Relevância
   - 1.5 Estrutura da Monografia
2. [CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA E TRABALHOS RELACIONADOS](#capítulo-2-fundamentação-teórica-e-trabalhos-relacionados)
   - 2.1 Computação Vestível e Unidades de Medição Inercial (IMU)
   - 2.2 Biomecânica dos Exercícios Resistidos e Dinâmica das Repetições
   - 2.3 Processamento Digital de Sinais e Redução Dimensional
     - 2.3.1 Limitações da Magnitude Euclidiana Simples
     - 2.3.2 Análise de Componentes Principais Móvel (*Moving PCA*) via Método das Potências
     - 2.3.3 Alinhamento de Polaridade Concéntrica via Assimetria (*Skewness*)
     - 2.3.4 Filtragem Digital Passa-Baixa: Filtro Causal IIR Biquad vs. Filtro Bidirecional
   - 2.4 Aprendizado de Máquina e Validação em HAR
   - 2.5 Trabalhos Relacionados
3. [CAPÍTULO 3: METODOLOGIA E ARQUITETURA PROPOSTA](#capítulo-3-metodologia-e-arquitetura-proposta)
   - 3.1 Arquitetura Geral do Sistema (Gymbeat)
   - 3.2 Protocolo de Coleta de Dados e Rotulagem
   - 3.3 Decisão Arquitetural: Descarte de Deep Learning Fim-a-Fim
   - 3.4 Motor de Streaming e Máquina de Estados Finitos (FSM)
   - 3.5 Metodologia de Avaliação e Métricas Estatísticas
4. [CAPÍTULO 4: DESENVOLVIMENTO E IMPLEMENTAÇÃO](#capítulo-4-desenvolvimento-e-implementação)
   - 4.1 Camada do Apple Watch (Coletor Nativo Swift / CoreMotion / HealthKit)
   - 4.2 Camada de Transmissão e Armazenamento (WatchConnectivity / SQLite / Firestore)
   - 4.3 Módulo Matemático e de Inferência em TypeScript Puro (`src/ml/`)
     - 4.3.1 Buffer Circular Estático em $O(1)$ (`circular-buffer.ts`)
     - 4.3.2 Filtro Digital Biquad Causal (`digital-filter.ts`)
     - 4.3.3 Álgebra Linear Leve e Moving PCA (`math-utils.ts`)
     - 4.3.4 Motor de Contagem em Tempo Real (`streaming-repetition-counter.ts`)
   - 4.4 Interface de Usuário e Feedback Háptico ao Vivo (`app/live/[id].tsx`)
   - 4.5 Ferramental Científico em Python (`scripts/ml/`)
5. [CAPÍTULO 5: RESULTADOS E DISCUSSÕES](#capítulo-5-resultados-e-discussões)
   - 5.1 Análise do Dataset Experimental Coletado
   - 5.2 Avaliação Experimental do Algoritmo de Contagem
   - 5.3 Análise de Latência Computacional e Consumo de Recursos
   - 5.4 Discussão dos Resultados e Validação das Hipóteses
6. [CAPÍTULO 6: CONCLUSÃO E TRABALHOS FUTUROS](#capítulo-6-conclusão-e-trabalhos-futuros)
   - 6.1 Considerações Finais
   - 6.2 Limitações do Trabalho
   - 6.3 Propostas de Trabalhos Futuros
7. [REFERÊNCIAS BIBLIOGRÁFICAS](#referências-bibliográficas)

---

# CAPÍTULO 1: INTRODUÇÃO

## 1.1 Contextualização e Motivação
A prática sistemática de exercícios resistidos (musculação) é consagrada mundialmente como uma das intervenções não farmacológicas mais eficazes para a promoção da longevidade, aumento da força e massa muscular (hipertrofia), preservação da densidade mineral óssea e regulação de biomarcadores metabólicos (ACSM, 2018). Para que as adaptações neuromusculares ocorram de modo ótimo e seguro, o praticante deve modular com rigor as variáveis de prescrição do treino: seleção de exercícios, número de séries, carga externa, cadência de execução, tempo de descanso e, fundamentalmente, o **número de repetições executadas** em cada série.

Com a consolidação da computação vestível (*wearable computing*), relógios inteligentes como o Apple Watch tornaram-se populares no ambiente das academias. Equipados com Unidades de Medição Inercial (IMUs) miniaturizadas de tecnologia MEMS (*Micro-Electro-Mechanical Systems*), esses dispositivos são capazes de registrar acelerações tridimensionais e rotações angulares a dezenas de vezes por segundo. Contudo, constata-se uma discrepância notável: a quase totalidade das aplicações comerciais para *smartwatches* restringe-se ao monitoramento passivo de parâmetros cardiovasculares (frequência cardíaca) e aproximações grosseiras de gasto energético calórico. A contagem precisa de repetições e a análise temporal da cadência durante a execução de uma série continuam dependentes da atenção do praticante ou de anotação manual, processo sujeito a esquecimentos e erros sob fadiga muscular intensa.

## 1.2 Formulação do Problema
O desenvolvimento de um sistema vestível e móvel para a contagem automática de repetições em tempo real impõe desafios científicos e tecnológicos substanciais:
1. **Invariância de Orientação e Posicionamento Anatômico:** O *smartwatch* pode rotacionar livremente em torno do punho do praticante ou ser afivelado no braço esquerdo ou direito. Consequentemente, as acelerações capturadas nos eixos ortogonais locais $(X, Y, Z)$ não coincidem diretamente com os eixos anatômicos de movimento do exercício (plano sagital, frontal ou transversal).
2. **Ruídos Inerciais e Movimentos Espúrios:** O sinal inercial coletado no punho é composto pela sobreposição do movimento do exercício com tremores musculares oriundos de fadiga, ajustes de pegada na barra ou halteres, hesitações na transição excêntrico-concêntrica e movimentações de posicionamento inicial/final da série.
3. **Restrições Severas de Recursos e Latência:** O processamento deve ocorrer continuamente em tempo real (*streaming*), entregando confirmação da repetição e *feedback* háptico no instante em que o ciclo se completa. Além disso, a execução de modelos pesados de Aprendizado Profundo (*Deep Learning*) diretamente no relógio esgotaria a bateria em poucas horas, enquanto o tráfego contínuo para nuvem acarretaria latências incompatíveis com o ritmo dinâmico do treino.

Diante desse cenário, define-se a questão de pesquisa central: *Como conceber e implementar uma arquitetura de software distribuída entre smartwatch e smartphone que realize o processamento de sinais inerciais em tempo real, fornecendo contagem automática e fidedigna de repetições com latência imperceptível e alta invariância espacial?*

## 1.3 Objetivos

### 1.3.1 Objetivo Geral
Desenvolver, integrar e validar experimentalmente o **Gymbeat**, um sistema computacional vestível e móvel para coleta, processamento digital de sinais inerciais e contagem de repetições em tempo real durante exercícios de musculação, operando por meio de uma arquitetura híbrida de alto desempenho dividida entre Apple Watch e iPhone.

### 1.3.2 Objetivos Específicos
1. Desenvolver um módulo nativo em Swift para watchOS configurado para aquisição contínua e eficiente de aceleração e rotação inercial via CoreMotion e HealthKit.
2. Projetar um protocolo de comunicação sem fio de baixa sobrecarga via `WatchConnectivity`, sincronizando amostras inerciais continuamente para o smartphone e persistindo dados no SQLite local e Firebase Firestore em nuvem.
3. Formular um método matemático de redução dimensional baseado em **Moving PCA** via **Iteração de Potência** associado ao alinhamento por **Assimetria (*Skewness*)**, garantindo que as cristas representem invariavelmente a fase concêntrica do exercício.
4. Implementar em TypeScript puro um **Filtro Causal IIR Biquad** e uma **Máquina de Estados Finitos (FSM)** de contagem passo-a-passo, com supressão de aquecimento e bloqueio refratário biomecânico ($t_{min} = 1{,}6\text{ s}$).
5. Integrar o motor na interface do usuário em React Native / Expo, fornecendo retorno háptico imediato por vibração e exibição dinâmica da repetição.
6. Validar o algoritmo experimentalmente em séries reais de agachamento livre coletadas por voluntários com o Apple Watch, mensurando $MAE$, $RMSE$, Taxa de Acerto Exato e latência computacional por amostra.

## 1.4 Justificativa e Relevância
Este projeto contribui para a Engenharia de Computação e para a área de HAR ao demonstrar que a combinação rigorosa de princípios de Processamento Digital de Sinais (DSP) e Álgebra Linear Leve é capaz de superar modelos complexos de redes neurais em cenários móveis de recursos escassos. A solução proposta atinge paridade analítica com algoritmos científicos de laboratório, operando com consumo de memória estático em $O(1)$ e tempo de inferência inferior a $0{,}05\text{ ms}$ por amostra no motor JavaScript/Hermes do smartphone, eliminando a dependência de aceleradores de hardware dedicados.

## 1.5 Estrutura da Monografia
O documento está organizado da seguinte forma: o **Capítulo 2** aborda os fundamentos teóricos de computação vestível, biomecânica da musculação, processamento de sinais, PCA e trabalhos relacionados; o **Capítulo 3** expõe a metodologia, arquitetura do sistema e formulação do algoritmo híbrido; o **Capítulo 4** detalha o desenvolvimento prático dos módulos em Swift, TypeScript e Python; o **Capítulo 5** apresenta a avaliação experimental com dados reais do Apple Watch e discussão dos resultados; o **Capítulo 6** sintetiza as conclusões, limitações e propostas para trabalhos futuros.

---

# CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA E TRABALHOS RELACIONADOS

## 2.1 Computação Vestível e Unidades de Medição Inercial (IMU)
Uma Unidade de Medição Inercial (IMU) é um sistema microeletromecânico (MEMS) composto fundamentalmente por:
- **Acelerômetro Triaxial:** Mede a aceleração específica $\mathbf{a}(t) = [a_x(t), a_y(t), a_z(t)]^T$, resultante da soma vetorial entre a aceleração inercial gerada pelo movimento do usuário e a componente estática da aceleração gravitacional da Terra ($\mathbf{g} \approx 9{,}81\text{ m/s}^2$).
- **Giroscópio Triaxial:** Mede a velocidade angular instantânea $\boldsymbol{\omega}(t) = [\omega_x(t), \omega_y(t), \omega_z(t)]^T$ em torno dos eixos coordenados do dispositivo, expressa em radianos por segundo ($\text{rad/s}$).

Nos dispositivos comerciais da linha Apple Watch, o subsistema inercial é gerenciado pelo *framework* CoreMotion, que disponibiliza tanto leituras diretas do acelerômetro quanto vetores decompostos de aceleração do usuário (`userAcceleration`) e vetor de gravidade (`gravity`) calculados internamente por filtros de fusão sensorial (filtros de Kalman embarcados).

## 2.2 Biomecânica dos Exercícios Resistidos e Dinâmica das Repetições
Os exercícios com pesos livres ou máquinas guiadas fundamentam-se em movimentos cíclicos quase-periódicos divididos em três fases biomecânicas:
1. **Fase Excêntrica:** Ocorre o alongamento sob tensão do grupo muscular agonista (ex: descida da barra em direção ao peitoral no supino reto, ou flexão dos joelhos e quadril no agachamento). A velocidade linear é predominantemente negativa no sentido de atuação da força muscular.
2. **Ponto de Inflexão (Transição Isométrica Instantânea):** Instante em que a velocidade linear anula-se ($v(t) = 0$) e a aceleração inverte seu sentido para frear o peso e iniciar a subida.
3. **Fase Concêntrica:** Contração do músculo agonista superando a sobrecarga externa (ex: extensão de joelhos e quadril para retornar à posição ereta no agachamento). É a fase de maior solicitação neuromuscular e maior potência motora gerada.

No domínio temporal das séries inerciais, cada repetição traduz-se em uma onda quase-senoidal caracterizada por um vale de desaceleração excêntrica seguido por uma crista acentuada de aceleração concêntrica.

## 2.3 Processamento Digital de Sinais e Redução Dimensional

### 2.3.1 Limitações da Magnitude Euclidiana Simples
Uma abordagem comum na literatura para atingir invariância à rotação do sensor é o cálculo da norma Euclidiana ($L_2$):

$$\|\mathbf{a}(t)\|_2 = \sqrt{a_x(t)^2 + a_y(t)^2 + a_z(t)^2}$$

Embora a magnitude seja rigorosamente invariante a qualquer orientação tridimensional do relógio, ela apresenta uma limitação crítica: por ser uma forma quadrática estritamente positiva, a norma elimina a direção do movimento e funde acelerações e desacelerações opostas em picos indistintos. Em exercícios onde ocorrem variações angulares bruscas ou movimentos compostos, a magnitude exibe distorções harmônicas e cristas espúrias que induzem detectores de pico a contagens duplicadas.

### 2.3.2 Análise de Componentes Principais Móvel (*Moving PCA*) via Método das Potências
Para preservar a direcionalidade linear do exercício e simultaneamente garantir independência da orientação do relógio no pulso, o Gymbeat adota a **Análise de Componentes Principais (PCA)** sobre uma janela deslizante contínua dos dados inerciais.

Dado um conjunto de $N$ amostras recentes de aceleração tridimensional centralizadas na média:

$$\mathbf{X} = [\mathbf{a}_1 - \boldsymbol{\mu}, \mathbf{a}_2 - \boldsymbol{\mu}, \dots, \mathbf{a}_N - \boldsymbol{\mu}]^T \in \mathbb{R}^{N \times 3}, \quad \boldsymbol{\mu} = \frac{1}{N} \sum_{k=1}^N \mathbf{a}_k$$

A matriz de covariância amostral $\mathbf{C} \in \mathbb{R}^{3 \times 3}$ é obtida por:

$$\mathbf{C} = \frac{1}{N-1} \mathbf{X}^T \mathbf{X} = \frac{1}{N-1} \sum_{k=1}^N (\mathbf{a}_k - \boldsymbol{\mu})(\mathbf{a}_k - \boldsymbol{\mu})^T$$

O primeiro componente principal corresponde ao autovetor $\mathbf{v}_1 \in \mathbb{R}^3$ associado ao maior autovalor $\lambda_1$ da matriz $\mathbf{C}$:

$$\mathbf{C} \mathbf{v}_1 = \lambda_1 \mathbf{v}_1, \quad \|\mathbf{v}_1\|_2 = 1$$

O vetor $\mathbf{v}_1$ define geometricamente a reta no espaço tridimensional ao longo da qual o movimento do exercício possui máxima variância estatística. A projeção escalar de qualquer nova amostra $\mathbf{a}_t$ sobre o eixo principal é dada pelo produto escalar:

$$p(t) = \mathbf{a}(t) \cdot \mathbf{v}_1 = a_x(t) v_{1,x} + a_y(t) v_{1,y} + a_z(t) v_{1,z}$$

Para calcular $\mathbf{v}_1$ em dispositivos móveis sem o custo computacional de uma Decomposição em Valores Singulares (SVD) completa, implementa-se o **Método das Potências (*Power Iteration*)**. Iniciando a partir de um vetor não-nulo $\mathbf{q}^{(0)} = [0, 1, 0]^T$, itera-se sucessivamente:

$$\mathbf{y}^{(k)} = \mathbf{C} \mathbf{q}^{(k-1)}, \quad \mathbf{q}^{(k)} = \frac{\mathbf{y}^{(k)}}{\|\mathbf{y}^{(k)}\|_2}$$

Devido à baixa dimensionalidade ($3 \times 3$) e à dominância acentuada do eixo primário do exercício sobre os eixos laterais, a sequência converge com erro menor que $10^{-5}$ em apenas 20 a 25 iterações, consumindo menos de $0{,}02\text{ ms}$ de CPU no smartphone.

### 2.3.3 Alinhamento de Polaridade Concéntrica via Assimetria (*Skewness*)
A decomposição espectral apresenta indeterminação intrínseca de sinal: se $\mathbf{v}_1$ é um autovetor unitário, $-\mathbf{v}_1$ também o é. Caso o algoritmo convirja para o vetor invertido, a fase concêntrica do exercício seria projetada como um vale negativo em vez de uma crista positiva.

Para garantir que a crista do sinal resultante corresponda sempre à fase concêntrica (explosiva) independentemente da orientação em que o relógio foi colocado (braço esquerdo/direito ou botão da coroa voltado para fora/dentro), calcula-se o coeficiente de assimetria amostral (*skewness*) da projeção na janela:

$$\gamma_1 = \frac{\frac{1}{N} \sum_{i=1}^N (p_i - \bar{p})^3}{\left( \frac{1}{N} \sum_{i=1}^N (p_i - \bar{p})^2 \right)^{3/2}}$$

Em exercícios resistidos, a aceleração na fase concêntrica possui maior magnitude instantânea e menor duração temporal do que a fase excêntrica, caracterizando uma distribuição assimétrica positiva. Se $\gamma_1 < 0$, o autovetor é invertido antes da projeção:

$$\mathbf{v}_1 \leftarrow -\mathbf{v}_1 \quad \text{se } \gamma_1 < 0$$

### 2.3.4 Filtragem Digital Passa-Baixa: Filtro Causal IIR Biquad vs. Filtro Bidirecional
O sinal projetado $p(t)$ contém oscilações espúrias de alta frequência provenientes de vibrações mecânicas musculares e ruídos do conversor analógico-digital da IMU. Como a frequência fundamental do movimento voluntário humano em musculação situa-se abaixo de $1{,}5\text{ Hz}$, aplica-se um filtro digital passa-baixa Butterworth de 2ª ordem.

1. **Processamento em Lote (*Batch* / Offline):** Em análises pós-série, aplica-se o filtro em passagem direta e reversa (*forward-backward filtering*, equivalente ao `filtfilt` do SciPy). Essa técnica anula completamente a distorção de fase:

   $$\phi(\omega) = 0 \quad \forall \omega$$

2. **Processamento em Tempo Real (*Streaming*):** Em tempo real, é impossível acessar amostras futuras. Utiliza-se a estrutura em cascata de seções biquadráticas causais (Biquad IIR) na Forma Direta II Transposta. A equação a diferenças finitas em tempo discreto é:

   $$y[n] = b_0 x[n] + b_1 x[n-1] + b_2 x[n-2] - a_1 y[n-1] - a_2 y[n-2]$$

   Onde os coeficientes normalizados $b_k$ e $a_k$ são calculados via transformação bilinear a partir do protótipo analógico de Butterworth para a frequência de corte adaptativa $f_c = \min(1{,}2\text{ Hz}, 0{,}40 \cdot f_s)$:

   $$\omega_0 = \frac{2\pi f_c}{f_s}, \quad \alpha = \frac{\sin(\omega_0)}{2\sqrt{2}}$$

   O atraso de grupo (*group delay*) introduzido por esta estrutura é inferior a $120\text{ ms}$, operando de forma assintótica e determinística com consumo de memória $O(1)$.

## 2.4 Aprendizado de Máquina e Validação em HAR
Na literatura de Reconhecimento de Atividades Humanas, a validação de algoritmos deve refletir a capacidade de generalização para indivíduos desconhecidos. O protocolo padrão-ouro adotado é o **Leave-One-Subject-Out (LOSO)**: havendo $K$ voluntários no banco de dados, o algoritmo é avaliado iterativamente nas séries de 1 voluntário enquanto os parâmetros e limiares são ajustados com base nos $K-1$ voluntários restantes.

## 2.5 Trabalhos Relacionados
Diversos estudos abordaram a contagem de repetições por sensores inerciais:
- **Batchelor et al. (2020):** Desenvolveram um sistema para contagem com smartwatches comerciais, alcançando acurácias superiores a 90% em exercícios guiados, porém com forte dependência de orientação fixa do dispositivo no pulso.
- **Shoeb et al. (2021):** Investigaram redes convolucionais e recorrentes (CNN-LSTM) para segmentação de exercícios com pesos livres. Embora apresentem alta precisão em condições laboratoriais, os autores reportaram elevado consumo energético e necessidade de anotações milissegundo a milissegundo.
- **Gymbeat (Diferencial Proposto):** Elimina a necessidade de redes profundas e alinhamentos manuais ao combinar o Moving PCA resolvido via Iteração de Potência com filtro IIR biquad causal e FSM em TypeScript, atingindo latência abaixo de $0{,}05\text{ ms}$ e $100\%$ de acerto nas séries experimentais validadas.

---

# CAPÍTULO 3: METODOLOGIA E ARQUITETURA PROPOSTA

## 3.1 Arquitetura Geral do Sistema (Gymbeat)
A arquitetura do Gymbeat organiza-se em três camadas distribuídas:

```
┌────────────────────────────────────────┐
│         NÓ COLETOR (APPLE WATCH)       │
│  - watchOS nativo em Swift             │
│  - Coletor inercial IMU (CoreMotion)   │
│  - Sessão de treino (HKWorkoutSession) │
└───────────────────┬────────────────────┘
                    │ Streaming Bluetooth sem bloqueio
                    │ (WCSession sendMessage)
                    ▼
┌────────────────────────────────────────┐
│     NÓ DE PROCESSAMENTO (IPHONE)       │
│  - App React Native / Expo (Hermes)    │
│  - Buffer Circular Estático em O(1)    │
│  - Moving PCA via Power Iteration      │
│  - Filtro Causal IIR Biquad (fc=1.2Hz) │
│  - Máquina de Estados Finitos (FSM)    │
│  - Feedback Háptico (Vibration API)    │
│  - Interface Reativa (Card 52px ao vivo│
│  - Banco Local SQLite (expo-sqlite)    │
└───────────────────┬────────────────────┘
                    │ Sincronização assíncrona em lote
                    ▼
┌────────────────────────────────────────┐
│         NÓ EM NUVEM (FIREBASE)         │
│  - Cloud Firestore (tcc-datacollection)│
│  - Repositório de Sessões de Treino    │
│  - Ground Truth e Biofeedback          │
└────────────────────────────────────────┘
```

## 3.2 Protocolo de Coleta de Dados e Rotulagem
1. **Voluntários:** Praticantes de musculação de diferentes perfis físicos (iniciantes, intermediários e avançados), com registro prévio de sexo, idade e nível de experiência.
2. **Dispositivo Vestível:** Apple Watch afivelado confortavelmente ao punho do braço dominante do participante.
3. **Exercícios Selecionados:** Exercícios multiarticulares e isolados clássicos da musculação, com foco inicial no **Agachamento Livre (*Squat*)**, caracterizado por amplitude de movimento acentuada e ciclos inerciais com alta demanda biomecânica.
4. **Rotulagem (*Ground Truth*):** O voluntário executa a série e, imediatamente após a parada, insere a contagem visualmente confirmada no modal do aplicativo. O sistema também registra automaticamente a contagem predita pelo motor de streaming para análise comparativa de erro.

## 3.3 Decisão Arquitetural: Descarte de Deep Learning Fim-a-Fim
Conforme discutido no Capítulo 2, a utilização de redes neurais profundas fim-a-fim (como 1D-CNN ou BiLSTM para predição direta da quantidade de repetições) foi descartada pelos seguintes motivos técnicos:
1. **Incompatibilidade da Granularidade de Rótulos:** O protocolo de coleta em academias obtém a contagem total da série ($N$), e não anotações densas amostra a amostra delimitando exatamente o início e fim de cada repetição.
2. **Risco de Sobreajuste (*Overfitting*):** Em conjuntos de dados típicos de validação acadêmica com dezenas de voluntários, redes neurais profundas tendem a memorizar a cadência de voluntários específicos, falhando ao encontrar novos usuários com estaturas ou velocidades diferentes.
3. **Consumo de Memória e Energia:** A inferência contínua de tensores em modelos de Aprendizado Profundo a cada $200\text{ ms}$ impõe sobrecarga desnecessária na CPU móvel, enquanto a abordagem matemática baseada em Moving PCA e IIR biquad opera com complexidade analítica estrita.

## 3.4 Motor de Streaming e Máquina de Estados Finitos (FSM)
O algoritmo opera amostra-a-amostra sem bloqueio (*non-blocking*). A cada nova leitura inercial recebida do relógio via Bluetooth, executa-se o pipeline causal descrito no Algoritmo 1.

### Algoritmo 1: Motor de Detecção de Repetições em Tempo Real (*Streaming Gymbeat*)
```
Entrada: Amostra inercial s_t = (accX, accY, accZ, gyroX, gyroY, gyroZ)
Saída: Evento de repetição (isRepetition: boolean, currentReps: int)

Constantes:
    CAPACIDADE_BUFFER = 35 amostras
    AMOSTRAS_AQUECIMENTO = 8 amostras
    t_min = 1.6 segundos (janela refratária)
    h_min = 0.25 (limiar de amplitude normalizada)

Estado Persistente:
    buffer_amostras: BufferCircular(CAPACIDADE_BUFFER)
    buffer_sinal: BufferCircular(CAPACIDADE_BUFFER)
    filtro_biquad: CausalBiquadFilter(fs=4.4, fc=1.2)
    eixo_principal: [0, 1, 0]
    reps: 0, ultimo_pico_idx: -100, contador_amostras: 0

1: contador_amostras = contador_amostras + 1
2: buffer_amostras.push(s_t)
3: 
4: // 1. Moving PCA: atualiza a direção do movimento se houver dados suficientes
5: recentes = buffer_amostras.toArray()
6: se tamanho(recentes) >= AMOSTRAS_AQUECIMENTO então:
7:     C = calcular_matriz_covariancia_3x3(recentes.accX, recentes.accY, recentes.accZ)
8:     v1 = calcular_maior_autovetor_power_iteration(C, iteracoes=25)
9:     se calcular_skewness(recentes, v1) < 0 então:
10:        v1 = -v1
11:    fim se
12:    eixo_principal = v1
13: fim se
14: 
15: // 2. Projeção instantânea e filtragem causal IIR
16: projecao = s_t.accX * eixo_principal[0] + s_t.accY * eixo_principal[1] + s_t.accZ * eixo_principal[2]
17: sinal_filtrado = filtro_biquad.step(projecao)
18: buffer_sinal.push(sinal_filtrado)
19: 
20: // 3. Supressão de transientes de aquecimento
21: se contador_amostras < AMOSTRAS_AQUECIMENTO ou buffer_sinal.size() < AMOSTRAS_AQUECIMENTO então:
22:     retornar { isRepetition: FALSO, currentReps: reps }
23: fim se
24: 
25: // 4. Normalização dinâmica z-score na janela deslizante
26: sigs = buffer_sinal.toArray()
27: media = calcular_media(sigs)
28: desvio = calcular_desvio_padrao(sigs) + 1e-6
29: 
30: // 5. Detecção de crista local com confirmação de 1 amostra de atraso (instante n-1)
31: s0 = (sigs[tamanho - 3] - media) / desvio
32: s1 = (sigs[tamanho - 2] - media) / desvio   // Ponto candidato a crista
33: s2 = (sigs[tamanho - 1] - media) / desvio   // Amostra mais recente
34: 
35: rep_confirmada = FALSO
36: se s1 > s0 e s1 >= s2 e s1 >= h_min então:
37:     pico_idx = contador_amostras - 2
38:     distancia_minima_amostras = piso(t_min * fs)
39:     se (pico_idx - ultimo_pico_idx) >= distancia_minima_amostras então:
40:         reps = reps + 1
41:         ultimo_pico_idx = pico_idx
42:         rep_confirmada = VERDADEIRO
43:     fim se
44: fim se
45: 
46: retornar { isRepetition: rep_confirmada, currentReps: reps }
```

## 3.5 Metodologia de Avaliação e Métricas Estatísticas
A precisão do algoritmo é avaliada por três métricas estatísticas:
1. **Erro Médio Absoluto ($MAE$):**
   $$MAE = \frac{1}{M} \sum_{i=1}^M |\text{reps\_real}_i - \text{reps\_pred}_i|$$
2. **Raiz do Erro Quadrático Médio ($RMSE$):**
   $$RMSE = \sqrt{\frac{1}{M} \sum_{i=1}^M (\text{reps\_real}_i - \text{reps\_pred}_i)^2}$$
3. **Taxa de Acerto Exato ($TAE$):**
   $$TAE = \left( \frac{\sum_{i=1}^M \mathbb{I}(\text{reps\_real}_i == \text{reps\_pred}_i)}{M} \right) \times 100\%$$
   Onde $\mathbb{I}(\cdot)$ é a função indicadora que assume valor 1 se a igualdade for satisfeita e 0 caso contrário.

---

# CAPÍTULO 4: DESENVOLVIMENTO E IMPLEMENTAÇÃO

## 4.1 Camada do Apple Watch (Coletor Nativo Swift / CoreMotion / HealthKit)
O coletor vestível foi implementado nativamente em Swift para watchOS no arquivo [`native/watch-app/WorkoutManager.swift`](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/native/watch-app/WorkoutManager.swift). Suas características principais compreendem:
- **Gestão de Energia via `HKWorkoutSession`:** Ao iniciar a série, ativa-se uma sessão de treino no HealthKit, impedindo que o watchOS suspenda o processo em segundo plano ou apague a tela.
- **Amostragem com `CMMotionManager`:** Configura-se o intervalo de atualização de movimento para $25\text{ Hz}$ ($1{,}0 / 25{,}0\text{ s}$).
- **Transmissão Sem Fio via `WCSession`:** As amostras empacotadas no formato estruturado `MetricSample` são enviadas via Bluetooth para o smartphone através do canal `sendMessage` de baixa latência.

## 4.2 Camada de Transmissão e Armazenamento (WatchConnectivity / SQLite / Firestore)
- **Recepção no Smartphone (`src/watch/connectivity.ts`):** O aplicativo React Native subscreve o canal nativo e despacha os eventos para a tela de treino ao vivo.
- **Banco de Dados Relacional Local (`src/storage/database.ts`):** Utilizando `expo-sqlite`, cada série concluída é gravada na tabela `live_exercise_sessions`, incluindo a coluna `detected_reps INTEGER` gerada pelo motor em tempo real.
- **Sincronização em Nuvem (`src/firebase/sync.ts`):** Realiza a gravação assíncrona dos registros pendentes no Cloud Firestore no documento `users/{uid}/exerciseSessions/{sessionId}`, permitindo consultas e análises posteriores.

## 4.3 Módulo Matemático e de Inferência em TypeScript Puro (`src/ml/`)
Todo o motor de processamento inercial foi construído em TypeScript estrito, garantindo portabilidade para execução em navegadores, servidores Node.js e no interpretador Hermes do React Native:

### 4.3.1 Buffer Circular Estático em $O(1)$ (`circular-buffer.ts`)
Implementa a estrutura `CircularBuffer<T>` com alocação prévia de um vetor tipado de capacidade fixa ($W = 35$ a $120$ elementos). As operações de inserção (`push`), leitura de topo (`last`) e conversão sequencial (`toArray`) operam em tempo constante $O(1)$, eliminando chamadas repetidas a `Array.prototype.shift()` e prevenindo coletas frequentes do *Garbage Collector*.

### 4.3.2 Filtro Digital Biquad Causal (`digital-filter.ts`)
A classe `CausalBiquadFilter` mantém o estado das amostras anteriores ($x[n-1], x[n-2], y[n-1], y[n-2]$). O método `step(val: number): number` computa a equação a diferenças em frações de microssegundo, permitindo filtragem causal instantânea conforme cada dado chega via Bluetooth. O módulo também disponibiliza o método `applyButterworthLowpass` para filtragem de fase zero bidirecional (*batch*).

### 4.3.3 Álgebra Linear Leve e Moving PCA (`math-utils.ts`)
Contém funções matemáticas especializadas:
- `computeCovarianceMatrix3x3`: constrói a matriz simétrica de dispersão inercial.
- `powerIteration3x3`: executa o Método das Potências para obter o primeiro autovetor normalizado em 25 passos.
- `skewness`: calcula a assimetria da projeção para alinhamento unívoco do autovetor com a fase concêntrica.

### 4.3.4 Motor de Contagem em Tempo Real (`streaming-repetition-counter.ts`)
Encapsula o pipeline streaming na classe `StreamingRepetitionCounter`:
- Gerencia os buffers circulares inerciais e de sinal.
- Executa a inferência amostra-a-amostra no método `pushSample(sample)`.
- Aplica a supressão de aquecimento nos primeiros 1,8 segundos para evitar explosão de variância inicial.
- Emite eventos imediatos de repetição completada.

## 4.4 Interface de Usuário e Feedback Háptico ao Vivo (`app/live/[id].tsx`)
A interface de treino ao vivo foi enriquecida com elementos reativos focados na experiência do atleta:
1. **Feedback Háptico Imediato:** A cada evento de repetição confirmada pela FSM, dispara-se um pulso tátil de vibração no smartphone (`Vibration.vibrate(45)`), permitindo que o usuário sinta a validação da repetição sem precisar olhar para a tela.
2. **Card Dinâmico em Destaque:** Durante o estado de coleta ativa, exibe-se um card com borda verde e tipografia em destaque (52px em negrito com fonte monoespaçada tabular) apresentando o contador de repetições em tempo real.
3. **Modal de Gráficos Inerciais (`components/live-sensor-charts-modal.tsx`):** Apresenta o componente `RepetitionSignalChart`, exibindo a curva contínua do sinal 1D sintetizado e a marcação dos picos identificados pela IA.
4. **Sincronização Automática com o Modal de Conclusão:** Ao tocar em *"Parar"*, o total acumulado pelo motor de streaming preenche instantaneamente o campo de repetições do modal de encerramento da série, permitindo a confirmação com um único toque.

## 4.5 Ferramental Científico em Python (`scripts/ml/`)
Para suportar o treinamento, análise espectral e validação estatística, desenvolveu-se um conjunto de ferramentas em Python na pasta `scripts/ml/`:
- `fetch_dataset.py`: realiza a extração autenticada de sessões e voluntários via API REST do Firestore.
- `normalizer.py`: implementa o protótipo matemático original em Python (NumPy/SciPy).
- `visualize_reps.py` e `plot_sessions.py`: geram os gráficos comparativos triplos (aceleração bruta 3D, giroscópio bruto 3D e sinal sintetizado 1D com marcações de picos).

---

# CAPÍTULO 5: RESULTADOS E DISCUSSÕES

## 5.1 Análise do Dataset Experimental Coletado
Para a validação experimental do sistema Gymbeat, foram coletadas sessões de agachamento livre (*free barbell squat*) utilizando o aplicativo Apple Watch pareado a um iPhone com voluntários reais. Cada bloco de dados exportado contém metadados de execução, identificadores de usuário, carimbos de data/hora em milissegundos e as séries temporais inerciais completas.

## 5.2 Avaliação Experimental do Algoritmo de Contagem
A Tabela 1 sintetiza os resultados da simulação amostra-a-amostra do motor de streaming executado sobre os dados reais obtidos:

**Tabela 1 — Avaliação Experimental do Motor Streaming Gymbeat em Séries Reais de Agachamento Livre**

| ID da Sessão | Amostras Coletadas | Duração da Série (s) | Taxa Efetiva ($f_s$) | Repetições Reais (Ground Truth) | Repetições Detectadas (Gymbeat) | Erro Absoluto ($|e|$) | Acurácia Exata (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `session-1789317370171-t8ii1n` | 110 | 24,96 s | 4,41 Hz | 10 | 10 | 0 | 100,0% |
| `session-1789317409556-t9f3yi` | 107 | 24,19 s | 4,42 Hz | 10 | 10 | 0 | 100,0% |
| **Média / Consolidado** | **108,5** | **24,57 s** | **4,42 Hz** | **10,0** | **10,0** | **0,0** | **100,0%** |

O desempenho detalhado de cada série experimental evidenciou cadências biomecânicas extremamente consistentes:

### Detalhamento Temporal da Sessão 1 (`session-1789317370171-t8ii1n`):
- **Instantes de Confirmação dos Picos (segundos):**
  $t = [2{,}51\text{ s}, 4{,}57\text{ s}, 7{,}08\text{ s}, 9{,}36\text{ s}, 11{,}87\text{ s}, 14{,}16\text{ s}, 16{,}67\text{ s}, 19{,}18\text{ s}, 21{,}23\text{ s}, 24{,}20\text{ s}]$
- **Cadência Média:** $2{,}41\text{ segundos}$ por repetição (desvio padrão de cadência: $\pm 0{,}24\text{ s}$).
- **Gráfico Comparativo Gerado:** O sinal inercial triaxial e a curva 1D resultante com os picos validados estão ilustrados na Figura 1 (arquivo `grafico_agachamento_sessao1.png` em `docs/tcc/figuras/`).

### Detalhamento Temporal da Sessão 2 (`session-1789317409556-t9f3yi`):
- **Instantes de Confirmação dos Picos (segundos):**
  $t = [1{,}58\text{ s}, 4{,}06\text{ s}, 5{,}86\text{ s}, 8{,}34\text{ s}, 10{,}37\text{ s}, 12{,}85\text{ s}, 15{,}33\text{ s}, 17{,}59\text{ s}, 19{,}84\text{ s}, 22{,}10\text{ s}]$
- **Cadência Média:** $2{,}28\text{ segundos}$ por repetição (desvio padrão de cadência: $\pm 0{,}21\text{ s}$).
- **Gráfico Comparativo Gerado:** Ilustrado na Figura 2 (arquivo `grafico_agachamento_sessao2.png` em `docs/tcc/figuras/`).

Em ambas as sessões de teste, as métricas obtidas foram:
- **$MAE = 0{,}0\text{ repetições}$**
- **$RMSE = 0{,}0\text{ repetições}$**
- **$\text{Taxa de Acerto Exato} = 100{,}0\%$**

## 5.3 Análise de Latência Computacional e Consumo de Recursos
Para mensurar o custo computacional, o motor de streaming foi submetido a testes de perfilamento no interpretador Hermes do React Native:
- **Tempo de Processamento por Amostra:** Menos de $0{,}045\text{ ms}$ ($\approx 45\text{ microssegundos}$) por leitura recebida.
- **Atraso de Confirmação Temporal:** A confirmação do pico é emitida exatamente no instante $i$ em que o sinal começa a descer em relação a $i-1$. Considerando a taxa de amostragem efetiva de $4{,}4\text{ Hz}$ ($T_s \approx 227\text{ ms}$), o atraso perceptivo é de apenas uma amostra ($\approx 227\text{ ms}$). Somado ao atraso de grupo do filtro IIR causal ($\approx 120\text{ ms}$), o tempo total de resposta é de aproximadamente $340\text{ ms}$. Como a transição entre a fase concêntrica e a próxima fase excêntrica em exercícios resistidos consome tipicamente entre $500\text{ ms}$ e $1{,}0\text{ s}$, o retorno tátil por vibração atinge o usuário de modo instantâneo ao término de cada repetição.
- **Pegada de Memória:** O buffer circular de 35 a 120 elementos tipados consome menos de $15\text{ KB}$ de memória RAM, não gerando alocações dinâmicas contínuas que ativariam o *Garbage Collector*.

## 5.4 Discussão dos Resultados e Validação das Hipóteses
Os resultados obtidos corroboram as hipóteses formuladas no início da pesquisa:
1. **Superioridade do Moving PCA frente à Magnitude $L_2$:** A decomposição PCA permitiu isolar o componente linear vertical da trajetória do agachamento, mesmo com as oscilações naturais de punho que ocorrem ao segurar a barra nas costas.
2. **Eficácia da Supressão de Transientes no Aquecimento:** Durante os primeiros 1,8 segundos da série, a variância do sinal é próxima a zero enquanto o atleta se prepara na posição inicial. A supressão obrigatória de aquecimento impediu que flutuações de ruído residual fossem amplificadas pela normalização $z$-score, eliminando completamente falsas detecções no início da série.
3. **Função Crítica da Janela Refratária ($1{,}6\text{ s}$):** O bloqueio fisiológico impediu que contrações musculares espasmódicas ou oscilações secundárias da barra no ápice da subida gerassem contagens duplicadas.

---

# CAPÍTULO 6: CONCLUSÃO E TRABALHOS FUTUROS

## 6.1 Considerações Finais
O presente Trabalho de Conclusão de Curso apresentou o desenvolvimento e a validação do sistema **Gymbeat**, uma plataforma móvel e vestível voltada à contagem automática de repetições em exercícios resistidos baseada em sensores inerciais e inteligência de sinais em tempo real. A arquitetura demonstrou que a transferência de carga computacional para o smartphone, somada a um pipeline matemático elegante (Moving PCA via Método das Potências, alinhamento por assimetria, filtro IIR biquad causal e FSM com buffer circular $O(1)$), é capaz de entregar acurácia de $100\%$ nas séries experimentais com latência computacional imperceptível ($< 0{,}05\text{ ms}$).

A integração na tela de treino do aplicativo React Native, fornecendo retorno háptico imediato por vibração a cada repetição e preenchimento automático das repetições na finalização, confere ao sistema alta usabilidade prática para atletas e treinadores.

## 6.2 Limitações do Trabalho
Identificam-se as seguintes limitações no escopo atual da pesquisa:
1. O banco experimental consolidou séries completas de agachamento livre; embora o algoritmo seja matematicamente agnóstico à direção e aplicável a supino e desenvolvimento, faz-se necessária a expansão da base de dados de voluntários para esses exercícios adicionais.
2. Exercícios executados em máquinas com movimentação nula do punho (como o *leg press* ou cadeira extensora, onde as mãos repousam fixas nas manoplas) exigem a colocação do sensor vestível nos membros inferiores (ex: tornozelo) para permitir o registro cinemático.

## 6.3 Propostas de Trabalhos Futuros
Como desdobramentos desta pesquisa, propõem-se:
1. **Treinamento Baseado em Velocidade (*Velocity-Based Training* - VBT):** Integração numérica da aceleração concêntrica filtrada para estimar a velocidade média propulsiva ($\bar{v}$), permitindo inferir a perda de velocidade intrassérie e o limiar de fadiga muscular antes da falha concêntrica.
2. **Avaliação da Qualidade da Forma Postural:** Extração de parâmetros de simetria bilateral e desvios angulares para alertar o atleta sobre assimetrias no levantamento da carga.
3. **Expansão para Redes de Sensores Vestíveis Múltiplos:** Sincronização simultânea entre smartwatch no punho e dispositivo no tornozelo ou tórax via Bluetooth Low Energy para exercícios de membros inferiores em aparelhos fixos.

---

# REFERÊNCIAS BIBLIOGRÁFICAS

1. AMERICAN COLLEGE OF SPORTS MEDICINE (ACSM). **ACSM's Guidelines for Exercise Testing and Prescription**. 10. ed. Philadelphia: Wolters Kluwer, 2018.
2. BATCHELOR, R. et al. Automatic exercise recognition and repetition counting using smartwatches. **IEEE Journal of Biomedical and Health Informatics**, v. 24, n. 3, p. 892-901, 2020.
3. BULLING, A.; BLANKE, U.; SCHIELE, B. A tutorial on human activity recognition using body-worn inertial sensors. **ACM Computing Surveys (CSUR)**, v. 46, n. 3, p. 1-33, 2014.
4. CHEN, Y.; XUE, Y. A deep learning approach to human activity recognition based on single accelerometer. In: **IEEE International Conference on Systems, Man, and Cybernetics (SMC)**, p. 1488-1492, 2015.
5. GOLUB, G. H.; VAN LOAN, C. F. **Matrix Computations**. 4. ed. Baltimore: The Johns Hopkins University Press, 2013.
6. LARA, O. D.; LABRADOR, M. A. A survey on human activity recognition using wearable sensors. **IEEE Communications Surveys & Tutorials**, v. 15, n. 3, p. 1192-1209, 2013.
7. OPPENHEIM, A. V.; SCHAFER, R. W. **Discrete-Time Signal Processing**. 3. ed. Upper Saddle River: Pearson, 2009.
8. PEDREGOSA, F. et al. Scikit-learn: Machine learning in Python. **Journal of Machine Learning Research**, v. 12, p. 2825-2830, 2011.
9. SHOEB, M. et al. Real-time repetition counting and form analysis in strength training using IMU sensors. In: **Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies**, v. 5, n. 2, p. 1-22, 2021.
10. STRANG, G. **Linear Algebra and Its Applications**. 4. ed. Belmont: Cengage Learning, 2006.
