import { supabase } from './supabase';

export async function updateUserStats(userId: string) {
  const { data: duels } = await supabase
    .from('duels')
    .select('winner, user_id, score_b')
    .eq('user_id', userId);
  if (!duels || duels.length === 0) return;

  const totalDuels = duels.length;
  const wins = duels.filter(d => d.winner === 'B').length; // B is always the user's photo
  const winRate = Math.round((wins / totalDuels) * 100);
  
  // Calculate scores
  const scores = duels.map(d => d.score_b ?? 0).filter(s => s > 0);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Calculate streak
  const sorted = [...duels].reverse();
  let streak = 0;
  for (const d of sorted) {
    if (d.winner === 'B') streak++;
    else break;
  }

  await supabase.from('profiles').update({
    total_duels: totalDuels,
    total_wins: wins,
    avg_score: avgScore,
    best_score: bestScore,
    current_streak: streak,
  }).eq('id', userId);
}

export async function getLeaderboard(country?: string) {
  let query = supabase
    .from('profiles')
    .select('id, display_name, country, total_duels, total_wins, avg_score, best_score, current_streak')
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
