export const ROUND = { durationMs: 90_000, resultsMs: 5_000 };
export type RoundResult = { id: string; name: string; eliminations: number; rank: number };
export type RoundView = { endsAt: number; remainingSeconds: number; returnAt: number; results: RoundResult[] };
export type PrivateObjective = { target: { id: string; name: string } | null; eliminations: number; matchEliminations: number };
export const MATCH = { rounds: 3 };
export type MatchView = { id: string; roundNumber: number; totalRounds: number; nextRoundSeconds: number; results: RoundResult[]; winners: {id:string;name:string}[]; history: RoundResult[][]; mapHistory:string[] };
export function emptyMatch():MatchView { return {id:'',roundNumber:0,totalRounds:MATCH.rounds,nextRoundSeconds:0,results:[],winners:[],history:[],mapHistory:[]}; }
