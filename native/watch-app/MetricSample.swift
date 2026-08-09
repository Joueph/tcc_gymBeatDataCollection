import Foundation

struct MetricSample {
    let sessionId: String
    let setId: String?
    let timestamp: Date
    let heartRate: Double?
    let activeEnergyBurned: Double?
    let distance: Double?
    let stepCount: Double?
    let oxygenSaturation: Double?
    let accelerationX: Double?
    let accelerationY: Double?
    let accelerationZ: Double?
    let gyroscopeX: Double?
    let gyroscopeY: Double?
    let gyroscopeZ: Double?

    func asMessage() -> [String: Any] {
        var message: [String: Any] = [
            WatchMessageKey.type: WatchOutgoingMessage.metricSample.rawValue,
            WatchMessageKey.sessionId: sessionId,
            WatchMessageKey.timestamp: ISO8601DateFormatter().string(from: timestamp)
        ]

        if let setId {
            message[WatchMessageKey.setId] = setId
        }

        if let heartRate {
            message[WatchMessageKey.heartRate] = heartRate
        }

        if let activeEnergyBurned {
            message[WatchMessageKey.activeEnergyBurned] = activeEnergyBurned
        }

        if let distance {
            message[WatchMessageKey.distance] = distance
        }

        if let stepCount {
            message[WatchMessageKey.stepCount] = stepCount
        }

        if let oxygenSaturation {
            message[WatchMessageKey.oxygenSaturation] = oxygenSaturation
        }

        if let accelerationX {
            message[WatchMessageKey.accelerationX] = accelerationX
        }

        if let accelerationY {
            message[WatchMessageKey.accelerationY] = accelerationY
        }

        if let accelerationZ {
            message[WatchMessageKey.accelerationZ] = accelerationZ
        }

        if let gyroscopeX {
            message[WatchMessageKey.gyroscopeX] = gyroscopeX
        }

        if let gyroscopeY {
            message[WatchMessageKey.gyroscopeY] = gyroscopeY
        }

        if let gyroscopeZ {
            message[WatchMessageKey.gyroscopeZ] = gyroscopeZ
        }

        return message
    }
}
