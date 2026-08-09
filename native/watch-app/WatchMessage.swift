import Foundation

enum WatchCommand: String {
    case appHeartbeat
    case startSession
    case pauseSession
    case resumeSession
    case stopSession
    case startSet
    case stopSet
}

enum WatchOutgoingMessage: String {
    case stateChanged
    case metricSample
    case error
}

enum WatchMessageKey {
    static let type = "type"
    static let command = "command"
    static let sessionId = "sessionId"
    static let exerciseId = "exerciseId"
    static let exerciseName = "exerciseName"
    static let setId = "setId"
    static let setIndex = "setIndex"
    static let timestamp = "timestamp"
    static let state = "state"
    static let heartRate = "heartRate"
    static let activeEnergyBurned = "activeEnergyBurned"
    static let distance = "distance"
    static let stepCount = "stepCount"
    static let oxygenSaturation = "oxygenSaturation"
    static let accelerationX = "accelerationX"
    static let accelerationY = "accelerationY"
    static let accelerationZ = "accelerationZ"
    static let gyroscopeX = "gyroscopeX"
    static let gyroscopeY = "gyroscopeY"
    static let gyroscopeZ = "gyroscopeZ"
    static let message = "message"
}
