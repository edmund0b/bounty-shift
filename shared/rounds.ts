export const ROUND = { durationMs: 90_000, resultsMs: 5_000 };
export type RoundResult = { id: string; name: string; eliminations: number; rank: number };
export type RoundView = { endsAt: number; remainingSeconds: number; returnAt: number; results: RoundResult[] };
export type PrivateObjective = { target: { id: string; name: string } | null; eliminations: number };
