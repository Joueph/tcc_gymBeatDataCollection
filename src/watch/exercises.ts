export type Exercise = {
  id: string;
  name: string;
  category: string;
};

export const exercises: Exercise[] = [
  { id: "bench-press", name: "Supino reto", category: "Peito" },
  { id: "squat", name: "Agachamento livre", category: "Pernas" },
  { id: "deadlift", name: "Levantamento terra", category: "Posterior" },
  { id: "pull-up", name: "Barra fixa", category: "Costas" },
  { id: "shoulder-press", name: "Desenvolvimento", category: "Ombros" },
];

export const findExercise = (id?: string) => exercises.find((exercise) => exercise.id === id);
