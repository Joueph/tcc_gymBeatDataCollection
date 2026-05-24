import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";

import { getFirebaseServices, isFirebaseConfigured } from "@/src/firebase/config";
import { database } from "@/src/storage/database";
import type { LiveExerciseSessionRecord, UserProfile } from "@/src/types/health";

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
  await database.saveUserProfile(firebaseProfile);
  await uploadProfile(firebaseProfile, credential.user.uid);
  await syncLocalDataToFirebase(firebaseProfile);

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

  await database.saveUserProfile(profile);
  await uploadProfile(profile, user.uid);
  await syncLocalDataToFirebase(profile);

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

  await uploadProfile(activeProfile, activeProfile.id);

  const sessions = await database.getLiveExerciseSessions(100);
  await uploadSessions(activeProfile.id, sessions);

  return { synced: true, sessionCount: sessions.length };
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

const makeProfileFromFirebaseUser = (user: User, fallback: UserProfile | null): UserProfile => ({
  id: user.uid,
  name: user.displayName ?? fallback?.name ?? "Atleta",
  email: user.email ?? fallback?.email ?? "",
  age: fallback?.age ?? 18,
  sex: fallback?.sex ?? "homem",
  trainingExperience: fallback?.trainingExperience ?? "iniciante",
  createdAt: fallback?.createdAt ?? new Date().toISOString(),
});
