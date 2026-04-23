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
        score_a: record.scores.A.total,
        score_b: record.scores.B.total,
        scores: record.scores,
        reasons_for_win: record.reasons_for_win,
        weaknesses_of_loser: record.weaknesses_of_loser,
        image_a_url: record.previewA,
        image_b_url: record.previewB,
        is_public: true,
        verdict: record.verdict,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Update streak
    const winnerScore = Math.max(record.scores.A.total, record.scores.B.total);
    await updateStreak(userId, winnerScore);

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
    .select('id, user_id, mode, winner, margin, summary, score_a, score_b, created_at, is_public, scores, verdict, preview_a:image_a_url, preview_b:image_b_url')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('getPublicDuels error:', error);
    return [];
  }
  return data || [];
}

export async function getUserDuels(userId: string, page = 0, pageSize = 10) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('duels')
    .select('id, created_at, mode, winner, margin, summary, score_a, score_b, scores, verdict, is_public, reasons_for_win, weaknesses_of_loser, preview_a:image_a_url, preview_b:image_b_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  return (data || []).map(d => ({
    ...d,
    scores: d.scores || { A: { total: 0 }, B: { total: 0 } },
    reasons_for_win: d.reasons_for_win || [],
    weaknesses_of_loser: d.weaknesses_of_loser || [],
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
    scores: data.scores || { A: { total: 0 }, B: { total: 0 } },
    reasons_for_win: data.reasons_for_win || [],
    weaknesses_of_loser: data.weaknesses_of_loser || [],
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
    const best = Math.max(d.score_a || 0, d.score_b || 0);
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
