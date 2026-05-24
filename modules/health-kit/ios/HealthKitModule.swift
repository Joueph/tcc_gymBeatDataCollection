import ExpoModulesCore
import HealthKit

public class HealthKitModule: Module {
  private let healthStore = HKHealthStore()
  private let isoFormatter = ISO8601DateFormatter()
  private let fractionalIsoFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  public func definition() -> ModuleDefinition {
    Name("HealthKit")

    AsyncFunction("isHealthDataAvailable") { () -> Bool in
      return HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }

      let readTypes = self.readTypes()
      self.healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
        if let error {
          promise.reject("ERR_HEALTHKIT_AUTH", error.localizedDescription)
          return
        }

        promise.resolve(success)
      }
    }

    AsyncFunction("getWorkouts") { (options: [String: String], promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve([])
        return
      }

      guard
        let startDateValue = options["startDate"],
        let endDateValue = options["endDate"],
        let startDate = self.parseDate(startDateValue),
        let endDate = self.parseDate(endDateValue)
      else {
        promise.reject("ERR_HEALTHKIT_DATES", "Invalid startDate or endDate.")
        return
      }

      let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [.strictStartDate])
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [sort]
      ) { _, samples, error in
        if let error {
          promise.reject("ERR_HEALTHKIT_WORKOUTS", error.localizedDescription)
          return
        }

        let workouts = (samples as? [HKWorkout] ?? []).map { workout in
          return [
            "id": workout.uuid.uuidString,
            "activityType": self.activityName(workout.workoutActivityType),
            "startDate": self.isoFormatter.string(from: workout.startDate),
            "endDate": self.isoFormatter.string(from: workout.endDate),
            "duration": workout.duration,
            "activeEnergyBurned": workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0,
            "distance": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
            "sourceName": workout.sourceRevision.source.name
          ] as [String: Any]
        }

        promise.resolve(workouts)
      }

      self.healthStore.execute(query)
    }

    AsyncFunction("getMetricSamples") { (options: [String: String], promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve([])
        return
      }

      guard
        let metricValue = options["type"],
        let startDateValue = options["startDate"],
        let endDateValue = options["endDate"],
        let intervalValue = options["interval"],
        let quantityType = self.quantityType(for: metricValue),
        let startDate = self.parseDate(startDateValue),
        let endDate = self.parseDate(endDateValue)
      else {
        promise.reject("ERR_HEALTHKIT_METRIC_OPTIONS", "Invalid metric query options.")
        return
      }

      let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [.strictStartDate])
      let interval = self.dateComponents(for: intervalValue)
      let options = self.statisticsOptions(for: metricValue)
      let query = HKStatisticsCollectionQuery(
        quantityType: quantityType,
        quantitySamplePredicate: predicate,
        options: options,
        anchorDate: startDate,
        intervalComponents: interval
      )

      query.initialResultsHandler = { _, collection, error in
        if let error {
          promise.reject("ERR_HEALTHKIT_METRIC_SAMPLES", error.localizedDescription)
          return
        }

        guard let collection else {
          promise.resolve([])
          return
        }

        var results: [[String: Any]] = []
        collection.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
          let quantity = options.contains(.discreteAverage)
            ? statistics.averageQuantity()
            : statistics.sumQuantity()
          let value = quantity?.doubleValue(for: self.unit(for: metricValue)) ?? 0

          results.append([
            "type": metricValue,
            "startDate": self.isoFormatter.string(from: statistics.startDate),
            "endDate": self.isoFormatter.string(from: statistics.endDate),
            "value": value,
            "unit": self.unitName(for: metricValue)
          ])
        }

        promise.resolve(results)
      }

      self.healthStore.execute(query)
    }
  }

  private func parseDate(_ value: String) -> Date? {
    return fractionalIsoFormatter.date(from: value) ?? isoFormatter.date(from: value)
  }

  private func readTypes() -> Set<HKObjectType> {
    var types: Set<HKObjectType> = [HKObjectType.workoutType()]

    [
      HKQuantityTypeIdentifier.heartRate,
      HKQuantityTypeIdentifier.activeEnergyBurned,
      HKQuantityTypeIdentifier.stepCount,
      HKQuantityTypeIdentifier.distanceWalkingRunning
    ].forEach { identifier in
      if let type = HKObjectType.quantityType(forIdentifier: identifier) {
        types.insert(type)
      }
    }

    return types
  }

  private func quantityType(for metric: String) -> HKQuantityType? {
    switch metric {
    case "heartRate":
      return HKObjectType.quantityType(forIdentifier: .heartRate)
    case "activeEnergyBurned":
      return HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
    case "stepCount":
      return HKObjectType.quantityType(forIdentifier: .stepCount)
    case "distance":
      return HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)
    default:
      return nil
    }
  }

  private func statisticsOptions(for metric: String) -> HKStatisticsOptions {
    return metric == "heartRate" ? .discreteAverage : .cumulativeSum
  }

  private func unit(for metric: String) -> HKUnit {
    switch metric {
    case "heartRate":
      return HKUnit.count().unitDivided(by: .minute())
    case "activeEnergyBurned":
      return .kilocalorie()
    case "distance":
      return .meter()
    default:
      return .count()
    }
  }

  private func unitName(for metric: String) -> String {
    switch metric {
    case "heartRate":
      return "bpm"
    case "activeEnergyBurned":
      return "kcal"
    case "distance":
      return "m"
    default:
      return "count"
    }
  }

  private func dateComponents(for interval: String) -> DateComponents {
    var components = DateComponents()
    if interval == "hour" {
      components.hour = 1
    } else {
      components.day = 1
    }
    return components
  }

  private func activityName(_ activityType: HKWorkoutActivityType) -> String {
    switch activityType {
    case .running:
      return "Corrida"
    case .walking:
      return "Caminhada"
    case .cycling:
      return "Ciclismo"
    case .functionalStrengthTraining:
      return "Treino funcional"
    case .traditionalStrengthTraining:
      return "Musculacao"
    case .highIntensityIntervalTraining:
      return "HIIT"
    case .swimming:
      return "Natacao"
    case .yoga:
      return "Yoga"
    default:
      return "Treino"
    }
  }
}
