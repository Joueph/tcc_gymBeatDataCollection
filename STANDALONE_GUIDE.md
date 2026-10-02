# Guia de Build Standalone e Validade da Assinatura - GymBeat

Este documento reúne todas as diretrizes técnicas para compilar e executar o **GymBeat de forma 100% autônoma (sem Metro, sem Mac e sem internet)** no iPhone e no Apple Watch, além de alertar sobre a **data de expiração da conta Apple Developer**.

---

## 1. Por que o app dependia do Metro?

- **Modo Debug (`npm run ios` ou `npm run dev`):** O Xcode compila o binário com a flag `SKIP_BUNDLING=1`. No arquivo `AppDelegate.swift`, a condicional `#if DEBUG` faz o app requisitar o bundle JavaScript remotamente ao servidor Metro no Mac via rede local (`localhost:8081` ou IP local). Se o computador for desconectado ou o Wi-Fi oscilar, o app trava ou não abre.
- **Modo Release (`npm run ios:release`):** O Xcode executa a etapa nativa `Bundle React Native code and images` (`expo export:embed`), que compila o código TypeScript para **Hermes Bytecode** (`main.jsbundle`) e embute todos os assets na memória flash do iPhone. O app abre **instantaneamente e 100% offline**, sem nenhuma dependência do Mac ou do Metro.

---
◊
## 2. Autonomia do Apple Watch e Dados Locais

Durante a apresentação da banca:
1. **Comunicação iPhone ↔ Apple Watch:** Opera via framework `WatchConnectivity` por Bluetooth de baixa energia / conexão direta pareada entre os aparelhos. **Não consome internet nem precisa de rede externa.**
2. **Armazenamento de Dados:** As séries, repetições e métricas inerciais são gravadas no banco de dados local **SQLite** (`wearable-workout.db`).
3. **Resiliência do Firebase:** O sincronismo com Firebase foi implementado com estratégia *offline-first* (blocos `try/catch` com fallback). Na ausência de internet, os dados são preservados localmente no SQLite sem interromper a interface ou os treinos.

---

## 3. Como Gerar e Instalar a Build Standalone

Com o iPhone conectado via cabo ao Mac (e o Apple Watch pareado):

### Via Terminal (Recomendado)
Execute o script adicionado ao `package.json`:
```bash
npm run ios:release
```
*(Comando equivalente: `npx expo run:ios --configuration Release --device`)*

O Expo CLI detectará o dispositivo (**`Jose’s iPhone`**), compilará o bundle de produção, assinará o binário e instalará o app no iPhone junto com o **`WearableWorkoutWatch Watch App`** no Apple Watch.

### Via Xcode (Interface Gráfica)
1. Abra o projeto: `open ios/WearableWorkout.xcworkspace`
2. Selecione o Scheme **`WearableWorkout`** e o dispositivo **`Jose’s iPhone`**.
3. Acesse **`Product` > `Scheme` > `Edit Scheme...`** (ou pressione `Cmd + <`).
4. Na aba **`Run`** > **`Info`**, altere o **`Build Configuration`** de `Debug` para **`Release`**.
5. Pressione **`Cmd + R`** para compilar e instalar.

---

## 4. Alerta Crítico: Expiração da Assinatura Apple Developer (15/Out/2026)

> ⚠️ **Atenção:** Se a apresentação da banca for após o dia **15 de outubro de 2026**, **NÃO** confie em uma build instalada antes dessa data!

### Como funciona a validação da Apple:
1. Ao compilar o app para um dispositivo físico, o Xcode gera um perfil de provisionamento (`embedded.mobileprovision`).
2. A política da Apple determina que a data de expiração desse perfil **nunca pode ultrapassar a data de expiração da assinatura do desenvolvedor**.
3. Mesmo que o iPhone esteja offline ou em modo avião, o sistema do iOS (`amfid`) checa a data contra o relógio do sistema. Após o vencimento, **o app fecha instantaneamente na inicialização**.

### Cenários possíveis:

| Cenário | O que acontece | O que fazer |
| :--- | :--- | :--- |
| **Banca ATÉ 14/Out** | Sua assinatura paga atual está 100% ativa. O perfil gerado agora estará válido. | Pode compilar agora (`npm run ios:release`) e usar com tranquilidade. |
| **Banca APÓS 15/Out (Com renovação paga)** | A assinatura anual é renovada na Apple. O app antigo instalado antes da renovação ainda vence dia 15. | **Após o dia 15/out**, conecte o iPhone ao Mac e recompile (`npm run ios:release`) para gerar o novo perfil válido até 2027. |
| **Banca APÓS 15/Out (Sem renovação - Conta Gratuita)** | ⚠️ **ATENÇÃO:** O GymBeat **NÃO COMPILA NO PLANO GRATUITO**. O Apple Developer gratuito (*Personal Team*) bloqueia as capabilities de **HealthKit** e **HealthKit Background Delivery** do Apple Watch. O Xcode gerará erro de Code Signing. | **Obrigatório renovar a assinatura da Apple** se a apresentação com Apple Watch for após 15 de outubro de 2026. |

---

## 5. Checklist Pré-Banca (0 Falhas)

Antes de ir para a apresentação presencial:

- [ ] **Desconexão do Computador:** Desconecte o cabo USB e feche o Terminal e o Xcode.
- [ ] **Teste no Modo Avião:**
  1. Ative o **Modo Avião** no iPhone, mas mantenha o **Bluetooth ligado** (para falar com o relógio).
  2. Desconecte o Wi-Fi.
  3. Abra o GymBeat: ele deve abrir instantaneamente sem solicitar conexão ou servidor Metro.
- [ ] **Teste de Treino Completo Offline:**
  1. Inicie uma série de agachamento no iPhone.
  2. Abra o app no Apple Watch pareado e verifique se o status sincroniza.
  3. Faça algumas repetições para testar contagem e vibração háptica.
  4. Finalize o treino e confirme se ficou salvo no histórico local.
- [ ] **Regra de Ouro:** Faça a compilação final e o teste offline **1 ou 2 dias antes da banca**.

---

## 6. Solução de Problemas (Troubleshooting)

### Erro: `The developer disk image could not be mounted on this device` (Error Code 70)
Se ao rodar `npm run ios:release` o Xcode acusar:
```text
xcodebuild: error: Timed out waiting for all destinations matching the provided destination specifier to become available
{ platform:iOS, ..., error:The developer disk image could not be mounted on this device. }
```

**Causa:**
No iOS 17+, a Apple utiliza imagens dinâmicas de desenvolvedor (CoreDevice DDI). Se o iPhone foi reiniciado, reconectado via cabo ou o Xcode ficou fechado, o serviço de depuração pode não ter sido inicializado a tempo pelo `xcodebuild`.

**Solução rápida:**
1. Desbloqueie o iPhone (digite a senha numérica de desbloqueio).
2. Execute no terminal para forçar o CoreDevice a montar a imagem de depuração no iPhone:
   ```bash
   xcrun devicectl device info ddiServices --device $(xcrun devicectl list devices | grep iPhone | awk '{print $3}')
   ```
3. Se o Apple Watch também estiver pareado, ative nele também:
   ```bash
   xcrun devicectl device info ddiServices --device $(xcrun devicectl list devices | grep Watch | awk '{print $3}')
   ```
4. Em seguida, rode novamente:
   ```bash
   npm run ios:release
   ```
   *(Alternativa visual: abrir o app Xcode uma vez e aguardar a mensagem "Preparing Jose’s iPhone" sumir da barra de título do Xcode).*
