// GymBeat — watchOS App
// Models/TelemetrySample.swift
// Defines the core data structures for telemetry collection,
// aligned with the JSON schema defined in code_standards.md

import Foundation

// MARK: - Motion Data

/*
 Struct name: MotionSample
 Description: Encapsula os dados inerciais do acelerômetro e giroscópio
              capturados a ~50Hz durante exercícios alvo.
 */
struct MotionSample: Codable {
    let ax: Double  // Aceleração eixo X (m/s²)
    let ay: Double  // Aceleração eixo Y (m/s²)
    let az: Double  // Aceleração eixo Z (m/s²)
    let gx: Double  // Giroscópio eixo X (rad/s)
    let gy: Double  // Giroscópio eixo Y (rad/s)
    let gz: Double  // Giroscópio eixo Z (rad/s)
}

// MARK: - Telemetry Sample

/*
 Struct name: TelemetrySample
 Description: Unidade atômica de dados coletados pelo Apple Watch.
              Estrutura flat alinhada ao padrão do code_standards.md.
 Fields:
   - t: Timestamp em milissegundos (Unix Epoch)
   - hr: Frequência cardíaca em bpm (opcional — pode não estar disponível)
   - o2: Saturação de oxigênio SpO2 em % (opcional)
   - motion: Dados inerciais (opcional — só coletado em exercícios alvo)
 */
struct TelemetrySample: Codable {
    let t: Int64            // Timestamp ms
    let hr: Double?         // Heart rate (bpm)
    let o2: Double?         // SpO2 (%)
    let motion: MotionSample?

    /*
     Function name: init(timestamp:heartRate:oxygen:motion)
     Function description: Inicializa um TelemetrySample convertendo Date para ms.
     Inputs:
       - timestamp: Date — momento da coleta
       - heartRate: Double? — bpm do sensor HK
       - oxygen: Double? — SpO2 do sensor HK
       - motion: MotionSample? — dados inerciais (nil para sensores apenas fisiológicos)
     Outputs: TelemetrySample inicializado
     */
    init(timestamp: Date, heartRate: Double?, oxygen: Double?, motion: MotionSample?) {
        self.t = Int64(timestamp.timeIntervalSince1970 * 1000)
        self.hr = heartRate
        self.o2 = oxygen
        self.motion = motion
    }
}

// MARK: - Session Context

/*
 Enum name: ExerciseID
 Description: Identificadores dos exercícios alvo iniciais do sistema.
              Determina se o modo inercial deve ser ativado.
 */
enum ExerciseID: String, Codable, CaseIterable {
    case supino_reto
    case supino_inclinado
    case rosca_biceps
    case elevacao_lateral
    case abdominal

    /*
     Function name: requiresMotionTracking
     Function description: Retorna true se este exercício deve ativar
                           os sensores inerciais (acelerômetro/giroscópio).
     Inputs: Nenhum (self)
     Outputs: Bool
     */
    var requiresMotionTracking: Bool {
        switch self {
        case .supino_reto, .supino_inclinado, .rosca_biceps,
             .elevacao_lateral, .abdominal:
            return true
        }
    }

    var displayName: String {
        switch self {
        case .supino_reto:       return "Supino Reto"
        case .supino_inclinado:  return "Supino Inclinado"
        case .rosca_biceps:      return "Rosca Bíceps"
        case .elevacao_lateral:  return "Elevação Lateral"
        case .abdominal:         return "Abdominal"
        }
    }
}

// MARK: - WatchConnectivity Message Keys

/*
 Enum name: WCMessageKey
 Description: Chaves padronizadas para os payloads WatchConnectivity,
              evitando "magic strings" e garantindo consistência com o
              protocolo definido em architecture.md.
 */
enum WCMessageKey {
    static let command     = "command"
    static let exerciseID  = "exerciseID"
    static let mode        = "mode"
    static let systemTime  = "systemTime"
    static let heartRate   = "heartRate"
    static let samples     = "samples"
    static let sessionID   = "sessionID"
}

/*
 Enum name: WCCommand
 Description: Comandos trocados entre smartphone (controller) e Watch.
              Alinhado ao Protocolo de Controle da architecture.md.
 */
enum WCCommand: String {
    case startSession  = "START_SESSION"
    case stopSession   = "STOP_SESSION"
    case updateContext = "UPDATE_CONTEXT"
    case timeHandshake = "TIME_HANDSHAKE"
    case heartbeat     = "HEARTBEAT"
}
