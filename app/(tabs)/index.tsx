// GymBeat — React Native
// app/(tabs)/index.tsx
// Tela de seleção de exercício — ponto de entrada do fluxo de treino.
// Estilo: branco clínico, tipografia refinada, cartões com sombra suave.

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EXERCISES } from '@/constants/exercises';
import { Exercise } from '@/types/telemetry';

// MARK: - Design Tokens

const C = {
  white: '#FFFFFF',
  bg: '#F9F9FB',
  surface: '#FFFFFF',
  border: '#EBEBF0',
  text: '#1C1C1E',
  textSub: '#8E8E93',
  textMuted: '#AEAEB2',
  accent: '#1C1C1E',
  accentSoft: '#F2F2F7',
  red: '#FF3B30',
  green: '#34C759',
};

// MARK: - ExerciseCard

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

function ExerciseCard({ exercise, onPress }: ExerciseCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.cardIconBox}>
        <IconSymbol
          name={exercise.icon as any}
          size={22}
          color={C.text}
        />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{exercise.displayName}</Text>
        <Text style={styles.cardSub}>
          {exercise.requiresMotionTracking ? 'IMU + Frequência cardíaca' : 'Frequência cardíaca'}
        </Text>
      </View>

      <View style={styles.cardChevron}>
        <IconSymbol name="chevron.right" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// MARK: - IndexScreen

export default function IndexScreen() {
  const router = useRouter();

  const handleSelectExercise = (exercise: Exercise) => {
    router.push({
      pathname: '/(tabs)/session',
      params: { exerciseID: exercise.id },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>GymBeat</Text>
          <Text style={styles.headerTitle}>Selecione o{'\n'}exercício</Text>
          <Text style={styles.headerSub}>
            O Apple Watch iniciará a coleta de dados automaticamente.
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Exercise List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXERCÍCIOS DISPONÍVEIS</Text>
          <View style={styles.cardList}>
            {EXERCISES.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onPress={() => handleSelectExercise(exercise)}
              />
            ))}
          </View>
        </View>

        {/* Info Footer */}
        <View style={styles.infoBox}>
          <IconSymbol name="applewatch" size={16} color={C.textMuted} />
          <Text style={styles.infoText}>
            Mantenha o Apple Watch no pulso e o Bluetooth ativo antes de iniciar.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// MARK: - Styles

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: C.white,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 10,
  },
  headerSub: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 0,
  },

  // Section
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  cardList: {
    gap: 10,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 12,
    color: C.textSub,
  },
  cardChevron: {
    marginLeft: 8,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 28,
    padding: 16,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: C.textSub,
    lineHeight: 18,
  },
});
