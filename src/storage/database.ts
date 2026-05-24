import * as SQLite from "expo-sqlite";

import type {
  DashboardSummary,
  HealthMetricType,
  LiveExerciseGroup,
  LiveExerciseSample,
  LiveExerciseSession,
  MetricSample,
  NativeWorkout,
  Workout,
} from "@/src/types/health";

const DATABASE_NAME = "wearable-workout.db";
const LAST_SYNC_KEY = "lastSyncAt";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDatabase = async () => {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  const db = await databasePromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY NOT NULL,
      activity_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration REAL NOT NULL,
      active_energy_burned REAL NOT NULL,
      distance REAL NOT NULL,
      source_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metric_samples (
      id TEXT PRIMARY KEY NOT NULL,
      metric_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS live_exercise_sessions (
      session_id TEXT PRIMARY KEY NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      set_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_exercise_samples (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      heart_rate REAL,
      active_energy_burned REAL,
      distance REAL,
      step_count REAL,
      oxygen_saturation REAL,
      acceleration_x REAL,
      acceleration_y REAL,
      acceleration_z REAL,
      gyroscope_x REAL,
      gyroscope_y REAL,
      gyroscope_z REAL
    );
  `);

  await addMissingLiveSampleColumns(db);

  return db;
};

const addMissingLiveSampleColumns = async (db: SQLite.SQLiteDatabase) => {
  const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(live_exercise_samples)");
  const existingColumns = new Set(columns.map((column) => column.name));
  const requiredColumns: Array<[string, string]> = [
    ["oxygen_saturation", "REAL"],
    ["acceleration_x", "REAL"],
    ["acceleration_y", "REAL"],
    ["acceleration_z", "REAL"],
    ["gyroscope_x", "REAL"],
    ["gyroscope_y", "REAL"],
    ["gyroscope_z", "REAL"],
  ];

  for (const [name, type] of requiredColumns) {
    if (!existingColumns.has(name)) {
      await db.execAsync(`ALTER TABLE live_exercise_samples ADD COLUMN ${name} ${type}`);
    }
  }
};

const mapWorkout = (row: WorkoutRow): Workout => ({
  id: row.id,
  activityType: row.activity_type,
  startDate: row.start_date,
  endDate: row.end_date,
  duration: row.duration,
  durationMinutes: Math.round(row.duration / 60),
  activeEnergyBurned: row.active_energy_burned,
  distance: row.distance,
  sourceName: row.source_name,
});

type WorkoutRow = {
  id: string;
  activity_type: string;
  start_date: string;
  end_date: string;
  duration: number;
  active_energy_burned: number;
  distance: number;
  source_name: string;
};

type MetricSampleRow = {
  metric_type: HealthMetricType;
  start_date: string;
  end_date: string;
  value: number;
  unit: string;
};

type CountRow = {
  count: number;
  duration: number | null;
  energy: number | null;
  distance: number | null;
};

type SyncStateRow = {
  value: string | null;
};

type LiveExerciseSessionRow = {
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  started_at: string;
  ended_at: string;
  set_count: number;
};

type LiveExerciseSampleRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  timestamp: string;
  heart_rate: number | null;
  active_energy_burned: number | null;
  distance: number | null;
  step_count: number | null;
  oxygen_saturation: number | null;
  acceleration_x: number | null;
  acceleration_y: number | null;
  acceleration_z: number | null;
  gyroscope_x: number | null;
  gyroscope_y: number | null;
  gyroscope_z: number | null;
};

const mapLiveSample = (row: LiveExerciseSampleRow): LiveExerciseSample => ({
  id: row.id,
  sessionId: row.session_id,
  exerciseId: row.exercise_id,
  exerciseName: row.exercise_name,
  timestamp: row.timestamp,
  heartRate: row.heart_rate,
  activeEnergyBurned: row.active_energy_burned,
  distance: row.distance,
  stepCount: row.step_count,
  oxygenSaturation: row.oxygen_saturation,
  accelerationX: row.acceleration_x,
  accelerationY: row.acceleration_y,
  accelerationZ: row.acceleration_z,
  gyroscopeX: row.gyroscope_x,
  gyroscopeY: row.gyroscope_y,
  gyroscopeZ: row.gyroscope_z,
});

export const database = {
  async saveWorkouts(workouts: NativeWorkout[]) {
    const db = await getDatabase();

    for (const workout of workouts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO workouts (
          id, activity_type, start_date, end_date, duration, active_energy_burned, distance, source_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        workout.id,
        workout.activityType,
        workout.startDate,
        workout.endDate,
        workout.duration,
        workout.activeEnergyBurned,
        workout.distance,
        workout.sourceName,
      );
    }
  },

  async saveMetricSamples(samples: MetricSample[]) {
    const db = await getDatabase();

    for (const sample of samples) {
      const id = `${sample.type}:${sample.startDate}:${sample.endDate}`;
      await db.runAsync(
        `INSERT OR REPLACE INTO metric_samples (
          id, metric_type, start_date, end_date, value, unit
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        sample.type,
        sample.startDate,
        sample.endDate,
        sample.value,
        sample.unit,
      );
    }
  },

  async setLastSyncAt(value: string) {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)",
      LAST_SYNC_KEY,
      value,
    );
  },

  async getLastSyncAt() {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SyncStateRow>(
      "SELECT value FROM sync_state WHERE key = ?",
      LAST_SYNC_KEY,
    );
    return row?.value ?? null;
  },

  async getWorkouts() {
    const db = await getDatabase();
    const rows = await db.getAllAsync<WorkoutRow>(
      "SELECT * FROM workouts ORDER BY start_date DESC",
    );
    return rows.map(mapWorkout);
  },

  async getWorkout(id: string) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<WorkoutRow>("SELECT * FROM workouts WHERE id = ?", id);
    return row ? mapWorkout(row) : null;
  },

  async getMetricSamples(type: HealthMetricType, startDate: string, endDate: string) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MetricSampleRow>(
      `SELECT metric_type, start_date, end_date, value, unit
       FROM metric_samples
       WHERE metric_type = ? AND start_date >= ? AND end_date <= ?
       ORDER BY start_date ASC`,
      type,
      startDate,
      endDate,
    );

    return rows.map((row) => ({
      type: row.metric_type,
      startDate: row.start_date,
      endDate: row.end_date,
      value: row.value,
      unit: row.unit,
    }));
  },

  async getSummary(days: number): Promise<DashboardSummary> {
    const db = await getDatabase();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const row = await db.getFirstAsync<CountRow>(
      `SELECT
        COUNT(*) as count,
        SUM(duration) as duration,
        SUM(active_energy_burned) as energy,
        SUM(distance) as distance
       FROM workouts
       WHERE start_date >= ?`,
      startDate,
    );

    return {
      workoutCount: row?.count ?? 0,
      totalDurationMinutes: Math.round((row?.duration ?? 0) / 60),
      totalEnergyBurned: Math.round(row?.energy ?? 0),
      totalDistance: Math.round(row?.distance ?? 0),
      lastSyncAt: await this.getLastSyncAt(),
    };
  },

  async saveLiveExerciseSession(session: LiveExerciseSession) {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO live_exercise_sessions (
          session_id, exercise_id, exercise_name, started_at, ended_at, set_count
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        session.sessionId,
        session.exerciseId,
        session.exerciseName,
        session.startedAt,
        session.endedAt,
        session.setCount,
      );

      for (const [index, sample] of session.samples.entries()) {
        const id = sample.id ?? `${session.sessionId}:${sample.timestamp}:${index}`;
        await db.runAsync(
          `INSERT OR REPLACE INTO live_exercise_samples (
            id, session_id, exercise_id, exercise_name, timestamp,
            heart_rate, active_energy_burned, distance, step_count,
            oxygen_saturation, acceleration_x, acceleration_y, acceleration_z,
            gyroscope_x, gyroscope_y, gyroscope_z
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          session.sessionId,
          session.exerciseId,
          session.exerciseName,
          sample.timestamp,
          sample.heartRate,
          sample.activeEnergyBurned,
          sample.distance,
          sample.stepCount,
          sample.oxygenSaturation,
          sample.accelerationX,
          sample.accelerationY,
          sample.accelerationZ,
          sample.gyroscopeX,
          sample.gyroscopeY,
          sample.gyroscopeZ,
        );
      }
    });
  },

  async getLiveExerciseGroups(limit = 20): Promise<LiveExerciseGroup[]> {
    const db = await getDatabase();
    const sessions = await db.getAllAsync<LiveExerciseSessionRow>(
      `SELECT session_id, exercise_id, exercise_name, started_at, ended_at, set_count
       FROM live_exercise_sessions
       ORDER BY started_at DESC
       LIMIT ?`,
      limit,
    );

    if (sessions.length === 0) {
      return [];
    }

    const samples = await db.getAllAsync<LiveExerciseSampleRow>(
      `SELECT
        id, session_id, exercise_id, exercise_name, timestamp,
        heart_rate, active_energy_burned, distance, step_count,
        oxygen_saturation, acceleration_x, acceleration_y, acceleration_z,
        gyroscope_x, gyroscope_y, gyroscope_z
       FROM live_exercise_samples
       WHERE session_id IN (${sessions.map(() => "?").join(",")})
       ORDER BY timestamp ASC`,
      ...sessions.map((session) => session.session_id),
    );

    const samplesBySession = new Map<string, LiveExerciseSample[]>();
    for (const sample of samples.map(mapLiveSample)) {
      const currentSamples = samplesBySession.get(sample.sessionId) ?? [];
      currentSamples.push(sample);
      samplesBySession.set(sample.sessionId, currentSamples);
    }

    const groups = new Map<string, LiveExerciseGroup>();

    for (const session of sessions) {
      const day = session.started_at.slice(0, 10);
      const key = `${day}:${session.exercise_id}`;
      const currentGroup = groups.get(key);
      const sessionSamples = samplesBySession.get(session.session_id) ?? [];

      if (!currentGroup) {
        groups.set(key, {
          day,
          exerciseId: session.exercise_id,
          exerciseName: session.exercise_name,
          setCount: session.set_count,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          samples: sessionSamples,
        });
        continue;
      }

      currentGroup.setCount += session.set_count;
      currentGroup.startedAt = currentGroup.startedAt < session.started_at ? currentGroup.startedAt : session.started_at;
      currentGroup.endedAt = currentGroup.endedAt > session.ended_at ? currentGroup.endedAt : session.ended_at;
      currentGroup.samples.push(...sessionSamples);
    }

    return Array.from(groups.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
};
