import Foundation
import Combine
import CoreMotion
import HealthKit

@MainActor
final class WorkoutManager: NSObject, ObservableObject {
    @Published private(set) var latestSample: MetricSample?
    @Published private(set) var authorizationGranted = false

    var onSample: ((MetricSample) -> Void)?

    private let healthStore = HKHealthStore()
    private let motionManager = CMMotionManager()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    private var motionTimer: Timer?
    private var sessionId: String?
    private var setId: String?
    private var latestOxygenSaturation: Double?
    private var lastOxygenSaturationRefreshAt: Date?

    func requestAuthorizationIfNeeded() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationGranted = false
            return
        }

        let types = readTypes()

        do {
            try await healthStore.requestAuthorization(toShare: [HKObjectType.workoutType()], read: types)
            authorizationGranted = true
        } catch {
            authorizationGranted = false
        }
    }

    func start(sessionId: String, setId: String?) async throws {
        await requestAuthorizationIfNeeded()

        self.sessionId = sessionId
        self.setId = setId

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .functionalStrengthTraining
        configuration.locationType = .indoor

        let workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
        let workoutBuilder = workoutSession.associatedWorkoutBuilder()

        workoutBuilder.dataSource = HKLiveWorkoutDataSource(
            healthStore: healthStore,
            workoutConfiguration: configuration
        )
        workoutSession.delegate = self
        workoutBuilder.delegate = self

        self.workoutSession = workoutSession
        self.workoutBuilder = workoutBuilder

        let startDate = Date()
        workoutSession.startActivity(with: startDate)
        try await workoutBuilder.beginCollection(at: startDate)
        startMotionCollection()
    }

    func pause() {
        workoutSession?.pause()
    }

    func resume() {
        workoutSession?.resume()
    }

    func stop() async {
        let endDate = Date()
        workoutSession?.end()

        do {
            try await workoutBuilder?.endCollection(at: endDate)
            _ = try await workoutBuilder?.finishWorkout()
        } catch {
            // The iPhone is the source of truth for MVP samples; finishing HKWorkout may fail on early prototypes.
        }

        stopMotionCollection()
        workoutSession = nil
        workoutBuilder = nil
        sessionId = nil
        setId = nil
        latestSample = nil
        latestOxygenSaturation = nil
        lastOxygenSaturationRefreshAt = nil
    }

    func updateSetId(_ setId: String?) {
        self.setId = setId
    }

    private func readTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]

        [
            HKQuantityTypeIdentifier.heartRate,
            HKQuantityTypeIdentifier.activeEnergyBurned,
            HKQuantityTypeIdentifier.stepCount,
            HKQuantityTypeIdentifier.distanceWalkingRunning,
            HKQuantityTypeIdentifier.oxygenSaturation
        ].forEach { identifier in
            if let type = HKObjectType.quantityType(forIdentifier: identifier) {
                types.insert(type)
            }
        }

        return types
    }

    private func makeSample(from statistics: HKStatisticsCollection?) -> MetricSample? {
        guard let sessionId else {
            return nil
        }

        let motion = motionManager.deviceMotion

        return MetricSample(
            sessionId: sessionId,
            setId: setId,
            timestamp: Date(),
            heartRate: quantityValue(for: .heartRate, unit: HKUnit.count().unitDivided(by: .minute()), average: true),
            activeEnergyBurned: quantityValue(for: .activeEnergyBurned, unit: .kilocalorie(), average: false),
            distance: quantityValue(for: .distanceWalkingRunning, unit: .meter(), average: false),
            stepCount: quantityValue(for: .stepCount, unit: .count(), average: false),
            oxygenSaturation: latestOxygenSaturation,
            accelerationX: motion?.userAcceleration.x,
            accelerationY: motion?.userAcceleration.y,
            accelerationZ: motion?.userAcceleration.z,
            gyroscopeX: motion?.rotationRate.x,
            gyroscopeY: motion?.rotationRate.y,
            gyroscopeZ: motion?.rotationRate.z
        )
    }

    private func quantityValue(
        for identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        average: Bool
    ) -> Double? {
        guard
            let type = HKObjectType.quantityType(forIdentifier: identifier),
            let statistics = workoutBuilder?.statistics(for: type)
        else {
            return nil
        }

        let quantity = average ? statistics.averageQuantity() : statistics.sumQuantity()
        return quantity?.doubleValue(for: unit)
    }

    private func publishSample() {
        refreshOxygenSaturationIfNeeded()

        guard let sample = makeSample(from: nil) else {
            return
        }

        latestSample = sample
        onSample?(sample)
    }

    private func startMotionCollection() {
        guard motionManager.isDeviceMotionAvailable else {
            return
        }

        // Frequência de 25 Hz (0.04s) recomendada para captura de detalhes inerciais para IA de movimento
        let motionInterval: TimeInterval = 1.0 / 25.0
        motionManager.deviceMotionUpdateInterval = motionInterval
        motionManager.startDeviceMotionUpdates()

        motionTimer?.invalidate()
        motionTimer = Timer.scheduledTimer(withTimeInterval: motionInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.publishSample()
            }
        }
    }

    private func stopMotionCollection() {
        motionTimer?.invalidate()
        motionTimer = nil
        motionManager.stopDeviceMotionUpdates()
    }

    private func refreshOxygenSaturationIfNeeded() {
        let now = Date()
        if let lastOxygenSaturationRefreshAt, now.timeIntervalSince(lastOxygenSaturationRefreshAt) < 30 {
            return
        }

        guard let type = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) else {
            return
        }

        lastOxygenSaturationRefreshAt = now
        let predicate = HKQuery.predicateForSamples(
            withStart: now.addingTimeInterval(-6 * 60 * 60),
            end: now,
            options: .strictEndDate
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            let oxygenSaturation = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: .percent())
            Task { @MainActor [weak self] in
                self?.latestOxygenSaturation = oxygenSaturation
            }
        }

        healthStore.execute(query)
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        Task { @MainActor in
            self.publishSample()
        }
    }
}
