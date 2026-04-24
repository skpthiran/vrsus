import { supabase } from './supabase';
import { DuelRecord } from '../types/history';

export async function saveDuelToSupabase(record: DuelRecord, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('duels')
      .insert({
        user_id: userId,
        mode: record.mode,
        winner: record.winner,
        margin: record.margin,
        summary: record.summary,
        score_a: record.scoreA,
        score_b: record.scoreB,
        scores: record.scores,
        reasons_for_win: record.reasonsForWin,
        weaknesses_of_loser: record.weaknessesOfLoser,
        image_a_url: record.previewA,
        image_b_url: record.previewB,
        is_public: true,
        verdict: record.verdict,
        challenge_of: record.challengeOf,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Update streak
    const winnerScore = Math.max(record.scores.A.total, record.scores.B.total);
    await updateStreak(userId, winnerScore);

    // Increment defenses on original duel if this is a challenge
    if (record.challenge_of) {
      await supabase.rpc('increment_defenses', { duel_id: record.challenge_of });
      // Fallback if RPC isn't set up yet:
      // await supabase.from('duels').update({ defenses: supabase.raw('defenses + 1') }).eq('id', record.challenge_of);
      // Actually, let's use a simpler update for now to avoid needing an RPC immediately
      const { data: original } = await supabase.from('duels').select('defenses').eq('id', record.challenge_of).single();
      if (original) {
        await supabase.from('duels').update({ defenses: (original.defenses || 0) + 1 }).eq('id', record.challenge_of);
      }
    }

    return data.id;
  } catch (err) {
    console.error('Failed to save duel to Supabase:', err);
    return null;
  }
}

// Requires Supabase RLS policy: allow public SELECT on duels table
// SQL: CREATE POLICY "Public duels are viewable by everyone" ON duels FOR SELECT USING (true);

export async function getPublicDuels(page = 0, pageSize = 10) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('duels')
    .select('id, user_id, mode, winner, margin, summary, created_at, is_public, score_a, score_b, scores, verdict, defenses, challenge_of, image_a_url, image_b_url, reasons_for_win, weaknesses_of_loser')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[VRSUS] getPublicDuels error:', error.message);
    return [];
  }

  console.log(`[VRSUS] getPublicDuels found ${data?.length || 0} records`);
  
  return (data || []).map(d => ({
    id: d.id,
    userId: d.user_id,
    mode: d.mode,
    winner: d.winner,
    margin: d.margin,
    summary: d.summary,
    createdAt: d.created_at,
    isPublic: d.is_public,
    scoreA: d.score_a,
    scoreB: d.score_b,
    scores: typeof d.scores === 'string' ? JSON.parse(d.scores) : (d.scores || { A: { total: 0 }, B: { total: 0 } }),
    verdict: typeof d.verdict === 'string' ? JSON.parse(d.verdict) : d.verdict,
    defenses: d.defenses,
    challengeOf: d.challenge_of,
    previewA: d.image_a_url,
    previewB: d.image_b_url,
    reasonsForWin: typeof d.reasons_for_win === 'string' ? JSON.parse(d.reasons_for_win) : (d.reasons_for_win || []),
    weaknessesOfLoser: typeof d.weaknesses_of_loser === 'string' ? JSON.parse(d.weaknesses_of_loser) : (d.weaknesses_of_loser || []),
  }));
}

export async function getUserDuels(userId: string, page = 0, pageSize = 10) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('duels')
    .select('id, created_at, mode, winner, margin, summary, score_a, score_b, scores, verdict, is_public, defenses, challenge_of, image_a_url, image_b_url, reasons_for_win, weaknesses_of_loser')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[VRSUS] getUserDuels error:', error.message);
    return [];
  }

  console.log(`[VRSUS] getUserDuels found ${data?.length || 0} records for user ${userId}`);
  
  return (data || []).map(d => ({
    id: d.id,
    createdAt: d.created_at,
    mode: d.mode,
    winner: d.winner,
    margin: d.margin,
    summary: d.summary,
    scoreA: d.score_a,
    scoreB: d.score_b,
    scores: typeof d.scores === 'string' ? JSON.parse(d.scores) : (d.scores || { A: { total: 0 }, B: { total: 0 } }),
    verdict: typeof d.verdict === 'string' ? JSON.parse(d.verdict) : d.verdict,
    isPublic: d.is_public,
    defenses: d.defenses,
    challengeOf: d.challenge_of,
    previewA: d.image_a_url,
    previewB: d.image_b_url,
    reasonsForWin: typeof d.reasons_for_win === 'string' ? JSON.parse(d.reasons_for_win) : (d.reasons_for_win || []),
    weaknessesOfLoser: typeof d.weaknesses_of_loser === 'string' ? JSON.parse(d.weaknesses_of_loser) : (d.weaknesses_of_loser || []),
  }));
}

export async function getDuelById(duelId: string) {
  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (error) {
    console.error('getDuelById error:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    scoreA: data.score_a,
    scoreB: data.score_b,
    previewA: data.image_a_url,
    previewB: data.image_b_url,
    scores: typeof data.scores === 'string' ? JSON.parse(data.scores) : (data.scores || { A: { total: 0 }, B: { total: 0 } }),
    verdict: typeof data.verdict === 'string' ? JSON.parse(data.verdict) : data.verdict,
    reasonsForWin: typeof data.reasons_for_win === 'string' ? JSON.parse(data.reasons_for_win) : (data.reasons_for_win || []),
    weaknessesOfLoser: typeof data.weaknesses_of_loser === 'string' ? JSON.parse(data.weaknesses_of_loser) : (data.weaknesses_of_loser || []),
  };
}

export async function toggleDuelPrivacy(duelId: string, isPublic: boolean) {
  const { error } = await supabase
    .from('duels')
    .update({ is_public: isPublic })
    .eq('id', duelId);

  if (error) {
    console.error('toggleDuelPrivacy error:', error);
    return false;
  }
  return true;
}

export async function deleteDuel(duelId: string) {
  const { error } = await supabase
    .from('duels')
    .delete()
    .eq('id', duelId);

  if (error) throw error;
}

export async function upsertReaction(duelId: string, userId: string, reactionType: 'agree' | 'disagree' | 'fire') {
  // Check if user already has this exact reaction — if so, delete it (toggle off)
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, reaction_type')
    .eq('duel_id', duelId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.reaction_type === reactionType) {
      // Toggle off
      await supabase.from('reactions').delete().eq('id', existing.id);
      return null;
    } else {
      // Switch reaction
      await supabase.from('reactions').update({ reaction_type: reactionType }).eq('id', existing.id);
      return reactionType;
    }
  } else {
    // New reaction
    await supabase.from('reactions').insert({ duel_id: duelId, user_id: userId, reaction_type: reactionType });
    return reactionType;
  }
}

export async function getReactions(duelId: string) {
  const { data } = await supabase
    .from('reactions')
    .select('reaction_type, user_id')
    .eq('duel_id', duelId);
  return data || [];
}

export async function getComments(duelId: string) {
  const { data } = await supabase
    .from('comments')
    .select('id, content, created_at, user_id, display_name')
    .eq('duel_id', duelId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addComment(duelId: string, userId: string, content: string, displayName: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ duel_id: duelId, user_id: userId, content, display_name: displayName })
    .select('id, content, created_at, user_id, display_name')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string) {
  await supabase.from('comments').delete().eq('id', commentId);
}

export async function updateStreak(userId: string, winnerScore: number) {
  // Fetch current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, best_streak, total_duels')
    .eq('id', userId)
    .single();

  const isHighScore = winnerScore >= 70;
  const currentStreak = isHighScore ? (profile?.current_streak || 0) + 1 : 0;
  const bestStreak = Math.max(currentStreak, profile?.best_streak || 0);
  const totalDuels = (profile?.total_duels || 0) + 1;

  await supabase
    .from('profiles')
    .update({ current_streak: currentStreak, best_streak: bestStreak, total_duels: totalDuels })
    .eq('id', userId);

  return { currentStreak, bestStreak };
}

export async function getWeeklyLeaderboard() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('duels')
    .select('user_id, score_a, score_b, profiles(display_name)')
    .eq('is_public', true)
    .gte('created_at', oneWeekAgo);

  if (error) throw error;

  // Aggregate per user
  const map: Record<string, { display_name: string; best_score: number; total_duels: number }> = {};
  for (const d of data || []) {
    const uid = d.user_id;
    if (!uid) continue;
    
    // Support both direct columns and JSON scores
    let sa = d.score_a;
    let sb = d.score_b;
    
    if (sa === null || sb === null) {
      const s = typeof d.scores === 'string' ? JSON.parse(d.scores) : d.scores;
      if (s) {
        sa = s.A?.total || 0;
        sb = s.B?.total || 0;
      }
    }
    
    const best = Math.max(sa || 0, sb || 0);
    const name = (d.profiles as any)?.display_name || 'Anonymous';
    if (!map[uid]) map[uid] = { display_name: name, best_score: 0, total_duels: 0 };
    if (best > map[uid].best_score) map[uid].best_score = best;
    map[uid].total_duels++;
  }

  return Object.entries(map)
    .map(([uid, v]) => ({ user_id: uid, ...v }))
    .sort((a, b) => b.best_score - a.best_score)
    .slice(0, 10);
}
