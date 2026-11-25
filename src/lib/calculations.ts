export type ScalePoint = { grade: number; score: number };
export type GradeSystem = { direction: "higher_is_better" | "lower_is_better"; scale: ScalePoint[] };
export type GradeRecord = { value: number; weight: number };
export type CategoryRecord = { weight: number; grades: GradeRecord[] };

export function normalizeGrade(value: number, system: GradeSystem): number | null {
  const points = [...system.scale].sort((a, b) => a.grade - b.grade);
  if (!points.length || !Number.isFinite(value)) return null;
  if (value < points[0].grade || value > points[points.length - 1].grade) return null;
  const exact = points.find((p) => p.grade === value);
  if (exact) return exact.score;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (value >= a.grade && value <= b.grade) {
      const ratio = (value - a.grade) / (b.grade - a.grade);
      return a.score + ratio * (b.score - a.score);
    }
  }
  return null;
}

export function weightedAverage(items: { value: number; weight: number }[]): number | null {
  const valid = items.filter((x) => Number.isFinite(x.value) && Number.isFinite(x.weight) && x.weight > 0);
  const totalWeight = valid.reduce((sum, x) => sum + x.weight, 0);
  if (!valid.length || totalWeight <= 0) return null;
  return valid.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight;
}

export function calculateSubjectAverage(categories: CategoryRecord[], system: GradeSystem): number | null {
  const categoryAverages = categories.flatMap((category) => {
    const grades = category.grades.map((g) => ({ value: normalizeGrade(g.value, system), weight: g.weight }))
      .filter((g): g is { value: number; weight: number } => g.value !== null);
    const average = weightedAverage(grades);
    return average === null ? [] : [{ value: average, weight: category.weight }];
  });
  return weightedAverage(categoryAverages);
}

export function calculateOverallAverage(subjects: { average: number | null; weight: number }[]): number | null {
  return weightedAverage(subjects.flatMap((s) => s.average === null ? [] : [{ value: s.average, weight: s.weight }]));
}

export function formatAverage(value: number | null): string {
  return value === null ? "–" : value.toFixed(2);
}
