export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'God';

export interface RankInfo {
  rank: Rank;
  emoji: string;
  color: string;
  nextRank?: Rank;
  progress: number; // 0-100
}

export function calculateRank(totalDuels: number, winRate: number): RankInfo {
  if (totalDuels >= 200 && winRate >= 70) return { rank: 'God', emoji: '⚡', color: 'text-yellow-300', progress: 100 };
  if (totalDuels >= 100 && winRate >= 65) return { rank: 'Elite', emoji: '💎', color: 'text-cyan-400', nextRank: 'God', progress: Math.min(100, ((totalDuels - 100) / 100) * 100) };
  if (totalDuels >= 50 && winRate >= 55) return { rank: 'Gold', emoji: '🥇', color: 'text-yellow-400', nextRank: 'Elite', progress: Math.min(100, ((totalDuels - 50) / 50) * 100) };
  if (totalDuels >= 20 && winRate >= 45) return { rank: 'Silver', emoji: '🥈', color: 'text-slate-300', nextRank: 'Gold', progress: Math.min(100, ((totalDuels - 20) / 30) * 100) };
  return { rank: 'Bronze', emoji: '🥉', color: 'text-orange-400', nextRank: 'Silver', progress: Math.min(100, (totalDuels / 20) * 100) };
}

export function getPercentileFeedback(percentile: number, prevPercentile?: number): string {
  const improvement = prevPercentile ? prevPercentile - percentile : null;
  const base = `You're top ${percentile}%`;
  if (improvement && improvement > 0) return `${base} · Improved +${improvement} 🔥`;
  return base;
}
