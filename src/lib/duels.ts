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
