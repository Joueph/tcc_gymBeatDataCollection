import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { LiveSessionChart } from "@/components/live-session-chart";
import { colors } from "@/constants/colors";
import { healthKit } from "@/src/health/health-kit";
import { syncHealthData } from "@/src/health/sync";
import { database } from "@/src/storage/database";
import type { DashboardSummary, LiveExerciseGroup } from "@/src/types/health";
import { formatSyncDate } from "@/src/utils/format";
import { exercises } from "@/src/watch/exercises";

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const [summary30, setSummary30] = useState<DashboardSummary | null>(null);
  const [liveGroups, setLiveGroups] = useState<LiveExerciseGroup[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [available, nextSummary30, nextLiveGroups] = await Promise.all([
      healthKit.isHealthDataAvailable(),
      database.getSummary(30),
      database.getLiveExerciseGroups(),
    ]);

    setHealthAvailable(available);
    setSummary30(nextSummary30);
    setLiveGroups(nextLiveGroups);
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

      <View style={{ gap: 12 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
          Exercicios realizados
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : liveGroups.length === 0 ? (
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Nenhuma serie ao vivo salva ainda. Escolha um exercicio, conecte o Watch e toque em Iniciar.
          </Text>
        ) : (
          liveGroups.map((group) => {
            const key = `${group.day}:${group.exerciseId}`;
            const isExpanded = expandedGroupKey === key;

            return (
              <Pressable
                key={key}
                onPress={() => setExpandedGroupKey(isExpanded ? null : key)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  borderColor: colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  padding: 16,
                  gap: 12,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
                      {formatCardDay(group.day)}
                    </Text>
                    <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                      {group.exerciseName}
                    </Text>
                    <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                      {group.setCount} {group.setCount === 1 ? "serie" : "series"}
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>
                    {isExpanded ? "-" : "+"}
                  </Text>
                </View>

                {isExpanded ? <LiveSessionChart samples={group.samples} /> : null}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const formatCardDay = (value: string) => {
  const [, month, day] = value.split("-");
  return `${day} / ${month}`;
};
