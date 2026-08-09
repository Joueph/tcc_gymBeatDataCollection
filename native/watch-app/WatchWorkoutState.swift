import Foundation

enum WatchWorkoutState: String {
    case waiting
    case collecting
    case paused
    case disconnected

    var title: String {
        switch self {
        case .waiting:
            return "Inicie uma serie"
        case .collecting:
            return "Coletando dados"
        case .paused:
            return "Inicie uma serie"
        case .disconnected:
            return "Aguardando conexao"
        }
    }

    var systemImage: String {
        switch self {
        case .waiting:
            return "hourglass"
        case .collecting:
            return "heart.fill"
        case .paused:
            return "pause.fill"
        case .disconnected:
            return "iphone.slash"
        }
    }
}
