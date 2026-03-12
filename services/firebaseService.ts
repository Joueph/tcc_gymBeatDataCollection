// GymBeat — React Native
// services/firebaseService.ts
// Persistência das sessões de telemetria no Firestore via Firebase JS SDK.
// Estrutura de coleções:
//   sessions/{sessionID}         → metadados da sessão
//   sessions/{sessionID}/samples → array de TelemetrySample (batch write)

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    writeBatch,
    getDocs,
    query,
    orderBy,
    Firestore,
} from 'firebase/firestore';
import { TelemetrySample, WorkoutSession } from '@/types/telemetry';

// MARK: - Firebase Config
// ⚠️ Substitua pelos valores do seu projeto no Firebase Console

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCkqI_8KPmGjCZzEWR4iHXxepopjsYzVV8",
    authDomain: "tcc-datacollection.firebaseapp.com",
    projectId: "tcc-datacollection",
    storageBucket: "tcc-datacollection.firebasestorage.app",
    messagingSenderId: "435430670849",
    appId: "1:435430670849:web:933180045bcde98db27600"
};

// MARK: - Singleton Initialization

/*
 Function name: getFirebaseApp
 Function description: Retorna a instância singleton do Firebase App,
                       inicializando apenas na primeira chamada.
 Inputs: Nenhum
 Outputs: FirebaseApp
 */
function getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp(FIREBASE_CONFIG);
}

function getDb(): Firestore {
    return getFirestore(getFirebaseApp());
}

// MARK: - Session Operations

/*
 Function name: saveSessionMetadata
 Function description: Persiste os metadados de uma sessão (exercício,
                       timestamps, contagem de amostras) no Firestore.
                       Deve ser chamado ANTES do saveTelemetryBatch.
 Inputs:
   - session: WorkoutSession — objeto completo da sessão (sem samples)
 Outputs: Promise<void>
 */
export async function saveSessionMetadata(session: WorkoutSession): Promise<void> {
    const db = getDb();
    const sessionRef = doc(db, 'sessions', session.sessionID);

    await setDoc(sessionRef, {
        sessionID: session.sessionID,
        exerciseID: session.exerciseID,
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? null,
        sampleCount: session.samples.length,
        userId: session.userId ?? null,
        createdAt: Date.now(),
    });
}

/*
 Function name: saveTelemetryBatch
 Function description: Persiste o lote de TelemetrySamples recebidos do
                       Watch usando Firestore writeBatch para garantir
                       atomicidade. Firestore tem limite de 500 ops por
                       batch — esta função divide automaticamente se necessário.
 Inputs:
   - sessionID: string — ID da sessão pai
   - samples: TelemetrySample[] — array recebido do Watch
 Outputs: Promise<void>
 */
export async function saveTelemetryBatch(
    sessionID: string,
    samples: TelemetrySample[],
): Promise<void> {
    const db = getDb();
    const BATCH_LIMIT = 499;

    // Divide em chunks de 499 para respeitar o limite do Firestore
    for (let i = 0; i < samples.length; i += BATCH_LIMIT) {
        const chunk = samples.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        chunk.forEach((sample) => {
            const sampleRef = doc(
                collection(db, 'sessions', sessionID, 'samples'),
                `${sample.t}` // timestamp como ID garante ordenação e idempotência
            );
            batch.set(sampleRef, sample);
        });

        await batch.commit();
    }
}

/*
 Function name: saveFullSession
 Function description: Conveniência que salva metadados e amostras
                       em sequência. Ponto de entrada principal após
                       receber o lote do Watch.
 Inputs:
   - session: WorkoutSession — sessão com samples preenchido
 Outputs: Promise<void>
 */
export async function saveFullSession(session: WorkoutSession): Promise<void> {
    await saveSessionMetadata(session);
    await saveTelemetryBatch(session.sessionID, session.samples);
}

/*
 Function name: getSessions
 Function description: Busca todas as sessões salvas, ordenadas por
                       data de início decrescente (mais recente primeiro).
 Inputs: Nenhum
 Outputs: Promise<Omit<WorkoutSession, 'samples'>[]>
 */
export async function getSessions(): Promise<Omit<WorkoutSession, 'samples'>[]> {
    const db = getDb();
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => d.data() as Omit<WorkoutSession, 'samples'>);
}
