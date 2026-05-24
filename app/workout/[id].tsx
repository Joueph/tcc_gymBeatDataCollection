import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { BarChart } from "@/components/bar-chart";
import { MetricCard } from "@/components/metric-card";
import { colors } from "@/constants/colors";
import { healthKit } from "@/src/health/health-kit";
import { database } from "@/src/storage/database";
import type { MetricSample, Workout } from "@/src/types/health";
import { formatDate, formatDistance, formatDuration } from "@/src/utils/format";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [heartRateSamples, setHeartRateSamples] = useState<MetricSample[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadWorkout = async () => {
      if (!id) {
        return;
      }

      const nextWorkout = await database.getWorkout(id);
      let samples: MetricSample[] = [];

      if (nextWorkout) {
        samples = await healthKit.getMetricSamples(
          "heartRate",
          new Date(nextWorkout.startDate),
          new Date(nextWorkout.endDate),
          "hour",
        );
      }

      if (isMounted) {
        setWorkout(nextWorkout);
        setHeartRateSamples(samples);
      }
    };

    setIsLoading(true);
    loadWorkout().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20 }}>
        <ActivityIndicator color={colors.primary} />
      </ScrollView>
    );
  }

  if (!workout) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
          Treino nao encontrado.
        </Text>
      </ScrollView>
    );
  }

  const averageHeartRate =
    heartRateSamples.length > 0
      ? Math.round(
          heartRateSamples.reduce((total, sample) => total + sample.value, 0) / heartRateSamples.length,
        )
      : 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
          {workout.activityType}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 14 }}>
          {formatDate(workout.startDate)} · {workout.sourceName}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <MetricCard label="Duracao" value={formatDuration(workout.durationMinutes)} />
        <MetricCard label="Calorias" value={`${Math.round(workout.activeEnergyBurned)} kcal`} />
        <MetricCard label="Distancia" value={formatDistance(workout.distance)} />
        <MetricCard label="FC media" value={averageHeartRate ? `${averageHeartRate} bpm` : "Sem dados"} />
      </View>

      <View style={{ gap: 12 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
          Frequencia cardiaca
        </Text>
        <BarChart samples={heartRateSamples} emptyLabel="Sem amostras de frequencia cardiaca para este treino." />
      </View>
    </ScrollView>
  );
}
