// GymBeat — watchOS App
// Managers/SensorManager.swift
// Responsável pela coleta de dados fisiológicos (HealthKit) e
// inerciais (CoreMotion). Módulo isolado conforme code_standards.md §2.B.

import Foundation
import HealthKit
import CoreMotion

// MARK: - Constants

private enum SensorConstants {
    static let MOTION_SAMPLE_RATE_HZ: Double = 50.0   // Inercial ~50Hz
    static let HEARTBEAT_INTERVAL_SEC: Double = 1.0   // Fisiológico ~1Hz
    static let MOTION_UPDATE_INTERVAL: Double = 1.0 / MOTION_SAMPLE_RATE_HZ
}

// MARK: - Delegate Protocol

/*
 Protocol name: SensorManagerDelegate
 Description: Interface de callback para o SessionManager receber
              amostras em tempo real sem acoplamento direto.
 */
protocol SensorManagerDelegate: AnyObject {
    func sensorManager(_ manager: SensorManager, didCapture sample: TelemetrySample)
    func sensorManager(_ manager: SensorManager, didFailWith error: Error)
}

// MARK: - SensorManager

/*
 Class name: SensorManager
 Description: Gerencia os dois pipelines de sensores do Apple Watch:
              1. Pipeline Fisiológico — frequência cardíaca e SpO2 via HealthKit.
              2. Pipeline Inercial — acelerômetro e giroscópio via CoreMotion.
              Ativa o pipeline inercial SOMENTE se o exercício atual
              exigir (requiresMotionTracking), economizando bateria.
 */
final class SensorManager {

    // MARK: - Properties

    weak var delegate: SensorManagerDelegate?

    private let healthStore = HKHealthStore()
    private let motionManager = CMMotionManager()
    private let motionQueue = OperationQueue()

    private var heartRateQuery: HKAnchoredObjectQuery?
    private var currentHeartRate: Double? = nil
    private var currentOxygen: Double? = nil
    private var heartbeatTimer: Timer?

    private var isMotionActive: Bool = false
    private var isPhysiologicalActive: Bool = false

    // MARK: - HealthKit Authorization

    /*
     Function name: requestAuthorization
     Function description: Solicita permissão de leitura ao HealthKit para
                           frequência cardíaca e SpO2. Deve ser chamado na
                           inicialização do app antes de qualquer coleta.
     Inputs: completion: (Bool, Error?) -> Void
     Outputs: Void (resultado via closure)
     */
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }

    // MARK: - Session Control

    /*
     Function name: startCollection
     Function description: Inicia a coleta de sensores para o exercício
                           informado. Ativa pipeline inercial somente se
                           o exercício requer rastreamento de movimento.
     Inputs:
       - exercise: ExerciseID — contexto definido pelo smartphone
       - isMotionEnabled: Bool — flag do campo "mode" do comando START_SESSION
     Outputs: Void
     */
    func startCollection(for exercise: ExerciseID, isMotionEnabled: Bool) {
        startPhysiologicalPipeline()

        if isMotionEnabled && exercise.requiresMotionTracking {
            startMotionPipeline()
        }
    }

    /*
     Function name: stopCollection
     Function description: Para todos os pipelines ativos e libera recursos.
                           Deve ser chamado ao receber o comando STOP_SESSION.
     Inputs: Nenhum
     Outputs: Void
     */
    func stopCollection() {
        stopPhysiologicalPipeline()
        stopMotionPipeline()
    }

    // MARK: - Physiological Pipeline (HealthKit ~1Hz)

    /*
     Function name: startPhysiologicalPipeline
     Function description: Inicia consulta contínua ao HealthKit para
                           frequência cardíaca em tempo real e agenda
                           o heartbeat timer de 1Hz para envio de status.
     Inputs: Nenhum
     Outputs: Void
     */
    private func startPhysiologicalPipeline() {
        guard !isPhysiologicalActive else { return }
        isPhysiologicalActive = true

        startHeartRateQuery()

        heartbeatTimer = Timer.scheduledTimer(
            withTimeInterval: SensorConstants.HEARTBEAT_INTERVAL_SEC,
            repeats: true
        ) { [weak self] _ in
            self?.emitPhysiologicalSample()
        }
    }

    /*
     Function name: startHeartRateQuery
     Function description: Cria e executa uma HKAnchoredObjectQuery que
                           entrega novas amostras de frequência cardíaca
                           assim que o sensor as gera.
     Inputs: Nenhum
     Outputs: Void
     */
    private func startHeartRateQuery() {
        guard let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }

        let predicate = HKQuery.predicateForSamples(
            withStart: Date(),
            end: nil,
            options: .strictStartDate
        )

        let hrUnit = HKUnit.count().unitDivided(by: .minute())

        heartRateQuery = HKAnchoredObjectQuery(
            type: hrType,
            predicate: predicate,
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, error in
            if let error = error {
                self?.delegate?.sensorManager(self!, didFailWith: error)
                return
            }
            if let sample = samples?.last as? HKQuantitySample {
                self?.currentHeartRate = sample.quantity.doubleValue(for: hrUnit)
            }
        }

        heartRateQuery?.updateHandler = { [weak self] _, samples, _, _, error in
            if let error = error {
                self?.delegate?.sensorManager(self!, didFailWith: error)
                return
            }
            if let sample = samples?.last as? HKQuantitySample {
                self?.currentHeartRate = sample.quantity.doubleValue(for: hrUnit)
            }
        }

        healthStore.execute(heartRateQuery!)
    }

    /*
     Function name: emitPhysiologicalSample
     Function description: Cria um TelemetrySample apenas com dados
                           fisiológicos (hr, o2) e notifica o delegate.
                           Chamado pelo heartbeatTimer a 1Hz.
     Inputs: Nenhum
     Outputs: Void
     */
    private func emitPhysiologicalSample() {
        let sample = TelemetrySample(
            timestamp: Date(),
            heartRate: currentHeartRate,
            oxygen: currentOxygen,
            motion: nil
        )
        delegate?.sensorManager(self, didCapture: sample)
    }

    /*
     Function name: stopPhysiologicalPipeline
     Function description: Para o timer de heartbeat e encerra a query
                           contínua do HealthKit.
     Inputs: Nenhum
     Outputs: Void
     */
    private func stopPhysiologicalPipeline() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        if let query = heartRateQuery {
            healthStore.stop(query)
        }
        heartRateQuery = nil
        isPhysiologicalActive = false
    }

    // MARK: - Motion Pipeline (CoreMotion ~50Hz)

    /*
     Function name: startMotionPipeline
     Function description: Configura e inicia a coleta combinada de
                           acelerômetro e giroscópio a 50Hz via DeviceMotion.
                           Cada leitura gera um TelemetrySample com motion preenchido.
     Inputs: Nenhum
     Outputs: Void
     */
    private func startMotionPipeline() {
        guard motionManager.isDeviceMotionAvailable, !isMotionActive else { return }
        isMotionActive = true

        motionQueue.maxConcurrentOperationCount = 1
        motionManager.deviceMotionUpdateInterval = SensorConstants.MOTION_UPDATE_INTERVAL

        motionManager.startDeviceMotionUpdates(to: motionQueue) { [weak self] motionData, error in
            guard let self = self else { return }

            if let error = error {
                DispatchQueue.main.async {
                    self.delegate?.sensorManager(self, didFailWith: error)
                }
                return
            }

            guard let motionData = motionData else { return }

            let motionSample = self.buildMotionSample(from: motionData)
            let telemetrySample = TelemetrySample(
                timestamp: Date(),
                heartRate: self.currentHeartRate,
                oxygen: self.currentOxygen,
                motion: motionSample
            )

            DispatchQueue.main.async {
                self.delegate?.sensorManager(self, didCapture: telemetrySample)
            }
        }
    }

    /*
     Function name: buildMotionSample
     Function description: Converte um CMDeviceMotion em MotionSample,
                           extraindo aceleração do usuário (sem gravidade)
                           e rotação do giroscópio.
     Inputs:
       - motionData: CMDeviceMotion — dados brutos do CoreMotion
     Outputs: MotionSample
     */
    private func buildMotionSample(from motionData: CMDeviceMotion) -> MotionSample {
        return MotionSample(
            ax: motionData.userAcceleration.x,
            ay: motionData.userAcceleration.y,
            az: motionData.userAcceleration.z,
            gx: motionData.rotationRate.x,
            gy: motionData.rotationRate.y,
            gz: motionData.rotationRate.z
        )
    }

    /*
     Function name: stopMotionPipeline
     Function description: Para as atualizações do DeviceMotion e
                           limpa a fila de operações.
     Inputs: Nenhum
     Outputs: Void
     */
    private func stopMotionPipeline() {
        motionManager.stopDeviceMotionUpdates()
        motionQueue.cancelAllOperations()
        isMotionActive = false
    }
}
