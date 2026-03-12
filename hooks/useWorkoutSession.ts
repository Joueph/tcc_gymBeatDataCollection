// GymBeat — React Native
// hooks/useWorkoutSession.ts
// Orquestra o ciclo de vida completo de uma sessão de treino:
// seleção de exercício → envio ao Watch → recebimento do lote → Firebase.

import { useState, useCallback, useRef } from 'react';
import { ExerciseID, WorkoutSession, TelemetrySample } from '@/types/telemetry';
import { EXERCISES } from '@/constants/exercises';
import {
    sendStartSession,
    sendStopSession,
    sendUpdateContext,
} from '@/services/watchConnectivity';
import { saveFullSession } from '@/services/firebaseService';
import { useSensorData } from './useSensorData';

// MARK: - Session State

export type WorkoutState = 'idle' | 'active' | 'saving';

export interface WorkoutSessionState {
    workoutState: WorkoutState;
    currentExerciseID: ExerciseID | null;
    sessionDurationMs: number;
    currentHeartRate: number | null;
    isWatchReachable: boolean;
    startSession: (exerciseID: ExerciseID) => Promise<void>;
    stopSession: () => Promise<void>;
    updateExercise: (exerciseID: ExerciseID) => Promise<void>;
}

// MARK: - useWorkoutSession

/*
 Function name: useWorkoutSession
 Function description: Hook principal que gerencia a sessão de treino.
                       Combina useSensorData com os comandos WatchConnectivity
                       e a persistência no Firebase. A UI consome apenas
                       este hook — sem acesso direto a serviços.
 Inputs: Nenhum
 Outputs: WorkoutSessionState
 */
export function useWorkoutSession(): WorkoutSessionState {
    const [workoutState, setWorkoutState] = useState<WorkoutState>('idle');
    const [currentExerciseID, setCurrentExerciseID] = useState<ExerciseID | null>(null);
    const [sessionDurationMs, setSessionDurationMs] = useState(0);

    const sessionRef = useRef<WorkoutSession | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // MARK: - Batch Received Handler

    /*
     Function name: handleBatchReceived
     Function description: Chamado pelo useSensorData quando o Watch envia
                           o lote ao fim da série. Completa a sessão e
                           persiste no Firebase.
     Inputs:
       - sessionID: string
       - samples: TelemetrySample[]
     Outputs: void
     */
    const handleBatchReceived = useCallback(
        async (sessionID: string, samples: TelemetrySample[]) => {
            if (!sessionRef.current) return;

            const completedSession: WorkoutSession = {
                ...sessionRef.current,
                endedAt: Date.now(),
                samples,
            };

            setWorkoutState('saving');

            try {
                await saveFullSession(completedSession);
            } catch (e) {
                console.error('[GymBeat] Erro ao salvar sessão:', e);
            } finally {
                sessionRef.current = null;
                setWorkoutState('idle');
                setCurrentExerciseID(null);
                setSessionDurationMs(0);
            }
        },
        []
    );

    const { currentHeartRate, isWatchReachable } = useSensorData(handleBatchReceived);

    // MARK: - Timer

    /*
     Function name: startTimer
     Function description: Inicia o cronômetro da sessão, atualizando
                           sessionDurationMs a cada segundo para a UI.
     Inputs: Nenhum
     Outputs: void
     */
    const startTimer = useCallback(() => {
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setSessionDurationMs(Date.now() - startTime);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // MARK: - Session Control

    /*
     Function name: startSession
     Function description: Inicia uma nova sessão de treino. Gera o sessionID,
                           armazena o contexto local e envia START_SESSION ao Watch.
     Inputs:
       - exerciseID: ExerciseID — exercício selecionado na UI
     Outputs: Promise<void>
     */
    const startSession = useCallback(async (exerciseID: ExerciseID) => {
        const exercise = EXERCISES.find((e) => e.id === exerciseID);
        if (!exercise) return;

        const sessionID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const mode = exercise.requiresMotionTracking ? 'full' : 'physiological_only';

        sessionRef.current = {
            sessionID,
            exerciseID,
            startedAt: Date.now(),
            samples: [],
        };

        setCurrentExerciseID(exerciseID);
        setWorkoutState('active');
        startTimer();

        await sendStartSession(sessionID, exerciseID, mode);
    }, [startTimer]);

    /*
     Function name: stopSession
     Function description: Finaliza a sessão ativa. Para o timer e envia
                           STOP_SESSION ao Watch. A sessão será persistida
                           quando o lote chegar via handleBatchReceived.
     Inputs: Nenhum
     Outputs: Promise<void>
     */
    const stopSession = useCallback(async () => {
        stopTimer();
        await sendStopSession();
        // workoutState → 'saving' será definido em handleBatchReceived
    }, [stopTimer]);

    /*
     Function name: updateExercise
     Function description: Troca o exercício atual sem encerrar a sessão global.
                           Envia UPDATE_CONTEXT ao Watch.
     Inputs:
       - exerciseID: ExerciseID — novo exercício
     Outputs: Promise<void>
     */
    const updateExercise = useCallback(async (exerciseID: ExerciseID) => {
        const exercise = EXERCISES.find((e) => e.id === exerciseID);
        if (!exercise) return;

        const mode = exercise.requiresMotionTracking ? 'full' : 'physiological_only';
        setCurrentExerciseID(exerciseID);
        await sendUpdateContext(exerciseID, mode);
    }, []);

    return {
        workoutState,
        currentExerciseID,
        sessionDurationMs,
        currentHeartRate,
        isWatchReachable,
        startSession,
        stopSession,
        updateExercise,
    };
}
