// GymBeat — watchOS App
// Managers/SessionManager.swift
// Coordena o ciclo de vida completo de uma sessão de treino:
// buffer local → batching → envio ao iPhone via WatchConnectivity.
// Implementa o Protocolo de Telemetria definido em architecture.md §2.1.B.

import Foundation
import WatchConnectivity
import Combine

// MARK: - Session State

/*
 Enum name: SessionState
 Description: Máquina de estados da sessão de coleta no relógio.
 */
enum SessionState {
    case idle
    case active(exerciseID: ExerciseID)
    case sending
}

// MARK: - SessionManager

/*
 Class name: SessionManager
 Description: Orquestra a sessão de telemetria no watchOS.
              Responsabilidades:
              1. Receber comandos do smartphone (START, STOP, UPDATE_CONTEXT).
              2. Gerenciar o buffer local de TelemetrySamples.
              3. Enviar o lote completo ao iPhone ao fim de cada série.
              4. Emitir heartbeat de status a 1Hz para a UI do relógio.
 */
final class SessionManager: NSObject, ObservableObject {

    // MARK: - Published State (para SwiftUI)

    @Published var sessionState: SessionState = .idle
    @Published var currentHeartRate: Double? = nil
    @Published var bufferCount: Int = 0
    @Published var isPhoneReachable: Bool = false

    // MARK: - Private Properties

    private let sensorManager = SensorManager()
    private var sampleBuffer: [TelemetrySample] = []
    private var currentSessionID: String? = nil
    private let bufferQueue = DispatchQueue(label: "com.gymbeat.buffer", qos: .userInitiated)

    // MARK: - Init

    override init() {
        super.init()
        sensorManager.delegate = self
        activateWatchConnectivity()
    }

    // MARK: - WatchConnectivity Setup

    /*
     Function name: activateWatchConnectivity
     Function description: Ativa a sessão WCSession e define o delegate,
                           habilitando a comunicação bidirecional com o iPhone.
     Inputs: Nenhum
     Outputs: Void
     */
    private func activateWatchConnectivity() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - Session Control

    /*
     Function name: handleStartSession
     Function description: Processa o comando START_SESSION recebido do iPhone.
                           Limpa o buffer, armazena o sessionID, aplica o
                           handshake de tempo e inicia a coleta de sensores.
     Inputs:
       - payload: [String: Any] — mensagem WC com exerciseID, mode e systemTime
     Outputs: Void
     */
    private func handleStartSession(payload: [String: Any]) {
        guard
            let exerciseRaw = payload[WCMessageKey.exerciseID] as? String,
            let exercise = ExerciseID(rawValue: exerciseRaw)
        else { return }

        let isMotionEnabled = (payload[WCMessageKey.mode] as? String) == "full"
        currentSessionID = payload[WCMessageKey.sessionID] as? String ?? UUID().uuidString

        // Handshake de tempo: sincroniza o relógio com o systemTime do iPhone
        if let phoneTime = payload[WCMessageKey.systemTime] as? Double {
            applyTimeHandshake(phoneTimestamp: phoneTime)
        }

        bufferQueue.async { [weak self] in
            self?.sampleBuffer.removeAll()
        }

        DispatchQueue.main.async { [weak self] in
            self?.sessionState = .active(exerciseID: exercise)
            self?.bufferCount = 0
        }

        sensorManager.requestAuthorization { [weak self] granted, _ in
            guard granted else { return }
            self?.sensorManager.startCollection(for: exercise, isMotionEnabled: isMotionEnabled)
        }
    }

    /*
     Function name: handleStopSession
     Function description: Processa o comando STOP_SESSION. Para os sensores
                           e dispara o envio do lote de amostras ao iPhone.
     Inputs: Nenhum
     Outputs: Void
     */
    private func handleStopSession() {
        sensorManager.stopCollection()

        DispatchQueue.main.async { [weak self] in
            self?.sessionState = .sending
        }

        sendBatchToPhone()
    }

    /*
     Function name: handleUpdateContext
     Function description: Processa o comando UPDATE_CONTEXT para trocar de
                           exercício sem encerrar a sessão global. Reinicia
                           apenas o pipeline de sensores com o novo contexto.
     Inputs:
       - payload: [String: Any] — mensagem WC com o novo exerciseID e mode
     Outputs: Void
     */
    private func handleUpdateContext(payload: [String: Any]) {
        sensorManager.stopCollection()

        guard
            let exerciseRaw = payload[WCMessageKey.exerciseID] as? String,
            let exercise = ExerciseID(rawValue: exerciseRaw)
        else { return }

        let isMotionEnabled = (payload[WCMessageKey.mode] as? String) == "full"

        DispatchQueue.main.async { [weak self] in
            self?.sessionState = .active(exerciseID: exercise)
        }

        sensorManager.startCollection(for: exercise, isMotionEnabled: isMotionEnabled)
    }

    // MARK: - Time Synchronization

    /*
     Function name: applyTimeHandshake
     Function description: Calcula o offset entre o relógio interno do Watch
                           e o systemTime recebido do iPhone para mitigar
                           desvios de sincronização temporal (architecture.md §2.2).
     Inputs:
       - phoneTimestamp: Double — Unix Epoch em segundos do iPhone
     Outputs: Void
     Note: O offset é logado para análise posterior. Implementações avançadas
           podem ajustar o timestamp de cada amostra usando este delta.
     */
    private func applyTimeHandshake(phoneTimestamp: Double) {
        let watchTimestamp = Date().timeIntervalSince1970
        let offsetMs = (watchTimestamp - phoneTimestamp) * 1000
        print("[GymBeat] Time offset Watch↔iPhone: \(String(format: "%.2f", offsetMs))ms")
    }

    // MARK: - Batch Transmission

    /*
     Function name: sendBatchToPhone
     Function description: Serializa o buffer local de TelemetrySamples em
                           JSON e envia ao iPhone via WCSession.transferUserInfo
                           (garantia de entrega, mesmo fora de alcance imediato).
     Inputs: Nenhum
     Outputs: Void
     */
    private func sendBatchToPhone() {
        bufferQueue.async { [weak self] in
            guard let self = self else { return }

            let snapshot = self.sampleBuffer

            do {
                let encoder = JSONEncoder()
                let data = try encoder.encode(snapshot)
                let jsonString = String(data: data, encoding: .utf8) ?? "[]"

                let payload: [String: Any] = [
                    WCMessageKey.command: WCCommand.stopSession.rawValue,
                    WCMessageKey.sessionID: self.currentSessionID ?? "",
                    WCMessageKey.samples: jsonString
                ]

                // transferUserInfo garante entrega mesmo com BLE instável
                WCSession.default.transferUserInfo(payload)

                DispatchQueue.main.async {
                    self.sessionState = .idle
                    self.bufferCount = 0
                    self.sampleBuffer.removeAll()
                }

            } catch {
                print("[GymBeat] Erro ao serializar buffer: \(error)")
                DispatchQueue.main.async {
                    self.sessionState = .idle
                }
            }
        }
    }

    // MARK: - Heartbeat to Phone (1Hz status)

    /*
     Function name: sendHeartbeatToPhone
     Function description: Envia pequena mensagem de status ao iPhone a 1Hz
                           (architecture.md §2.1.B — Heartbeat de Status).
                           Usa sendMessage para baixa latência, sem garantia
                           de entrega (aceitável para dados de UI em tempo real).
     Inputs:
       - heartRate: Double? — bpm atual para exibição na tela do celular
     Outputs: Void
     */
    private func sendHeartbeatToPhone(heartRate: Double?) {
        guard WCSession.default.isReachable else { return }

        var payload: [String: Any] = [
            WCMessageKey.command: WCCommand.heartbeat.rawValue
        ]
        if let hr = heartRate {
            payload[WCMessageKey.heartRate] = hr
        }

        WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: { error in
            print("[GymBeat] Heartbeat error: \(error.localizedDescription)")
        })
    }
}

// MARK: - SensorManagerDelegate

extension SessionManager: SensorManagerDelegate {

    /*
     Function name: sensorManager(_:didCapture:)
     Function description: Recebe cada TelemetrySample do SensorManager,
                           adiciona ao buffer local thread-safe e atualiza
                           a UI. Dispara heartbeat se for amostra fisiológica.
     Inputs:
       - manager: SensorManager
       - sample: TelemetrySample — amostra capturada
     Outputs: Void
     */
    func sensorManager(_ manager: SensorManager, didCapture sample: TelemetrySample) {
        bufferQueue.async { [weak self] in
            self?.sampleBuffer.append(sample)

            DispatchQueue.main.async {
                self?.bufferCount = self?.sampleBuffer.count ?? 0
                if let hr = sample.hr {
                    self?.currentHeartRate = hr
                    self?.sendHeartbeatToPhone(heartRate: hr)
                }
            }
        }
    }

    func sensorManager(_ manager: SensorManager, didFailWith error: Error) {
        print("[GymBeat] SensorManager error: \(error.localizedDescription)")
    }
}

// MARK: - WCSessionDelegate

extension SessionManager: WCSessionDelegate {

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async { [weak self] in
            self?.isPhoneReachable = session.isReachable
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.isPhoneReachable = session.isReachable
        }
    }

    /*
     Function name: session(_:didReceiveMessage:)
     Function description: Ponto de entrada para todos os comandos enviados
                           pelo iPhone. Roteia para o handler correto com base
                           no campo "command" do payload.
     Inputs:
       - session: WCSession
       - message: [String: Any] — payload do smartphone
     Outputs: Void
     */
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard let commandRaw = message[WCMessageKey.command] as? String,
              let command = WCCommand(rawValue: commandRaw) else { return }

        DispatchQueue.main.async { [weak self] in
            switch command {
            case .startSession:
                self?.handleStartSession(payload: message)
            case .stopSession:
                self?.handleStopSession()
            case .updateContext:
                self?.handleUpdateContext(payload: message)
            case .timeHandshake:
                if let t = message[WCMessageKey.systemTime] as? Double {
                    self?.applyTimeHandshake(phoneTimestamp: t)
                }
            case .heartbeat:
                break // Watch não processa heartbeats do phone
            }
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        // Reservado para futuras transferências do iPhone → Watch
    }
}
