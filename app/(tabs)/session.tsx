// GymBeat — React Native
// app/(tabs)/session.tsx
// Tela de sessão ativa — exibe BPM, timer, status do Watch
// e controles de iniciar/parar série.

import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { EXERCISES } from '@/constants/exercises';
import { ExerciseID } from '@/types/telemetry';

// MARK: - Design Tokens

const C = {
    white: '#FFFFFF',
    bg: '#F9F9FB',
    border: '#EBEBF0',
    text: '#1C1C1E',
    textSub: '#8E8E93',
    textMuted: '#AEAEB2',
    accentSoft: '#F2F2F7',
    red: '#FF3B30',
    redSoft: '#FFF1F0',
    green: '#34C759',
    greenSoft: '#F0FFF4',
    orange: '#FF9500',
};

// MARK: - Helpers

function formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// MARK: - HeartRateDisplay

function HeartRateDisplay({ bpm }: { bpm: number | null }) {
    return (
        <View style={hrStyles.container}>
            <View style={hrStyles.iconRow}>
                <IconSymbol name="heart.fill" size={18} color={C.red} />
                <Text style={hrStyles.label}>Frequência Cardíaca</Text>
            </View>
            <View style={hrStyles.valueRow}>
                {bpm !== null ? (
                    <>
                        <Text style={hrStyles.value}>{Math.round(bpm)}</Text>
                        <Text style={hrStyles.unit}>bpm</Text>
                    </>
                ) : (
                    <Text style={hrStyles.dash}>—</Text>
                )}
            </View>
        </View>
    );
}

const hrStyles = StyleSheet.create({
    container: {
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: C.textSub,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },
    value: {
        fontSize: 72,
        fontWeight: '700',
        color: C.text,
        letterSpacing: -2,
        lineHeight: 76,
    },
    unit: {
        fontSize: 20,
        fontWeight: '400',
        color: C.textSub,
        marginBottom: 10,
    },
    dash: {
        fontSize: 72,
        fontWeight: '200',
        color: C.textMuted,
        lineHeight: 76,
    },
});

// MARK: - ConnectionBadge

function ConnectionBadge({ isReachable }: { isReachable: boolean }) {
    return (
        <View style={[
            badgeStyles.container,
            isReachable ? badgeStyles.connected : badgeStyles.disconnected
        ]}>
            <View style={[
                badgeStyles.dot,
                isReachable ? badgeStyles.dotConnected : badgeStyles.dotDisconnected
            ]} />
            <Text style={[
                badgeStyles.text,
                isReachable ? badgeStyles.textConnected : badgeStyles.textDisconnected
            ]}>
                {isReachable ? 'Watch conectado' : 'Watch desconectado'}
            </Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    connected: { backgroundColor: C.greenSoft },
    disconnected: { backgroundColor: C.accentSoft },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    dotConnected: { backgroundColor: C.green },
    dotDisconnected: { backgroundColor: C.textMuted },
    text: {
        fontSize: 12,
        fontWeight: '500',
    },
    textConnected: { color: '#1A7A3C' },
    textDisconnected: { color: C.textSub },
});

// MARK: - SessionScreen

export default function SessionScreen() {
    const params = useLocalSearchParams<{ exerciseID?: string }>();

    const {
        workoutState,
        currentExerciseID,
        sessionDurationMs,
        currentHeartRate,
        isWatchReachable,
        startSession,
        stopSession,
    } = useWorkoutSession();

    // Auto-inicia se chegou via navegação com exerciseID
    useEffect(() => {
        if (params.exerciseID && workoutState === 'idle') {
            startSession(params.exerciseID as ExerciseID);
        }
    }, [params.exerciseID]);

    const exercise = EXERCISES.find((e) => e.id === currentExerciseID);
    const isActive = workoutState === 'active';
    const isSaving = workoutState === 'saving';

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerEyebrow}>SESSÃO ATIVA</Text>
                        <Text style={styles.headerTitle}>
                            {exercise?.displayName ?? 'Pronto para iniciar'}
                        </Text>
                    </View>
                    <ConnectionBadge isReachable={isWatchReachable} />
                </View>

                {/* Timer */}
                {isActive && (
                    <View style={styles.timerRow}>
                        <IconSymbol name="timer" size={14} color={C.textMuted} />
                        <Text style={styles.timerText}>{formatDuration(sessionDurationMs)}</Text>
                    </View>
                )}

                {/* Heart Rate */}
                <View style={styles.hrWrapper}>
                    <HeartRateDisplay bpm={currentHeartRate} />
                </View>

                {/* Status Cards */}
                {isActive && (
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Modo</Text>
                            <Text style={styles.statValue}>
                                {exercise?.requiresMotionTracking ? 'IMU + HR' : 'HR'}
                            </Text>
                        </View>
                        <View style={[styles.statCard, styles.statCardMiddle]}>
                            <Text style={styles.statLabel}>Estado</Text>
                            <View style={styles.statRecRow}>
                                <View style={styles.recDot} />
                                <Text style={[styles.statValue, { color: C.red }]}>REC</Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Protocolo</Text>
                            <Text style={styles.statValue}>50 Hz</Text>
                        </View>
                    </View>
                )}

                {/* Saving State */}
                {isSaving && (
                    <View style={styles.savingBox}>
                        <ActivityIndicator size="small" color={C.textSub} />
                        <Text style={styles.savingText}>Salvando dados no Firebase…</Text>
                    </View>
                )}

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* CTA Button */}
                {workoutState === 'idle' && (
                    <TouchableOpacity
                        style={styles.btnStart}
                        onPress={() =>
                            startSession(
                                (params.exerciseID as ExerciseID) ?? 'supino_reto'
                            )
                        }
                        activeOpacity={0.85}>
                        <Text style={styles.btnStartText}>Iniciar Série</Text>
                    </TouchableOpacity>
                )}

                {isActive && (
                    <TouchableOpacity
                        style={styles.btnStop}
                        onPress={stopSession}
                        activeOpacity={0.85}>
                        <View style={styles.btnStopInner}>
                            <View style={styles.btnStopSquare} />
                        </View>
                        <Text style={styles.btnStopText}>Parar Série</Text>
                    </TouchableOpacity>
                )}

            </View>
        </SafeAreaView>
    );
}

// MARK: - Styles

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: C.bg,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 24,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.0,
        color: C.textMuted,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: C.text,
        letterSpacing: -0.3,
        maxWidth: 200,
    },

    // Timer
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '500',
        color: C.textSub,
        fontVariant: ['tabular-nums'],
    },

    // Heart Rate
    hrWrapper: {
        marginBottom: 16,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: C.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
    },
    statCardMiddle: {},
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: C.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '600',
        color: C.text,
    },
    statRecRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    recDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: C.red,
    },

    // Saving
    savingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.accentSoft,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    savingText: {
        fontSize: 14,
        color: C.textSub,
    },

    // Buttons
    btnStart: {
        backgroundColor: C.text,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    btnStartText: {
        fontSize: 17,
        fontWeight: '600',
        color: C.white,
        letterSpacing: 0.2,
    },
    btnStop: {
        backgroundColor: C.redSoft,
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#FFD5D3',
    },
    btnStopInner: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: C.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnStopSquare: {
        width: 8,
        height: 8,
        backgroundColor: C.white,
        borderRadius: 1,
    },
    btnStopText: {
        fontSize: 17,
        fontWeight: '600',
        color: C.red,
        letterSpacing: 0.2,
    },
});
