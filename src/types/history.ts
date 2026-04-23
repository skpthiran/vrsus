export interface DuelRecord {
  id: string;           // crypto.randomUUID()
  createdAt: string;    // ISO date string
  mode: string;
  winner: 'A' | 'B';
  margin: number;
  summary: string;
  previewA: string;     // full data URL
  previewB: string;
  scores: {
    A: { confidence: number; lighting: number; expression: number; grooming: number; composition: number; presence: number; total: number };
    B: { confidence: number; lighting: number; expression: number; grooming: number; composition: number; presence: number; total: number };
  };
  reasons_for_win: string[];
  weaknesses_of_loser: string[];
}
