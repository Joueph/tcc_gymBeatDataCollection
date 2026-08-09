import SwiftUI

struct WorkoutStatusView: View {
    let state: WatchWorkoutState
    let exerciseName: String?
    let setIndex: Int
    let heartRate: Double?
    let activeEnergyBurned: Double?
    let isCompanionAppConnected: Bool

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: state.systemImage)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(state == .collecting ? .red : .blue)

            Text(title)
                .font(.headline)
                .multilineTextAlignment(.center)

            Text(exerciseName ?? "Escolha um exercicio no iPhone")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            VStack(spacing: 4) {
                metricRow(label: "FC", value: heartRate.map { "\(Int($0.rounded())) bpm" } ?? "--")
                metricRow(label: "Kcal", value: activeEnergyBurned.map { String(format: "%.1f", $0) } ?? "--")
            }
            .padding(.top, 4)
        }
        .padding()
    }

    private var title: String {
        if !isCompanionAppConnected {
            return "Aguardando conexao"
        }

        if state == .collecting {
            return "Coletando dados"
        }

        return "Inicie uma serie"
    }

    private func metricRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .monospacedDigit()
        }
        .font(.caption)
    }
}

#Preview {
    WorkoutStatusView(
        state: .collecting,
        exerciseName: "Supino",
        setIndex: 1,
        heartRate: 118,
        activeEnergyBurned: 4.2,
        isCompanionAppConnected: true
    )
}
