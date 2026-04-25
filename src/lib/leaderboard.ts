import { supabase } from './supabase';

export interface ChampionData {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalWins: number;
  defenses: number;
  crownedAt: string;
  bestDuelId: string | null;
  bestPhoto: string | null;
  bestScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalWins: number;
  totalDuels: number;
  bestScore: number;
  winRate: number;
}

export interface TopDuel {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  scoreA: number;
  scoreB: number;
  winner: string;
  previewA: string | null;
  previewB: string | null;
  summary: string;
  createdAt: string;
  topScore: number;
}

export async function getCurrentChampion(): Promise<ChampionData | null> {
  const { data, error } = await supabase
    .from('champions')
    .select(`
      user_id, defenses, crowned_at, best_duel_id,
      profiles:user_id (username, avatar_url, total_wins, best_score),
      duels:best_duel_id (
        image_a_url, image_b_url, score_a, score_b, winner
      )
    `)
    .eq('is_current', true)
    .single();

  if (error || !data) return null;

  const profile = data.profiles as any;
  const duel = data.duels as any;
  const topScore = duel ? Math.max(duel.score_a || 0, duel.score_b || 0) : 0;
  const bestPhoto = duel
    ? (duel.winner === 'A' ? duel.image_a_url : duel.image_b_url)
    : null;

  return {
    userId: data.user_id,
    username: profile?.username || 'Anonymous',
    avatarUrl: profile?.avatar_url || null,
    totalWins: profile?.total_wins || 0,
    defenses: data.defenses || 0,
    crownedAt: data.crowned_at,
    bestDuelId: data.best_duel_id,
    bestPhoto,
    bestScore: topScore,
  };
}

export async function getTopScores(limit = 10): Promise<TopDuel[]> {
  const { data, error } = await supabase
    .from('duels')
    .select(`
      id, user_id, score_a, score_b, winner, 
      image_a_url, image_b_url, summary, created_at,
      profiles:user_id (username, avatar_url)
    `)
    .eq('is_public', true)
    .not('user_id', 'is', null)
    .order('score_a', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  // Get top score per user (their best duel)
  const seen = new Set<string>();
  const top: TopDuel[] = [];

  // Sort by highest score in duel
  const sorted = [...data].sort((a, b) =>
    Math.max(b.score_a, b.score_b) - Math.max(a.score_a, a.score_b)
  );

  for (const d of sorted) {
    if (seen.has(d.user_id)) continue;
    seen.add(d.user_id);
    const profile = d.profiles as any;
    top.push({
      id: d.id,
      userId: d.user_id,
      username: profile?.username || 'Anonymous',
      avatarUrl: profile?.avatar_url || null,
      scoreA: d.score_a,
      scoreB: d.score_b,
      winner: d.winner,
      previewA: d.image_a_url,
      previewB: d.image_b_url,
      summary: d.summary,
      createdAt: d.created_at,
      topScore: Math.max(d.score_a, d.score_b),
    });
    if (top.length >= limit) break;
  }

  return top;
}

export async function getMostWins(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, total_wins, total_duels, best_score')
    .not('total_wins', 'is', null)
    .gt('total_wins', 0)
    .order('total_wins', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p, i) => ({
    rank: i + 1,
    userId: p.id,
    username: p.username || 'Anonymous',
    avatarUrl: p.avatar_url || null,
    totalWins: p.total_wins || 0,
    totalDuels: p.total_duels || 0,
    bestScore: p.best_score || 0,
    winRate: p.total_duels > 0 ? Math.round((p.total_wins / p.total_duels) * 100) : 0,
  }));
}

export async function getThisWeek(limit = 10): Promise<LeaderboardEntry[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('duels')
    .select('user_id, score_a, score_b, winner')
    .gte('created_at', weekAgo.toISOString())
    .eq('is_public', true);

  if (error || !data) return [];

  // Aggregate wins per user this week
  const userStats: Record<string, { wins: number; duels: number; bestScore: number }> = {};
  
  data.forEach(d => {
    if (!d.user_id) return;
    if (!userStats[d.user_id]) {
      userStats[d.user_id] = { wins: 0, duels: 0, bestScore: 0 };
    }
    userStats[d.user_id].duels += 1;
    const userScore = Math.max(d.score_a || 0, d.score_b || 0);
    if (userScore > userStats[d.user_id].bestScore) {
      userStats[d.user_id].bestScore = userScore;
    }
    // Count as win if user's score was higher
    if ((d.winner === 'A' && d.score_a > d.score_b) || 
        (d.winner === 'B' && d.score_b > d.score_a)) {
      userStats[d.user_id].wins += 1;
    }
  });

  // Get top users sorted by wins this week
  const topUserIds = Object.entries(userStats)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, limit)
    .map(([id]) => id);

  if (!topUserIds.length) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, total_wins, total_duels, best_score')
    .in('id', topUserIds);

  if (!profiles) return [];

  return profiles
    .map((p, i) => ({
      rank: i + 1,
      userId: p.id,
      username: p.username || 'Anonymous',
      avatarUrl: p.avatar_url || null,
      totalWins: userStats[p.id]?.wins || 0,
      totalDuels: userStats[p.id]?.duels || 0,
      bestScore: userStats[p.id]?.bestScore || 0,
      winRate: userStats[p.id]?.duels > 0
        ? Math.round((userStats[p.id].wins / userStats[p.id].duels) * 100)
        : 0,
    }))
    .sort((a, b) => b.totalWins - a.totalWins)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export async function getUserDuelCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('duels')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

export async function challengeChampion(
  championUserId: string,
  challengerUserId: string
): Promise<{ canChallenge: boolean; reason?: string; championBestDuelId?: string }> {
  // Check challenger has 3+ duels
  const count = await getUserDuelCount(challengerUserId);
  if (count < 3) {
    return { canChallenge: false, reason: 'You need at least 3 duels to challenge the champion.' };
  }
  if (challengerUserId === championUserId) {
    return { canChallenge: false, reason: 'You are the champion — defend your title!' };
  }

  // Get champion's best duel
  const { data: champion } = await supabase
    .from('champions')
    .select('best_duel_id')
    .eq('is_current', true)
    .single();

  return { 
    canChallenge: true, 
    championBestDuelId: champion?.best_duel_id || undefined 
  };
}

export async function updateChampionAfterDuel(
  duelId: string,
  challengerId: string,
  challengerWon: boolean,
  challengeOf: string
): Promise<void> {
  if (challengerWon) {
    // Dethrone current champion
    await supabase
      .from('champions')
      .update({ is_current: false, dethroned_at: new Date().toISOString() })
      .eq('is_current', true);

    // Crown new champion
    await supabase.from('champions').insert({
      user_id: challengerId,
      best_duel_id: duelId,
      is_current: true,
      defenses: 0,
    });
  } else {
    // Increment defenses for current champion
    const { data: current } = await supabase
      .from('champions')
      .select('defenses')
      .eq('is_current', true)
      .single();

    if (current) {
      await supabase
        .from('champions')
        .update({ defenses: (current.defenses || 0) + 1 })
        .eq('is_current', true);
    }
  }
}
