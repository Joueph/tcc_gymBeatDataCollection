import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { MetricCard } from "@/components/metric-card";
import { colors } from "@/constants/colors";
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
  const [setId, setSetId] = useState<string | null>(null);
  const [setIndex, setSetIndex] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isCompanionAppConnected, setIsCompanionAppConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let connectionExpiryTimer: ReturnType<typeof setTimeout> | null = null;

    const markCompanionConnection = (connected: boolean) => {
      if (!isMounted) {
        return;
      }

      setIsCompanionAppConnected(connected);

      if (connectionExpiryTimer) {
        clearTimeout(connectionExpiryTimer);
        connectionExpiryTimer = null;
      }

      if (connected) {
        connectionExpiryTimer = setTimeout(() => {
          if (isMounted) {
            setIsCompanionAppConnected(false);
          }
        }, 8000);
      }
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
          if (result.reply?.state) {
            setWatchState(result.reply.state);
          }
        }
      } catch {
        markCompanionConnection(false);
      }
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
      if (!nextStatus.isReachable) {
        markCompanionConnection(false);
      }
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
      if (connectionExpiryTimer) {
        clearTimeout(connectionExpiryTimer);
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
      setIsCompanionAppConnected(result.delivered && result.reply?.companionAppConnected === true);

      if (result.reply?.state) {
        setWatchState(result.reply.state);
      }

      if (!result.delivered) {
        setMessage("Abra o app no Watch e mantenha esta tela aberta para conectar os dois apps.");
      }
    } catch (error) {
      setIsCompanionAppConnected(false);
      setMessage(error instanceof Error ? error.message : "Nao foi possivel confirmar a conexao com o app do Watch.");
    }
  };

  const latestSample = samples.at(-1);
  const setSummaries = useMemo(() => {
    const summaries = new Map<string, { setId: string; samples: number; heartRate: number; kcal: number; steps: number }>();

    for (const sample of samples) {
      summaries.set(sample.setId, {
        setId: sample.setId,
        samples: (summaries.get(sample.setId)?.samples ?? 0) + 1,
        heartRate: sample.heartRate,
        kcal: Math.round(sample.activeEnergyBurned),
        steps: Math.round(sample.stepCount),
      });
    }

    return Array.from(summaries.values());
  }, [samples]);

  const sendCommand = async (command: Parameters<typeof watchConnectivity.sendCommand>[0]) => {
    if (!exercise) {
      return;
    }

    if ((command === "startSession" || command === "startSet") && !isCompanionAppConnected) {
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
        nextSessionId = createId("session");
        nextSetId = createId("set-1");
        nextSetIndex = 1;
        setSamples([]);
        setSessionId(nextSessionId);
        setSetId(nextSetId);
        setSetIndex(nextSetIndex);
      }

      if (command === "startSet") {
        nextSetIndex = setIndex + 1;
        nextSetId = createId(`set-${nextSetIndex}`);
        setSetIndex(nextSetIndex);
        setSetId(nextSetId);
      }

      const result = await watchConnectivity.sendCommand(command, {
        sessionId: nextSessionId ?? undefined,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setId: nextSetId ?? undefined,
        setIndex: nextSetIndex,
      });

      setStatus(result.status);
      setIsCompanionAppConnected(result.delivered && result.reply?.companionAppConnected !== false);
      if (result.reply?.state) {
        setWatchState(result.reply.state);
      }
      setMessage(result.queued ? "Comando enfileirado. Abra o app no Watch para receber." : "Comando enviado ao Watch.");
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
  const isPaused = watchState === "paused";
  const canSendWorkoutCommand = isCompanionAppConnected && status?.isReachable === true;

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
          {exercise.category} · Serie {setIndex}
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
        <MetricCard label="FC atual" value={latestSample ? `${Math.round(latestSample.heartRate)} bpm` : "Sem dados"} />
        <MetricCard label="Calorias" value={`${Math.round(latestSample?.activeEnergyBurned ?? 0)} kcal`} />
        <MetricCard label="Passos" value={`${Math.round(latestSample?.stepCount ?? 0)}`} />
        <MetricCard label="Amostras" value={`${samples.length}`} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <CommandButton
          disabled={isSending || isCollecting || !canSendWorkoutCommand}
          label="Iniciar"
          onPress={() => sendCommand("startSession")}
        />
        <CommandButton
          disabled={isSending || !canSendWorkoutCommand || !sessionId || (!isCollecting && !isPaused)}
          label={isPaused ? "Retomar" : "Pausar"}
          onPress={() => sendCommand(isPaused ? "resumeSession" : "pauseSession")}
        />
        <CommandButton
          disabled={isSending || !canSendWorkoutCommand || !sessionId}
          label="Nova serie"
          onPress={() => sendCommand("startSet")}
        />
        <CommandButton
          disabled={isSending || !canSendWorkoutCommand || !sessionId}
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

      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
          Series coletadas
        </Text>
        {setSummaries.length === 0 ? (
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Inicie o treino e deixe o app do Watch aberto para receber as metricas.
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
