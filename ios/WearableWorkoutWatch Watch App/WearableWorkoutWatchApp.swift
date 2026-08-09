//
//  WearableWorkoutWatchApp.swift
//  WearableWorkoutWatch Watch App
//
//  Created by José Pascoal Martins on 23/05/26.
//

import SwiftUI

@main
struct WearableWorkoutWatch_Watch_AppApp: App {
    @StateObject private var workoutManager: WorkoutManager
    @StateObject private var sessionManager: WatchSessionManager

    init() {
        let workoutManager = WorkoutManager()
        _workoutManager = StateObject(wrappedValue: workoutManager)
        _sessionManager = StateObject(wrappedValue: WatchSessionManager(workoutManager: workoutManager))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(workoutManager)
                .environmentObject(sessionManager)
        }
    }
}
