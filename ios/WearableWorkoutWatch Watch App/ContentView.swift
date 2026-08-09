//
//  ContentView.swift
//  WearableWorkoutWatch Watch App
//
//  Created by José Pascoal Martins on 23/05/26.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var workoutManager: WorkoutManager
    @EnvironmentObject private var sessionManager: WatchSessionManager

    var body: some View {
        WorkoutStatusView(
            state: sessionManager.state,
            exerciseName: sessionManager.exerciseName,
            setIndex: sessionManager.currentSetIndex,
            heartRate: workoutManager.latestSample?.heartRate,
            activeEnergyBurned: workoutManager.latestSample?.activeEnergyBurned,
            isCompanionAppConnected: sessionManager.isCompanionAppConnected
        )
        .task {
            await workoutManager.requestAuthorizationIfNeeded()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WorkoutManager())
        .environmentObject(WatchSessionManager(workoutManager: WorkoutManager()))
}
