// GymBeat — React Native
// constants/exercises.ts
// Lista de exercícios alvo do sistema — única fonte de verdade
// para os IDs enviados ao Watch via WatchConnectivity.

import { Exercise } from '@/types/telemetry';

export const EXERCISES: Exercise[] = [
    {
        id: 'supino_reto',
        displayName: 'Supino Reto',
        requiresMotionTracking: true,
        icon: 'figure.strengthtraining.traditional',
    },
    {
        id: 'supino_inclinado',
        displayName: 'Supino Inclinado',
        requiresMotionTracking: true,
        icon: 'figure.strengthtraining.traditional',
    },
    {
        id: 'rosca_biceps',
        displayName: 'Rosca Bíceps',
        requiresMotionTracking: true,
        icon: 'figure.arms.open',
    },
    {
        id: 'elevacao_lateral',
        displayName: 'Elevação Lateral',
        requiresMotionTracking: true,
        icon: 'figure.arms.open',
    },
    {
        id: 'abdominal',
        displayName: 'Abdominal',
        requiresMotionTracking: true,
        icon: 'figure.core.training',
    },
];

export const MAX_HEART_RATE = 220;
export const RESTING_HEART_RATE = 60;
