import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { LiveSensorChartsModal } from "@/components/live-sensor-charts-modal";
import { SessionDrawer } from "@/components/session-drawer";
import { colors } from "@/constants/colors";
import { fetchExerciseGroupsFromFirebase, signOutFirebaseAccount } from "@/src/firebase/sync";
import { healthKit } from "@/src/health/health-kit";
import { syncHealthData } from "@/src/health/sync";
import { database } from "@/src/storage/database";
import type { DashboardSummary, LiveExerciseGroup, UserProfile } from "@/src/types/health";
import { formatSyncDate } from "@/src/utils/format";
import { exercises } from "@/src/watch/exercises";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const [summary30, setSummary30] = useState<DashboardSummary | null>(null);
  const [liveGroups, setLiveGroups] = useState<LiveExerciseGroup[]>([]);
  const [selectedLiveGroup, setSelectedLiveGroup] = useState<LiveExerciseGroup | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSessionDrawerVisible, setIsSessionDrawerVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [available, nextSummary30, nextProfile] = await Promise.all([
      healthKit.isHealthDataAvailable(),
      database.getSummary(30),
      database.getUserProfile(),
    ]);
    let nextLiveGroups = await database.getLiveExerciseGroups();

    if (nextProfile) {
      try {
        nextLiveGroups = (await fetchExerciseGroupsFromFirebase(nextProfile)) ?? nextLiveGroups;
      } catch (error) {
        console.warn("Could not fetch exercise groups from Firebase. Falling back to local data.", error);
      }
    }

    setHealthAvailable(available);
    setSummary30(nextSummary30);
    setLiveGroups(nextLiveGroups);
    setProfile(nextProfile);
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

  const handleLogout = async () => {
    await signOutFirebaseAccount();
    setIsSessionDrawerVisible(false);
    setProfile(null);
    router.replace("/login");
  };

  if (!isLoading && !profile) {
    return <Redirect href="/login" />;
  }

  if (isLoading && !profile) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
          GymBeat
        </Text>
        <ActivityIndicator color={colors.primary} />
      </ScrollView>
    );
  }

  const hasSyncedHealth = Boolean(summary30?.lastSyncAt);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 40 }}
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
            GymBeat
          </Text>
          <Pressable
            onPress={() => setIsSessionDrawerVisible(true)}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 21,
              backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 24, lineHeight: 24, fontWeight: "900" }}>⋯</Text>
          </Pressable>
        </View>
        <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          {profile ? `Ola, ${profile.name}. Escolha um exercicio e colete dados do Watch por serie.` : "Coleta ao vivo para treinos com Apple Watch."}
        </Text>
      </View>

      {!hasSyncedHealth ? (
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
              Apple Saude
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
      ) : null}

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
        <View style={{ gap: 16 }}>
          {exercises.map((exercise, index) => (
            <Pressable
              key={exercise.id}
              onPress={() => router.push({ pathname: "/live/[id]", params: { id: exercise.id } })}
              style={({ pressed }) => ({
                width: "100%",
                minHeight: 86,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                padding: 16,
                gap: 14,
                overflow: "hidden",
              })}
            >
              <View style={{ width: 5, alignSelf: "stretch", minHeight: 48, borderRadius: 3, backgroundColor: exerciseAccent(index) }} />
              <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", lineHeight: 22 }}>
                  {exercise.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>{exercise.category}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "800", lineHeight: 26 }}>›</Text>
            </Pressable>
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

            return (
              <Pressable
                key={key}
                onPress={() => setSelectedLiveGroup(group)}
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
                      {group.setCount} {group.setCount === 1 ? "serie" : "series"} · {group.totalReps} reps
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>
                    +
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <LiveSensorChartsModal group={selectedLiveGroup} onClose={() => setSelectedLiveGroup(null)} />
      <SessionDrawer
        visible={isSessionDrawerVisible}
        onClose={() => setIsSessionDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </ScrollView>
  );
}

const formatCardDay = (value: string) => {
  const [, month, day] = value.split("-");
  return `${day} / ${month}`;
};

const exerciseAccent = (index: number) => ["#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#EF4444"][index % 5];
