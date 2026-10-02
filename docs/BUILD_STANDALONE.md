# Guia de Build Standalone (100% Offline / Sem Metro) - GymBeat

Este documento mapeia como gerar e executar a build de produção local (**Release**) do GymBeat no **iPhone e Apple Watch**, eliminando a dependência do servidor Metro, do Mac conectado e de conexão à internet para a apresentação da banca.

---

## 1. Diagnóstico: Por que o app dependia do Metro?

No ecossistema React Native / Expo:
- **Modo Debug (`npm run ios` ou `npm run dev`):** O Xcode compila a casca nativa do app com a flag `SKIP_BUNDLING=1`. No arquivo `AppDelegate.swift`, a diretiva `#if DEBUG` instrui o app a buscar o bundle JavaScript remotamente no servidor Metro via Wi-Fi/cabo (`localhost:8081` ou IP local). Se o computador for desconectado ou a rede oscilar, o app não carrega ou exibe erro de conexão.
- **Modo Release (`--configuration Release`):** O Xcode executa a etapa nativa `Bundle React Native code and images` (`expo export:embed`), que:
  1. Compila, minifica e converte todo o código TypeScript para **Hermes Bytecode** unificado (`main.jsbundle`).
  2. Empacota todas as imagens e assets estáticos dentro do executável (`.app`).
  3. No `AppDelegate.swift`, a instrução ativa é `Bundle.main.url(forResource: "main", withExtension: "jsbundle")`, lendo o código diretamente da memória flash do iPhone.
  4. O app abre **instantaneamente e 100% offline**, sem precisar de Mac, Metro, Wi-Fi ou internet.

---

## 2. Autonomia do Apple Watch e Dados Locais

Durante a apresentação da banca:
1. **Comunicação iPhone ↔ Apple Watch:** É realizada nativamente pelo framework `WatchConnectivity` via Bluetooth Low Energy (BLE) / Wi-Fi direto peer-to-peer pareado entre os dispositivos. **Não consome internet nem precisa de rede externa.**
2. **Armazenamento de Dados:** As séries, repetições e métricas inerciais são gravadas no banco de dados local **SQLite** (`wearable-workout.db`).
3. **Resiliência do Firebase:** O sincronismo com Firebase foi implementado com estratégia *offline-first* (blocos `try/catch` com fallback). Na ausência de internet, os dados são preservados localmente no SQLite sem interromper a interface ou os treinos.

---

## 3. Como Gerar e Instalar a Build Standalone no iPhone

Você tem duas formas de instalar a versão standalone no seu aparelho:

### Método A: Via Terminal (Mais Rápido e Direto)

Adicionamos o comando automatizado no [package.json](file:///Users/joueph/Developer/tcc-gymbeatDataCollection/package.json):

```bash
npm run ios:release
```

Ou diretamente via Expo CLI:
```bash
npx expo run:ios --configuration Release --device
```

*O CLI identificará seu dispositivo (ex.: `Jose’s iPhone`), compilará o bundle de produção, gerará o app iOS com o Watch App embutido e instalará diretamente no aparelho via cabo ou Wi-Fi local.*

---

### Método B: Diretamente via Xcode

1. Abra o workspace no Xcode:
   ```bash
   open ios/WearableWorkout.xcworkspace
   ```
2. Na barra superior do Xcode:
   - Selecione o Scheme **`WearableWorkout`** (Target do iPhone).
   - Selecione o seu dispositivo de destino: **`Jose’s iPhone`**.
3. No menu superior do Mac, acesse:
   - **`Product` > `Scheme` > `Edit Scheme...`** (ou pressione `Cmd + <`).
4. Na coluna esquerda, clique em **`Run`**:
   - Na aba **`Info`**, mude a opção **`Build Configuration`** de `Debug` para **`Release`**.
   - Certifique-se de que a opção *Debug executable* foi desmarcada automaticamente.
   - Clique em **`Close`**.
5. Clique no botão de **Play (`Cmd + R`)** para compilar e rodar.

> O Xcode compilará o bundle Hermes, assinará o app com sua conta de desenvolvimento (`DEVELOPMENT_TEAM = M4M9UUR2NT`), instalará a versão final no iPhone e enviará o `WearableWorkoutWatch Watch App` para o seu Apple Watch.

---

## 4. Checklist Pré-Banca (Garantia de 0 Falhas)

Antes de ir para a apresentação presencial, execute esta checagem no seu iPhone e Apple Watch:

- [ ] **Desconexão Total do Mac:** Desconecte o cabo USB e feche o Xcode / Terminal no Mac.
- [ ] **Teste no Modo Avião:**
  1. No iPhone, ative o **Modo Avião**, mas certifique-se de manter o **Bluetooth ativado** (para o Apple Watch se comunicar).
  2. Desconecte o Wi-Fi.
  3. Abra o app **GymBeat**: ele deve abrir instantaneamente na tela inicial sem telas vermelhas, sem barra de carregamento do Metro e sem solicitar endereço de servidor.
- [ ] **Teste de Treino Completo Offline:**
  1. Inicie um exercício de Agachamento no app do iPhone.
  2. Abra o app no Apple Watch pareado: verifique se o status entra em sincronia.
  3. Execute 3 ou 4 repetições para verificar o incremento do contador e vibração háptica.
  4. Finalize o treino e confirme se ele foi salvo no histórico local (SQLite).
- [ ] **Validade do Certificado de Desenvolvedor (Importante!):**
  - Se você usa uma conta gratuita da Apple (*Personal Team*), o perfil de provisionamento expira em **7 dias**.
  - **Recomendação:** Compile e instale a build no iPhone **1 ou 2 dias antes** da data da banca para garantir que a assinatura esteja 100% válida.
- [ ] **Ajustes de Confiança no iOS (se solicitado na primeira abertura):**
  - Vá em **Ajustes > Geral > Gestão de VPN e Dispositivos** e confirme a confiança no certificado de desenvolvedor.
  - Certifique-se de que o **Modo de Desenvolvedor** permanece ativo em **Ajustes > Privacidade e Segurança > Modo de Desenvolvedor**.
