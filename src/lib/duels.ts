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
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (err) {
    console.error('Failed to save duel to Supabase:', err);
    return null;
  }
}

export async function getPublicDuels() {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('duels')
    .select('id, user_id, mode, winner, margin, summary, score_a, score_b, image_a_url, image_b_url, is_public, created_at')
    .or(`is_public.eq.true${user ? `,user_id.eq.${user.id}` : ''}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  return data || [];
}

export async function getUserDuels(userId: string) {
  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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
    .select('id, content, created_at, user_id, profiles!comments_user_id_fkey(display_name)')
    .eq('duel_id', duelId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addComment(duelId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ duel_id: duelId, user_id: userId, content })
    .select('id, content, created_at, user_id, profiles!comments_user_id_fkey(display_name)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string) {
  await supabase.from('comments').delete().eq('id', commentId);
}
