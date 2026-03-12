// GymBeat — React Native
// hooks/useSensorData.ts
// Gerencia o estado reativo dos dados recebidos do Apple Watch
// em tempo real. Expõe BPM atual, status de conexão e o lote
// mais recente de amostras recebido ao fim de cada série.

import { useState, useEffect, useCallback } from 'react';
import { TelemetrySample } from '@/types/telemetry';
import {
    initWatchConnectivity,
    getWatchReachability,
} from '@/services/watchConnectivity';

// MARK: - Hook Return Type

export interface SensorData {
    currentHeartRate: number | null;   // BPM mais recente (atualizado a 1Hz)
    isWatchReachable: boolean;         // Status da conexão Bluetooth
    lastBatch: TelemetrySample[];      // Último lote recebido do Watch
    lastSessionID: string | null;      // ID da sessão do último lote
}

// MARK: - useSensorData

/*
 Function name: useSensorData
 Function description: Custom Hook que inicializa os listeners do
                       WatchConnectivity e expõe estado reativo para
                       os componentes de UI. Segue a separação de
                       camadas definida em code_standards.md §2.A —
                       a UI não acessa o serviço diretamente.
 Inputs:
   - onBatchReceived: (sessionID, samples) => void — callback disparado
     quando o Watch envia o lote completo ao fim de uma série.
     Usado pelo useWorkoutSession para persistir no Firebase.
 Outputs: SensorData
 */
export function useSensorData(
    onBatchReceived: (sessionID: string, samples: TelemetrySample[]) => void
): SensorData {
    const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
    const [isWatchReachable, setIsWatchReachable] = useState(false);
    const [lastBatch, setLastBatch] = useState<TelemetrySample[]>([]);
    const [lastSessionID, setLastSessionID] = useState<string | null>(null);

    /*
     Function name: handleBatchReceived
     Function description: Armazena o lote localmente e repassa para o
                           callback externo (useWorkoutSession → Firebase).
     Inputs:
       - sessionID: string
       - samples: TelemetrySample[]
     Outputs: void
     */
    const handleBatchReceived = useCallback(
        (sessionID: string, samples: TelemetrySample[]) => {
            setLastBatch(samples);
            setLastSessionID(sessionID);
            onBatchReceived(sessionID, samples);
        },
        [onBatchReceived]
    );

    // Verifica reachability inicial e inicializa listeners
    useEffect(() => {
        getWatchReachability().then(setIsWatchReachable);

        const cleanup = initWatchConnectivity(
            setCurrentHeartRate,
            handleBatchReceived,
            setIsWatchReachable,
        );

        return cleanup;
    }, [handleBatchReceived]);

    return {
        currentHeartRate,
        isWatchReachable,
        lastBatch,
        lastSessionID,
    };
}
