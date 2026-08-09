import Foundation
import Combine
import WatchConnectivity

@MainActor
final class WatchSessionManager: NSObject, ObservableObject {
    @Published private(set) var state: WatchWorkoutState = .waiting
    @Published private(set) var isReachable = false
    @Published private(set) var isCompanionAppConnected = false
    @Published private(set) var exerciseName: String?
    @Published private(set) var currentSetIndex = 0

    private let workoutManager: WorkoutManager
    private var sessionId: String?
    private var exerciseId: String?
    private var setId: String?

    init(workoutManager: WorkoutManager) {
        self.workoutManager = workoutManager
        super.init()

        workoutManager.onSample = { [weak self] sample in
            Task { @MainActor in
                self?.send(sample: sample)
            }
        }

        activate()
    }

    private func activate() {
        guard WCSession.isSupported() else {
            state = .disconnected
            return
        }

        WCSession.default.delegate = self
        WCSession.default.activate()
        isReachable = WCSession.default.isReachable
    }

    private func handle(message: [String: Any]) {
        guard
            let typeValue = (message[WatchMessageKey.type] as? String) ?? (message[WatchMessageKey.command] as? String),
            let command = WatchCommand(rawValue: typeValue)
        else {
            sendError("Comando invalido recebido.")
            return
        }

        switch command {
        case .appHeartbeat:
            updateSelectedExercise(from: message)
            markCompanionAppConnected()
        case .startSession:
            markCompanionAppConnected()
            startSession(with: message)
        case .pauseSession:
            markCompanionAppConnected()
            pauseSession()
        case .resumeSession:
            markCompanionAppConnected()
            resumeSession()
        case .stopSession:
            markCompanionAppConnected()
            stopSession()
        case .startSet:
            markCompanionAppConnected()
            startSet(with: message)
        case .stopSet:
            markCompanionAppConnected()
            stopSet()
        }
    }

    private func acknowledgement() -> [String: Any] {
        [
            "type": "appConnection",
            "companionAppConnected": isCompanionAppConnected,
            "state": state.rawValue
        ]
    }

    private func markCompanionAppConnected() {
        isCompanionAppConnected = true
    }

    private func updateSelectedExercise(from message: [String: Any]) {
        if let nextExerciseName = message[WatchMessageKey.exerciseName] as? String {
            exerciseName = nextExerciseName
        }
    }

    private func startSession(with message: [String: Any]) {
        guard
            let nextSessionId = message[WatchMessageKey.sessionId] as? String,
            let nextExerciseId = message[WatchMessageKey.exerciseId] as? String
        else {
            sendError("startSession sem sessionId ou exerciseId.")
            return
        }

        sessionId = nextSessionId
        exerciseId = nextExerciseId
        exerciseName = message[WatchMessageKey.exerciseName] as? String
        setId = message[WatchMessageKey.setId] as? String
        currentSetIndex = message[WatchMessageKey.setIndex] as? Int ?? 1
        state = .collecting

        Task {
            do {
                try await workoutManager.start(sessionId: nextSessionId, setId: setId)
                sendState()
            } catch {
                await MainActor.run {
                    self.state = .waiting
                }
                sendError(error.localizedDescription)
            }
        }
    }

    private func pauseSession() {
        state = .paused
        workoutManager.pause()
        sendState()
    }

    private func resumeSession() {
        state = .collecting
        workoutManager.resume()
        sendState()
    }

    private func stopSession() {
        state = .waiting
        currentSetIndex = 0

        Task {
            await workoutManager.stop()
            sendState()
            sessionId = nil
            exerciseId = nil
            exerciseName = nil
            setId = nil
        }
    }

    private func startSet(with message: [String: Any]) {
        setId = message[WatchMessageKey.setId] as? String
        currentSetIndex = message[WatchMessageKey.setIndex] as? Int ?? (currentSetIndex + 1)
        workoutManager.updateSetId(setId)
        state = .collecting
        sendState()
    }

    private func stopSet() {
        state = .paused
        workoutManager.updateSetId(nil)
        sendState()
    }

    private func send(sample: MetricSample) {
        send(message: sample.asMessage())
    }

    private func sendState() {
        var message: [String: Any] = [
            WatchMessageKey.type: WatchOutgoingMessage.stateChanged.rawValue,
            WatchMessageKey.state: state.rawValue
        ]

        if let sessionId {
            message[WatchMessageKey.sessionId] = sessionId
        }

        if let setId {
            message[WatchMessageKey.setId] = setId
        }

        send(message: message)
    }

    private func sendError(_ value: String) {
        send(message: [
            WatchMessageKey.type: WatchOutgoingMessage.error.rawValue,
            WatchMessageKey.message: value
        ])
    }

    private func send(message: [String: Any]) {
        guard WCSession.default.activationState == .activated else {
            return
        }

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)
        } else {
            WCSession.default.transferUserInfo(message)
        }
    }
}

extension WatchSessionManager: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        Task { @MainActor in
            self.isReachable = session.isReachable
            if error != nil {
                self.state = .disconnected
            }
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            self.isReachable = session.isReachable
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            self.handle(message: message)
        }
    }

    nonisolated func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        Task { @MainActor in
            self.handle(message: message)
            replyHandler(self.acknowledgement())
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            self.handle(message: applicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        Task { @MainActor in
            self.handle(message: userInfo)
        }
    }
}
