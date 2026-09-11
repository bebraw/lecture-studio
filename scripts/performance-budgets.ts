export interface PerformanceMetrics {
  lcpMs: number;
  cls: number;
  tbtMs: number;
  transferBytes: number;
}
export function budgetFailures(
  actual: PerformanceMetrics,
  budget: PerformanceMetrics,
) {
  return (Object.keys(budget) as (keyof PerformanceMetrics)[]).flatMap(
    (key) => {
      if (
        !Number.isFinite(budget[key]) ||
        budget[key] < 0 ||
        !Number.isFinite(actual[key])
      )
        throw new Error(`Invalid performance metric or budget: ${key}`);
      return actual[key] > budget[key]
        ? [`${key}: ${actual[key]} exceeds ${budget[key]}`]
        : [];
    },
  );
}
