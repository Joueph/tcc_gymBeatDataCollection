// GymBeat — React Native
// services/watchConnectivity.ts
// Camada de serviço para comunicação iPhone ↔ Apple Watch.
// API baseada nos tipos reais de react-native-watch-connectivity:
//   - watchEvents.on(event, cb) → UnsubscribeFn (função direta, sem .remove())
//   - Eventos válidos: 'message', 'user-info', 'reachability'

import watchEvents from 'react-native-watch-connectivity/dist/events';
import WatchConnectivity from 'react-native-watch-connectivity';
import { ExerciseID, SessionMode, TelemetrySample, WCBatchPayload, WCHeartbeatPayload } from '@/types/telemetry';

// MARK: - Message Key Constants

const MSG_KEY = {
    command: 'command',
    exerciseID: 'exerciseID',
    mode: 'mode',
    systemTime: 'systemTime',
    sessionID: 'sessionID',
    heartRate: 'heartRate',
    samples: 'samples',
} as const;

// MARK: - Callback Types

export type HeartbeatCallback = (heartRate: number) => void;
export type BatchReceivedCallback = (sessionID: string, samples: TelemetrySample[]) => void;
export type ReachabilityCallback = (isReachable: boolean) => void;

// MARK: - initWatchConnectivity

/*
 Function name: initWatchConnectivity
 Function description: Inicializa os três listeners do WatchConnectivity.
                       Retorna uma função de cleanup que cancela todos os
                       listeners — deve ser chamada no useEffect cleanup.
 Inputs:
   - onHeartbeat: HeartbeatCallback
   - onBatchReceived: BatchReceivedCallback
   - onReachabilityChange: ReachabilityCallback
 Outputs: () => void — cleanup function
 */
export function initWatchConnectivity(
    onHeartbeat: HeartbeatCallback,
    onBatchReceived: BatchReceivedCallback,
    onReachabilityChange: ReachabilityCallback,
): () => void {

    // Listener de mensagens em tempo real (heartbeat 1Hz do Watch)
    const unsubMessage = watchEvents.on(
        'message',
        (message: Record<string, unknown>) => {
            if (message[MSG_KEY.command] === 'HEARTBEAT') {
                const payload = message as unknown as WCHeartbeatPayload;
                if (payload.heartRate != null) {
                    onHeartbeat(payload.heartRate);
                }
            }
        },
    );

    // Listener de user-info (lote de amostras ao fim de cada série)
    // Cast para any necessário: o TypeScript falha em resolver o overload
    // genérico de 'user-info' quando o callback tem tipo explícito.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubUserInfo = (watchEvents.on as any)(
        'user-info',
        (info: Record<string, unknown>) => {
            if (info[MSG_KEY.command] === 'STOP_SESSION') {
                const payload = info as unknown as WCBatchPayload;
                try {
                    const samples: TelemetrySample[] = JSON.parse(payload.samples ?? '[]');
                    onBatchReceived(payload.sessionID, samples);
                } catch (e) {
                    console.error('[GymBeat] Erro ao parsear lote de telemetria:', e);
                }
            }
        },
    ) as () => void;

    // Listener de reachability (conexão Bluetooth com o Watch)
    const unsubReachability = watchEvents.on(
        'reachability',
        (reachable: boolean) => {
            onReachabilityChange(reachable);
        },
    );

    // UnsubscribeFn é uma função direta — sem .remove()
    return () => {
        unsubMessage();
        unsubUserInfo();
        unsubReachability();
    };
}

// MARK: - Commands (iPhone → Watch)

/*
 Function name: sendStartSession
 Function description: Envia START_SESSION ao Watch com contexto do
                       exercício e systemTime para handshake temporal.
 Inputs:
   - sessionID: string
   - exerciseID: ExerciseID
   - mode: SessionMode
 Outputs: Promise<void>
 */
export async function sendStartSession(
    sessionID: string,
    exerciseID: ExerciseID,
    mode: SessionMode,
): Promise<void> {
    await WatchConnectivity.sendMessage({
        [MSG_KEY.command]: 'START_SESSION',
        [MSG_KEY.sessionID]: sessionID,
        [MSG_KEY.exerciseID]: exerciseID,
        [MSG_KEY.mode]: mode,
        [MSG_KEY.systemTime]: Date.now() / 1000,
    });
}

/*
 Function name: sendStopSession
 Function description: Envia STOP_SESSION ao Watch para encerrar a
                       série e disparar o envio do lote de amostras.
 Inputs: Nenhum
 Outputs: Promise<void>
 */
export async function sendStopSession(): Promise<void> {
    await WatchConnectivity.sendMessage({
        [MSG_KEY.command]: 'STOP_SESSION',
    });
}

/*
 Function name: sendUpdateContext
 Function description: Troca o exercício ativo sem encerrar a sessão global.
 Inputs:
   - exerciseID: ExerciseID
   - mode: SessionMode
 Outputs: Promise<void>
 */
export async function sendUpdateContext(
    exerciseID: ExerciseID,
    mode: SessionMode,
): Promise<void> {
    await WatchConnectivity.sendMessage({
        [MSG_KEY.command]: 'UPDATE_CONTEXT',
        [MSG_KEY.exerciseID]: exerciseID,
        [MSG_KEY.mode]: mode,
    });
}

/*
 Function name: getWatchReachability
 Function description: Verifica de forma assíncrona se o Apple Watch
                       está acessível via WatchConnectivity.
 Inputs: Nenhum
 Outputs: Promise<boolean>
 */
export async function getWatchReachability(): Promise<boolean> {
    try {
        return await WatchConnectivity.getReachability();
    } catch {
        return false;
    }
}