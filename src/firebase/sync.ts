import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseServices, isFirebaseConfigured } from "@/src/firebase/config";
import { database } from "@/src/storage/database";
import type { LiveExerciseGroup, LiveExerciseSample, LiveExerciseSessionRecord, UserProfile } from "@/src/types/health";

export type FirebaseAuthResult = {
  profile: UserProfile;
  synced: boolean;
};

export const createFirebaseAccount = async (
  profile: UserProfile,
  password: string,
): Promise<FirebaseAuthResult> => {
  const services = getFirebaseServices();

  if (!services) {
    await database.saveUserProfile(profile, password);
    return { profile, synced: false };
  }

  const credential = await createUserWithEmailAndPassword(services.auth, profile.email, password);
  await updateProfile(credential.user, { displayName: profile.name });

  const firebaseProfile = { ...profile, id: credential.user.uid };
  await database.saveUserProfile(firebaseProfile, password);

  try {
    await uploadProfile(firebaseProfile, credential.user.uid);
    await syncLocalDataToFirebase(firebaseProfile);
  } catch (syncError) {
    console.warn("Firebase account created, but initial sync failed.", syncError);
    return { profile: firebaseProfile, synced: false };
  }

  return { profile: firebaseProfile, synced: true };
};

export const signInFirebaseAccount = async (email: string, password: string): Promise<FirebaseAuthResult | null> => {
  const services = getFirebaseServices();

  if (!services) {
    const profile = await database.authenticateUser(email, password);
    return profile ? { profile, synced: false } : null;
  }

  const credential = await signInWithEmailAndPassword(services.auth, email, password);
  const user = credential.user;
  const localProfile = await database.getUserProfile();
  const profile = makeProfileFromFirebaseUser(user, localProfile);

  await database.saveUserProfile(profile, password);

  try {
    await uploadProfile(profile, user.uid);
    await syncLocalDataToFirebase(profile);
  } catch (syncError) {
    console.warn("Firebase sign in succeeded, but sync failed.", syncError);
    return { profile, synced: false };
  }

  return { profile, synced: true };
};

export const signOutFirebaseAccount = async () => {
  const services = getFirebaseServices();

  if (services) {
    await signOut(services.auth);
  }

  await database.logoutUser();
};

export const syncLocalDataToFirebase = async (profile?: UserProfile | null) => {
  if (!isFirebaseConfigured()) {
    return { synced: false, sessionCount: 0 };
  }

  const services = getFirebaseServices();
  const activeProfile = profile ?? (await database.getUserProfile());

  if (!services || !activeProfile) {
    return { synced: false, sessionCount: 0 };
  }

  const sessions = await database.getLiveExerciseSessions(100);

  try {
    await uploadProfile(activeProfile, activeProfile.id);
    await uploadSessions(activeProfile.id, sessions);
  } catch (syncError) {
    console.warn("Firebase sync failed.", syncError);
    return { synced: false, sessionCount: sessions.length };
  }

  return { synced: true, sessionCount: sessions.length };
};

export const fetchExerciseGroupsFromFirebase = async (
  profile?: UserProfile | null,
  maxSessions = 100,
): Promise<LiveExerciseGroup[] | null> => {
  if (!isFirebaseConfigured() || !profile) {
    return null;
  }

  const services = getFirebaseServices();

  if (!services) {
    return null;
  }

  const sessionsQuery = query(
    collection(services.db, "users", profile.id, "exerciseSessions"),
    orderBy("startedAt", "desc"),
    firestoreLimit(maxSessions),
  );
  const snapshot = await getDocs(sessionsQuery);
  const sessions = snapshot.docs
    .map((documentSnapshot) => mapFirebaseSession(documentSnapshot.data()))
    .filter((session): session is LiveExerciseSessionRecord => Boolean(session));

  return groupExerciseSessions(sessions);
};

const uploadProfile = async (profile: UserProfile, uid: string) => {
  const services = getFirebaseServices();

  if (!services) {
    return;
  }

  await setDoc(
    doc(services.db, "users", uid),
    {
      id: uid,
      name: profile.name,
      email: profile.email,
      age: profile.age,
      sex: profile.sex,
      trainingExperience: profile.trainingExperience,
      createdAt: profile.createdAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const uploadSessions = async (uid: string, sessions: LiveExerciseSessionRecord[]) => {
  const services = getFirebaseServices();

  if (!services || sessions.length === 0) {
    return;
  }

  const chunkSize = 20;
  for (let index = 0; index < sessions.length; index += chunkSize) {
    const batch = writeBatch(services.db);
    const chunk = sessions.slice(index, index + chunkSize);

    for (const session of chunk) {
      batch.set(
        doc(services.db, "users", uid, "exerciseSessions", session.sessionId),
        {
          sessionId: session.sessionId,
          exerciseId: session.exerciseId,
          exerciseName: session.exerciseName,
          day: session.day,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          setCount: session.setCount,
          reps: session.reps,
          detectedReps: session.detectedReps ?? null,
          samples: session.samples,
          sampleCount: session.samples.length,
          syncedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }
};

const mapFirebaseSession = (data: Record<string, unknown>): LiveExerciseSessionRecord | null => {
  const sessionId = stringValue(data.sessionId);
  const exerciseId = stringValue(data.exerciseId);
  const exerciseName = stringValue(data.exerciseName);
  const startedAt = stringValue(data.startedAt);
  const endedAt = stringValue(data.endedAt);

  if (!sessionId || !exerciseId || !exerciseName || !startedAt || !endedAt) {
    return null;
  }

  return {
    sessionId,
    exerciseId,
    exerciseName,
    day: stringValue(data.day) || startedAt.slice(0, 10),
    startedAt,
    endedAt,
    setCount: numberValue(data.setCount) ?? 1,
    reps: numberValue(data.reps),
    detectedReps: numberValue(data.detectedReps),
    samples: Array.isArray(data.samples)
      ? data.samples
          .map((sample, index) => mapFirebaseSample(sample, { sessionId, exerciseId, exerciseName }, index))
          .filter((sample): sample is LiveExerciseSample => Boolean(sample))
      : [],
  };
};

const mapFirebaseSample = (
  value: unknown,
  fallback: Pick<LiveExerciseSample, "sessionId" | "exerciseId" | "exerciseName">,
  index: number,
): LiveExerciseSample | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const timestamp = stringValue(data.timestamp);

  if (!timestamp) {
    return null;
  }

  return {
    id: stringValue(data.id) || `${fallback.sessionId}-${index}`,
    sessionId: stringValue(data.sessionId) || fallback.sessionId,
    exerciseId: stringValue(data.exerciseId) || fallback.exerciseId,
    exerciseName: stringValue(data.exerciseName) || fallback.exerciseName,
    timestamp,
    heartRate: numberValue(data.heartRate),
    activeEnergyBurned: numberValue(data.activeEnergyBurned),
    distance: numberValue(data.distance),
    stepCount: numberValue(data.stepCount),
    oxygenSaturation: numberValue(data.oxygenSaturation),
    accelerationX: numberValue(data.accelerationX),
    accelerationY: numberValue(data.accelerationY),
    accelerationZ: numberValue(data.accelerationZ),
    gyroscopeX: numberValue(data.gyroscopeX),
    gyroscopeY: numberValue(data.gyroscopeY),
    gyroscopeZ: numberValue(data.gyroscopeZ),
  };
};

const groupExerciseSessions = (sessions: LiveExerciseSessionRecord[]): LiveExerciseGroup[] => {
  const groups = new Map<string, LiveExerciseGroup>();

  for (const session of sessions) {
    const key = `${session.day}:${session.exerciseId}`;
    const currentGroup = groups.get(key);

    if (!currentGroup) {
      groups.set(key, {
        day: session.day,
        exerciseId: session.exerciseId,
        exerciseName: session.exerciseName,
        setCount: session.setCount,
        totalReps: session.reps ?? 0,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        samples: [...session.samples],
      });
      continue;
    }

    currentGroup.setCount += session.setCount;
    currentGroup.totalReps += session.reps ?? 0;
    currentGroup.startedAt = currentGroup.startedAt < session.startedAt ? currentGroup.startedAt : session.startedAt;
    currentGroup.endedAt = currentGroup.endedAt > session.endedAt ? currentGroup.endedAt : session.endedAt;
    currentGroup.samples.push(...session.samples);
  }

  return Array.from(groups.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
};

const stringValue = (value: unknown) => (typeof value === "string" ? value : "");
const numberValue = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const makeProfileFromFirebaseUser = (user: User, fallback: UserProfile | null): UserProfile => ({
  id: user.uid,
  name: user.displayName ?? fallback?.name ?? "Atleta",
  email: user.email ?? fallback?.email ?? "",
  age: fallback?.age ?? 18,
  sex: fallback?.sex ?? "homem",
  trainingExperience: fallback?.trainingExperience ?? "iniciante",
  createdAt: fallback?.createdAt ?? new Date().toISOString(),
});
