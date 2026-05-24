import ExpoModulesCore
import WatchConnectivity

private let onWatchConnectivityChange = "onWatchConnectivityChange"
private let onWatchMessage = "onWatchMessage"

public class WatchConnectivityModule: Module {
  private var hasActivatedSession = false
  private lazy var sessionDelegate = WatchConnectivitySessionDelegate(module: self)

  public func definition() -> ModuleDefinition {
    Name("WearableWatchConnectivity")

    Events(onWatchConnectivityChange, onWatchMessage)

    OnCreate {
      self.activateSessionIfNeeded()
    }

    AsyncFunction("isSupported") { () -> Bool in
      return WCSession.isSupported()
    }

    AsyncFunction("getStatus") { () -> [String: Any] in
      self.activateSessionIfNeeded()
      return self.statusPayload()
    }

    AsyncFunction("sendCommand") { (command: String, payload: [String: Any], promise: Promise) in
      guard WCSession.isSupported() else {
        promise.reject("ERR_WATCH_UNSUPPORTED", "WatchConnectivity is not supported on this device.")
        return
      }

      self.activateSessionIfNeeded()

      var message = payload
      message["type"] = command
      message["command"] = command

      let session = WCSession.default
      if session.isReachable {
        session.sendMessage(message, replyHandler: { reply in
          promise.resolve([
            "delivered": true,
            "queued": false,
            "reply": reply,
            "status": self.statusPayload()
          ])
        }, errorHandler: { error in
          if command == "appHeartbeat" {
            promise.resolve([
              "delivered": false,
              "queued": false,
              "reply": [
                "companionAppConnected": false,
                "message": error.localizedDescription
              ],
              "status": self.statusPayload()
            ])
            return
          }
          promise.reject("ERR_WATCH_SEND", error.localizedDescription)
        })
      } else {
        if command == "appHeartbeat" {
          promise.resolve([
            "delivered": false,
            "queued": false,
            "reply": [
              "companionAppConnected": false
            ],
            "status": self.statusPayload()
          ])
          return
        }

        do {
          try session.updateApplicationContext(message)
          session.transferUserInfo(message)
          promise.resolve([
            "delivered": false,
            "queued": true,
            "status": self.statusPayload()
          ])
        } catch {
          promise.reject("ERR_WATCH_QUEUE", error.localizedDescription)
        }
      }
    }
  }

  private func activateSessionIfNeeded() {
    guard WCSession.isSupported(), !hasActivatedSession else {
      return
    }

    hasActivatedSession = true
    WCSession.default.delegate = sessionDelegate
    WCSession.default.activate()
  }

  fileprivate func statusPayload() -> [String: Any] {
    guard WCSession.isSupported() else {
      return [
        "isSupported": false,
        "activationState": "unsupported",
        "isPaired": false,
        "isWatchAppInstalled": false,
        "isReachable": false
      ]
    }

    let session = WCSession.default
    return [
      "isSupported": true,
      "activationState": activationStateName(session.activationState),
      "isPaired": session.isPaired,
      "isWatchAppInstalled": session.isWatchAppInstalled,
      "isReachable": session.isReachable
    ]
  }

  fileprivate func emitStatus() {
    DispatchQueue.main.async {
      self.sendEvent(onWatchConnectivityChange, self.statusPayload())
    }
  }

  fileprivate func emitMessage(_ message: [String: Any]) {
    DispatchQueue.main.async {
      self.sendEvent(onWatchMessage, self.normalizeMessage(message))
    }
  }

  private func normalizeMessage(_ message: [String: Any]) -> [String: Any] {
    var normalized = message
    if normalized["messageType"] == nil, let type = normalized["type"] {
      normalized["messageType"] = type
    }
    return normalized
  }

  private func activationStateName(_ state: WCSessionActivationState) -> String {
    switch state {
    case .activated:
      return "activated"
    case .inactive:
      return "inactive"
    case .notActivated:
      return "notActivated"
    @unknown default:
      return "unknown"
    }
  }

}

private class WatchConnectivitySessionDelegate: NSObject, WCSessionDelegate {
  weak var module: WatchConnectivityModule?

  init(module: WatchConnectivityModule) {
    self.module = module
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    module?.emitStatus()
    if let error {
      module?.emitMessage([
        "messageType": "error",
        "message": error.localizedDescription
      ])
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    module?.emitStatus()
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    module?.emitStatus()
  }

  func sessionDidDeactivate(_ session: WCSession) {
    module?.emitStatus()
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    module?.emitMessage(message)
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    module?.emitMessage(applicationContext)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    module?.emitMessage(userInfo)
  }
}
