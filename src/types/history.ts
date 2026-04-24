export interface DuelRecord {
  id: string;
  createdAt: string;
  mode: string;
  winner: 'A' | 'B';
  margin: number;
  summary: string;
  previewA: string;
  previewB: string;
  scoreA: number;
  scoreB: number;
  scores: {
    A: { [key: string]: number };
    B: { [key: string]: number };
  };
  reasonsForWin: string[];
  weaknessesOfLoser: string[];
  verdict?: string;
  isPublic?: boolean;
  challengeOf?: string;
  defenses?: number;
}

