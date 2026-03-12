// GymBeat — React Native
// app/(tabs)/history.tsx
// Histórico de sessões salvas no Firebase — lista cronológica
// com metadados de cada treino.

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSessions } from '@/services/firebaseService';
import { WorkoutSession } from '@/types/telemetry';
import { EXERCISES } from '@/constants/exercises';

// MARK: - Design Tokens

const C = {
  white: '#FFFFFF',
  bg: '#F9F9FB',
  border: '#EBEBF0',
  text: '#1C1C1E',
  textSub: '#8E8E93',
  textMuted: '#AEAEB2',
  accentSoft: '#F2F2F7',
};

// MARK: - Helpers

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startMs: number, endMs?: number): string {
  if (!endMs) return '—';
  const totalSec = Math.floor((endMs - startMs) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// MARK: - SessionRow

type SessionMeta = Omit<WorkoutSession, 'samples'>;

function SessionRow({ session }: { session: SessionMeta }) {
  const exercise = EXERCISES.find((e) => e.id === session.exerciseID);

  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.iconBox}>
        <IconSymbol
          name={(exercise?.icon ?? 'figure.walk') as any}
          size={20}
          color={C.text}
        />
      </View>

      <View style={rowStyles.body}>
        <Text style={rowStyles.title}>{exercise?.displayName ?? session.exerciseID}</Text>
        <Text style={rowStyles.sub}>
          {formatDate(session.startedAt)} · {formatTime(session.startedAt)}
        </Text>
      </View>

      <View style={rowStyles.meta}>
        <Text style={rowStyles.duration}>
          {formatDuration(session.startedAt, session.endedAt)}
        </Text>
        <Text style={rowStyles.sampleCount}>
          {(session as any).sampleCount ?? '—'} amostras
        </Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 3,
  },
  sub: {
    fontSize: 12,
    color: C.textSub,
  },
  meta: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  sampleCount: {
    fontSize: 11,
    color: C.textMuted,
  },
});

// MARK: - EmptyState

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconBox}>
        <IconSymbol name="tray" size={28} color={C.textMuted} />
      </View>
      <Text style={emptyStyles.title}>Nenhuma sessão ainda</Text>
      <Text style={emptyStyles.sub}>
        Complete uma série na aba Sessão para ver o histórico aqui.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingBottom: 80,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// MARK: - HistoryScreen

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   Function name: loadSessions
   Function description: Busca as sessões salvas no Firestore e atualiza
                         o estado local. Chamado no mount e no pull-to-refresh.
   Inputs: Nenhum
   Outputs: Promise<void>
   */
  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      setError('Não foi possível carregar o histórico.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>GymBeat</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Histórico</Text>
          <TouchableOpacity onPress={loadSessions} style={styles.refreshBtn}>
            <IconSymbol name="arrow.clockwise" size={16} color={C.textSub} />
          </TouchableOpacity>
        </View>
        {sessions.length > 0 && (
          <Text style={styles.headerSub}>
            {sessions.length} {sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.textMuted} />
          <Text style={styles.loadingText}>Carregando histórico…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <IconSymbol name="exclamationmark.triangle" size={24} color={C.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSessions}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionID}
          renderItem={({ item }) => <SessionRow session={item} />}
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && { flex: 1 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// MARK: - Styles

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: C.white,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: C.textSub,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  listContent: {
    padding: 24,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.textSub,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.text,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
  },
});
