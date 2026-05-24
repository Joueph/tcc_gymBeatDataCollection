import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { BarChart } from "@/components/bar-chart";
import { MetricCard } from "@/components/metric-card";
import { WorkoutCard } from "@/components/workout-card";
import { colors } from "@/constants/colors";
import { healthKit } from "@/src/health/health-kit";
import { syncHealthData } from "@/src/health/sync";
import { database } from "@/src/storage/database";
import type { DashboardSummary, MetricSample, Workout } from "@/src/types/health";
import { formatDistance, formatDuration, formatSyncDate } from "@/src/utils/format";
import { exercises } from "@/src/watch/exercises";

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const [summary7, setSummary7] = useState<DashboardSummary | null>(null);
  const [summary30, setSummary30] = useState<DashboardSummary | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [energySamples, setEnergySamples] = useState<MetricSample[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [available, nextSummary7, nextSummary30, nextWorkouts] = await Promise.all([
      healthKit.isHealthDataAvailable(),
      database.getSummary(7),
      database.getSummary(30),
      database.getWorkouts(),
    ]);

    const now = new Date();
    const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const samples = await database.getMetricSamples("activeEnergyBurned", start, now.toISOString());

    setHealthAvailable(available);
    setSummary7(nextSummary7);
    setSummary30(nextSummary30);
    setWorkouts(nextWorkouts.slice(0, 3));
    setEnergySamples(samples);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setIsLoading(true);
      loadDashboard()
        .catch((error) => {
          if (isMounted) {
            setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar os dados.");
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [loadDashboard]),
  );

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);

    try {
      const authorized = await healthKit.requestAuthorization();
      const result = await syncHealthData(30);
      await loadDashboard();
      setMessage(
        authorized
          ? `${result.workoutCount} treinos sincronizados.`
          : "Modo demonstracao ativo: use um build iOS em dispositivo fisico para ler o Apple Saude.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar com o Apple Saude.");
    } finally {
      setIsSyncing(false);
    }
  };

  const hasData = workouts.length > 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
          Metricas do Apple Watch
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Conecte ao Apple Saude para importar treinos ja sincronizados pelo Apple Watch e acompanhar a evolucao localmente.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 8,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 16,
          gap: 14,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
            HealthKit
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
            {healthAvailable ? "Disponivel neste aparelho" : "Aguardando build iOS com HealthKit"}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
            {formatSyncDate(summary30?.lastSyncAt ?? null)}
          </Text>
        </View>

        <Pressable
          disabled={isSyncing}
          onPress={handleSync}
          style={({ pressed }) => ({
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            opacity: isSyncing ? 0.72 : 1,
          })}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              Permitir e sincronizar
            </Text>
          )}
        </Pressable>
      </View>

      {message ? (
        <View
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: 8,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 14,
          }}
        >
          <Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
            {message}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
          Treino ao vivo
        </Text>
        <View style={{ gap: 10 }}>
          {exercises.map((exercise) => (
            <Link key={exercise.id} href={{ pathname: "/live/[id]", params: { id: exercise.id } }} asChild>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  borderColor: colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  padding: 16,
                  gap: 4,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{exercise.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{exercise.category}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View style={{ gap: 12 }}>
            <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
              Ultimos 7 dias
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <MetricCard label="Treinos" value={`${summary7?.workoutCount ?? 0}`} />
              <MetricCard label="Tempo" value={formatDuration(summary7?.totalDurationMinutes ?? 0)} />
              <MetricCard label="Calorias" value={`${summary7?.totalEnergyBurned ?? 0} kcal`} />
              <MetricCard label="Distancia" value={formatDistance(summary7?.totalDistance ?? 0)} />
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                Energia ativa
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                14 dias
              </Text>
            </View>
            <BarChart samples={energySamples} emptyLabel="Sincronize para visualizar calorias ativas por dia." />
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                Treinos recentes
              </Text>
              <Link href="/workouts" asChild>
                <Pressable hitSlop={10}>
                  <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "700" }}>
                    Ver todos
                  </Text>
                </Pressable>
              </Link>
            </View>
            {hasData ? (
              workouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)
            ) : (
              <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
                Nenhum treino salvo ainda. Toque em sincronizar para importar os dados do Apple Saude.
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MetricCard label="30 dias" value={`${summary30?.workoutCount ?? 0} treinos`} />
            <MetricCard label="Volume total" value={formatDuration(summary30?.totalDurationMinutes ?? 0)} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
