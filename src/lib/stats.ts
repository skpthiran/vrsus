import { supabase } from './supabase';

export async function updateUserStats(userId: string) {
  const { data: duels } = await supabase
    .from('duels')
    .select('score_a, score_b')
    .eq('user_id', userId);

  if (!duels || duels.length === 0) return;

  const totalDuels = duels.length;
  // A win is when score_b > score_a (user's photo outscored opponent)
  const wins = duels.filter(d => (d.score_b ?? 0) > (d.score_a ?? 0)).length;
  
  const bScores = duels.map(d => d.score_b ?? 0).filter(s => s > 0);
  const bestScore = bScores.length > 0 ? Math.max(...bScores) : 0;
  const avgScore = bScores.length > 0 ? Math.round(bScores.reduce((a, b) => a + b, 0) / bScores.length) : 0;

  const sorted = [...duels].reverse();
  let streak = 0;
  for (const d of sorted) {
    if ((d.score_b ?? 0) > (d.score_a ?? 0)) streak++;
    else break;
  }

  const { data: profile } = await supabase.from('profiles').select('best_streak').eq('id', userId).single();
  const bestStreak = Math.max(streak, profile?.best_streak || 0);

  await supabase.from('profiles').update({
    total_duels: totalDuels,
    total_wins: wins,
    avg_score: avgScore,
    best_score: bestScore,
    current_streak: streak,
    best_streak: bestStreak
  }).eq('id', userId);
}

export async function getLeaderboard(country?: string) {
  let query = supabase
    .from('profiles')
    .select('id, username, country, total_duels, total_wins, avg_score, best_score, current_streak')
    .gt('total_duels', 0)
    .order('total_wins', { ascending: false })
    .limit(50);
  if (country) query = query.eq('country', country);
  const { data } = await query;
  return (data || []).map((p, i) => ({
    ...p,
    rank: i + 1,
    winRate: p.total_duels > 0 ? Math.round((p.total_wins / p.total_duels) * 100) : 0,
  }));
}
