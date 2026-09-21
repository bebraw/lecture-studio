import type { PresentationDefinition } from "../shared/models.ts";
export function selectVariant(
  deck: PresentationDefinition,
  name?: string,
): PresentationDefinition {
  if (!name) return deck;
  const variant = deck.variants?.[name];
  if (!variant) throw new Error(`Unknown event variant: ${name}`);
  const selected = new Set(variant.slides);
  if (selected.size !== variant.slides.length)
    throw new Error(`Variant ${name}: duplicate slide IDs`);
  const steps = variant.slides.map((id, index) => {
    const source = deck.steps.find((step) => step.id === id);
    if (!source) throw new Error(`Variant ${name}: unknown slide ${id}`);
    const dependencies = [
      source.previewOf,
      source.wordsFrom,
      ...(source.reviewWordsFrom || []),
      ...(source.uses || []).map((use) => use.poll),
    ].filter((value): value is string => !!value);
    for (const dependency of dependencies)
      if (
        !selected.has(dependency) ||
        variant.slides.indexOf(dependency) >= index
      )
        throw new Error(
          `Variant ${name}: ${id} requires earlier slide ${dependency}; include and order it before ${id}`,
        );
    const step = { ...source };
    delete step.next;
    if (variant.slides[index + 1]) step.next = variant.slides[index + 1]!;
    if (step.related)
      step.related = step.related.filter((target) => selected.has(target));
    if (variant.durations?.[id] !== undefined)
      step.durationSeconds = variant.durations[id];
    return step;
  });
  for (const id of Object.keys(variant.durations || {}))
    if (!selected.has(id))
      throw new Error(
        `Variant ${name}: duration refers to omitted slide ${id}`,
      );
  return { ...deck, start: steps[0]!.id, steps };
}
export function variantTiming(deck: PresentationDefinition, name?: string) {
  const variant = name ? deck.variants?.[name] : undefined;
  if (!variant) return undefined;
  const plannedSeconds = deck.steps.reduce(
    (sum, step) => sum + (step.durationSeconds || 0),
    0,
  );
  return {
    plannedSeconds,
    speakingSeconds: Math.round(variant.speakingMinutes * 60),
    qaSeconds: Math.round(variant.qaMinutes * 60),
    untimed: deck.steps
      .filter((step) => step.durationSeconds === undefined)
      .map((step) => step.id),
    overBudget: plannedSeconds > variant.speakingMinutes * 60,
  };
}
