import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { MetricCard } from "@/components/metric-card";
import { colors } from "@/constants/colors";
import { syncLocalDataToFirebase } from "@/src/firebase/sync";
import { database } from "@/src/storage/database";
import type { LiveExerciseSample } from "@/src/types/health";
import { findExercise } from "@/src/watch/exercises";
import {
  watchConnectivity,
  type LiveMetricSample,
  type WatchConnectivityStatus,
  type WatchIncomingMessage,
  type WatchStateMessage,
} from "@/src/watch/watch-connectivity";

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isMetricSample = (message: WatchIncomingMessage): message is LiveMetricSample =>
  message.messageType === "metricSample";

const isStateMessage = (message: WatchIncomingMessage): message is WatchStateMessage =>
  message.messageType === "stateChanged";

const preserveCollectingState = (
  currentState: WatchStateMessage["state"],
  nextState: WatchStateMessage["state"],
) => (currentState === "collecting" && nextState === "waiting" ? currentState : nextState);

const formatWatchStatus = (status: WatchConnectivityStatus | null) => {
  if (!status?.isSupported) {
    return "Indisponivel neste ambiente";
  }

  if (!status.isPaired) {
    return "Apple Watch nao pareado";
  }

  if (!status.isWatchAppInstalled) {
    return "App do Watch nao instalado";
  }

  return status.isReachable ? "Watch conectado" : "Watch instalado, aguardando alcance";
};

export default function LiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = findExercise(id);
  const [status, setStatus] = useState<WatchConnectivityStatus | null>(null);
  const [watchState, setWatchState] = useState<WatchStateMessage["state"]>("waiting");
  const [samples, setSamples] = useState<LiveMetricSample[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [setIndex, setSetIndex] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isCompanionAppConnected, setIsCompanionAppConnected] = useState(false);
  const [repsPromptEndedAt, setRepsPromptEndedAt] = useState<string | null>(null);
  const [repsInput, setRepsInput] = useState("");

  useEffect(() => {
    let isMounted = true;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const markCompanionConnection = (connected: boolean) => {
      if (!isMounted) {
        return;
      }

      setIsCompanionAppConnected(connected);
    };

    const sendAppHeartbeat = async () => {
      try {
        const result = await watchConnectivity.sendCommand("appHeartbeat", {
          exerciseId: exercise?.id,
          exerciseName: exercise?.name,
        });

        if (isMounted) {
          setStatus(result.status);
          markCompanionConnection(result.delivered && result.reply?.companionAppConnected === true);
          const nextState = result.reply?.state;
          if (nextState) {
            setWatchState((currentState) => preserveCollectingState(currentState, nextState));
          }
        }
      } catch {}
    };

    watchConnectivity
      .getStatus()
      .then((nextStatus) => {
        if (isMounted) {
          setStatus(nextStatus);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Nao foi possivel conectar ao Apple Watch.");
        }
      });

    const statusSubscription = watchConnectivity.addListener("onWatchConnectivityChange", (nextStatus) => {
      setStatus(nextStatus);
    });
    const messageSubscription = watchConnectivity.addListener("onWatchMessage", (incomingMessage) => {
      if (isMetricSample(incomingMessage)) {
        setSamples((currentSamples) => [...currentSamples, incomingMessage]);
        return;
      }

      if (isStateMessage(incomingMessage)) {
        setWatchState(incomingMessage.state);
        markCompanionConnection(true);
        return;
      }

      if (incomingMessage.messageType === "error" && typeof incomingMessage.message === "string") {
        setMessage(incomingMessage.message);
      }
    });

    sendAppHeartbeat();
    heartbeatTimer = setInterval(sendAppHeartbeat, 4000);

    return () => {
      isMounted = false;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      statusSubscription.remove();
      messageSubscription.remove();
    };
  }, [exercise?.id, exercise?.name]);

  const refreshConnection = async () => {
    setMessage(null);

    try {
      const result = await watchConnectivity.sendCommand("appHeartbeat", {
        exerciseId: exercise?.id,
        exerciseName: exercise?.name,
      });

      setStatus(result.status);
      setIsCompanionAppConnected((currentConnection) =>
        result.delivered ? result.reply?.companionAppConnected === true : currentConnection,
      );

      const nextState = result.reply?.state;
      if (nextState) {
        setWatchState((currentState) => preserveCollectingState(currentState, nextState));
      }

      if (!result.delivered) {
        setMessage("Abra o app no Watch e mantenha esta tela aberta para conectar os dois apps.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel confirmar a conexao com o app do Watch.");
    }
  };

  const latestSample = samples.at(-1);
  const setSummaries = useMemo(() => {
    const summaries = new Map<string, { setId: string; samples: number; heartRate: number; kcal: number; steps: number }>();

    for (const sample of samples) {
      const sampleSetId = sample.setId ?? sessionId ?? "current";
      summaries.set(sampleSetId, {
        setId: sampleSetId,
        samples: (summaries.get(sampleSetId)?.samples ?? 0) + 1,
        heartRate: sample.heartRate ?? 0,
        kcal: Math.round(sample.activeEnergyBurned ?? 0),
        steps: Math.round(sample.stepCount ?? 0),
      });
    }

    return Array.from(summaries.values());
  }, [samples, sessionId]);

  const saveLiveSession = async (endedAt: string, reps: number) => {
    if (!exercise || !sessionId || !sessionStartedAt) {
      return;
    }

    const liveSamples: LiveExerciseSample[] = samples.map((sample, index) => ({
      id: `${sessionId}:${sample.timestamp}:${index}`,
      sessionId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      timestamp: sample.timestamp,
      heartRate: sample.heartRate ?? null,
      activeEnergyBurned: sample.activeEnergyBurned ?? null,
      distance: sample.distance ?? null,
      stepCount: sample.stepCount ?? null,
      oxygenSaturation: sample.oxygenSaturation ?? null,
      accelerationX: sample.accelerationX ?? null,
      accelerationY: sample.accelerationY ?? null,
      accelerationZ: sample.accelerationZ ?? null,
      gyroscopeX: sample.gyroscopeX ?? null,
      gyroscopeY: sample.gyroscopeY ?? null,
      gyroscopeZ: sample.gyroscopeZ ?? null,
    }));

    await database.saveLiveExerciseSession({
      sessionId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      startedAt: sessionStartedAt,
      endedAt,
      setCount: 1,
      reps,
      samples: liveSamples,
    });
  };

  const resetCurrentSession = () => {
    setSessionId(null);
    setSessionStartedAt(null);
    setSetId(null);
    setSetIndex(1);
    setRepsPromptEndedAt(null);
    setRepsInput("");
  };

  const handleSaveReps = async () => {
    if (!repsPromptEndedAt) {
      return;
    }

    const reps = Number(repsInput);
    if (!Number.isFinite(reps) || reps < 0) {
      setMessage("Informe uma quantidade valida de repeticoes.");
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      await saveLiveSession(repsPromptEndedAt, Math.round(reps));
      await syncLocalDataToFirebase();
      resetCurrentSession();
      setMessage(samples.length > 0 ? "Serie salva no historico local." : "Serie salva sem amostras.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar a serie.");
    } finally {
      setIsSending(false);
    }
  };

  const sendCommand = async (command: Parameters<typeof watchConnectivity.sendCommand>[0]) => {
    if (!exercise) {
      return;
    }

    if (command === "startSession" && !isCompanionAppConnected) {
      setMessage("Conecte o app do Watch antes de iniciar uma serie.");
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      let nextSessionId = sessionId;
      let nextSetId = setId;
      let nextSetIndex = setIndex;

      if (command === "startSession") {
        const startedAt = new Date().toISOString();
        nextSessionId = createId("session");
        nextSetId = createId("set-1");
        nextSetIndex = 1;
        setSamples([]);
        setSessionId(nextSessionId);
        setSessionStartedAt(startedAt);
        setSetId(nextSetId);
        setSetIndex(nextSetIndex);
      }

      const result = await watchConnectivity.sendCommand(command, {
        sessionId: nextSessionId ?? undefined,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setId: nextSetId ?? undefined,
        setIndex: nextSetIndex,
      });

      setStatus(result.status);
      setIsCompanionAppConnected((currentConnection) =>
        result.delivered ? result.reply?.companionAppConnected !== false : currentConnection,
      );
      const nextState = result.reply?.state;
      if (nextState) {
        setWatchState((currentState) => preserveCollectingState(currentState, nextState));
      }
      if (command === "stopSession") {
        const endedAt = new Date().toISOString();
        setWatchState("waiting");
        setRepsPromptEndedAt(endedAt);
        return;
      }

      setMessage(result.queued ? "Comando enfileirado. Abra o app no Watch para receber." : "Serie iniciada no Watch.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar comando ao Apple Watch.");
    } finally {
      setIsSending(false);
    }
  };

  if (!exercise) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
          Exercicio nao encontrado.
        </Text>
      </ScrollView>
    );
  }

  const isCollecting = watchState === "collecting";
  const canStartSeries = isCompanionAppConnected && status?.isReachable === true;
  const canStopSeries = isCompanionAppConnected && Boolean(sessionId) && isCollecting;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
          {exercise.name}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 14 }}>
          {exercise.category}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
          {formatWatchStatus(status)}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
          Conexao entre apps: {isCompanionAppConnected ? "Connected" : "Waiting"}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
          Estado do treino no Watch: {watchState}
        </Text>
        <Pressable
          onPress={refreshConnection}
          style={({ pressed }) => ({
            minHeight: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            borderColor: colors.border,
            borderWidth: 1,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          })}
        >
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "700" }}>Atualizar conexao</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <MetricCard
          label="FC atual"
          value={latestSample?.heartRate ? `${Math.round(latestSample.heartRate)} bpm` : "Sem dados"}
        />
        <MetricCard label="Calorias" value={`${Math.round(latestSample?.activeEnergyBurned ?? 0)} kcal`} />
        <MetricCard label="Passos" value={`${Math.round(latestSample?.stepCount ?? 0)}`} />
        <MetricCard
          label="SpO2"
          value={latestSample?.oxygenSaturation ? `${Math.round(latestSample.oxygenSaturation * 100)}%` : "Sem dados"}
        />
        <MetricCard label="Amostras" value={`${samples.length}`} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <CommandButton
          disabled={isSending || isCollecting || !canStartSeries}
          label="Iniciar"
          onPress={() => sendCommand("startSession")}
        />
        <CommandButton
          disabled={isSending || !canStopSeries}
          label="Parar"
          danger
          onPress={() => sendCommand("stopSession")}
        />
      </View>

      {isSending ? <ActivityIndicator color={colors.primary} /> : null}

      {message ? (
        <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: 14 }}>
          <Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
            {message}
          </Text>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(repsPromptEndedAt)}
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              padding: 18,
              gap: 14,
            }}
          >
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                Quantas reps?
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
                Esse numero sera salvo junto dos sensores para facilitar a classificacao das repeticoes depois.
              </Text>
            </View>

            <TextInput
              value={repsInput}
              onChangeText={setRepsInput}
              keyboardType="number-pad"
              placeholder="Ex: 12"
              placeholderTextColor={colors.muted}
              autoFocus
              style={{
                minHeight: 54,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                backgroundColor: colors.background,
                color: colors.text,
                fontSize: 24,
                fontWeight: "800",
                paddingHorizontal: 14,
                fontVariant: ["tabular-nums"],
              }}
            />

            <Pressable
              disabled={isSending}
              onPress={handleSaveReps}
              style={({ pressed }) => ({
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                opacity: isSending ? 0.7 : 1,
              })}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>Salvar serie</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
          Series coletadas
        </Text>
        {setSummaries.length === 0 ? (
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Inicie a serie e deixe o app do Watch aberto para receber as metricas.
          </Text>
        ) : (
          setSummaries.map((summary, index) => (
            <View
              key={summary.setId}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                padding: 14,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Serie {index + 1}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                {summary.heartRate ? `${Math.round(summary.heartRate)} bpm` : "Sem FC"} · {summary.kcal} kcal ·{" "}
                {summary.steps} passos · {summary.samples} amostras
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

type CommandButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function CommandButton({ label, onPress, disabled, danger }: CommandButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        minWidth: 136,
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        backgroundColor: danger ? colors.danger : pressed ? colors.primaryPressed : colors.primary,
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 14,
      })}
    >
      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
