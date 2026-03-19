// GymBeat — watchOS App
// Views/ContentView.swift
// Interface principal do Apple Watch — minimalista e legível
// durante exercícios. Exibe estado da sessão, BPM e contador de amostras.

import SwiftUI

// MARK: - ContentView

struct ContentView: View {

    @StateObject private var sessionManager = SessionManager()

    var body: some View {
        Group {
            switch sessionManager.sessionState {
            case .idle:
                IdleView(isReachable: sessionManager.isPhoneReachable)

            case .active(let exerciseID):
                ActiveSessionView(
                    exerciseName: exerciseID.displayName,
                    heartRate: sessionManager.currentHeartRate,
                    sampleCount: sessionManager.bufferCount
                )

            case .sending:
                SendingView(sampleCount: sessionManager.bufferCount)
            }
        }
        .environmentObject(sessionManager)
    }
}

// MARK: - Idle View

/*
 View name: IdleView
 Description: Tela de espera — exibe status da conexão com o iPhone.
              Informa ao usuário que a sessão deve ser iniciada pelo app.
 */
struct IdleView: View {
    let isReachable: Bool

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "applewatch.radiowaves.left.and.right")
                .font(.system(size: 32))
                .foregroundColor(isReachable ? .green : .gray)

            Text("GymBeat")
                .font(.headline)
                .fontWeight(.bold)

            Text(isReachable ? "Conectado" : "Aguardando iPhone")
                .font(.caption2)
                .foregroundColor(isReachable ? .green : .secondary)
                .multilineTextAlignment(.center)

            if !isReachable {
                Text("Abra o app no iPhone para iniciar")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
            }
        }
        .padding()
    }
}

// MARK: - Active Session View

/*
 View name: ActiveSessionView
 Description: Tela principal durante coleta. Exibe o exercício atual,
              BPM em destaque e contador de amostras no buffer local.
              Atualizada a 1Hz pelo heartbeat do SensorManager.
 */
struct ActiveSessionView: View {
    let exerciseName: String
    let heartRate: Double?
    let sampleCount: Int

    var body: some View {
        VStack(spacing: 6) {
            // Exercício atual
            Text(exerciseName)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.orange)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Divider()

            // BPM em destaque
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                    .font(.caption)

                if let hr = heartRate {
                    Text(String(format: "%.0f", hr))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.red)
                } else {
                    Text("--")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Text("bpm")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 4)
            }

            // Contador de amostras no buffer
            HStack(spacing: 4) {
                Image(systemName: "waveform")
                    .font(.caption2)
                    .foregroundColor(.blue)
                Text("\(sampleCount) amostras")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Indicador de gravação
            RecordingIndicator()
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - Recording Indicator

/*
 View name: RecordingIndicator
 Description: Ponto pulsante vermelho que indica gravação ativa,
              semelhante ao padrão watchOS de gravação de treino.
 */
struct RecordingIndicator: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color.red)
                .frame(width: 6, height: 6)
                .opacity(isAnimating ? 0.2 : 1.0)
                .animation(
                    .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                    value: isAnimating
                )

            Text("REC")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.red)
        }
        .onAppear { isAnimating = true }
    }
}

// MARK: - Sending View

/*
 View name: SendingView
 Description: Tela transitória exibida enquanto o lote de dados é
              serializado e transferido para o iPhone via WatchConnectivity.
 */
struct SendingView: View {
    let sampleCount: Int

    var body: some View {
        VStack(spacing: 10) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.2)

            Text("Enviando dados")
                .font(.headline)

            Text("\(sampleCount) amostras")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}
