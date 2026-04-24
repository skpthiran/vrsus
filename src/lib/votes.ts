import { supabase } from './supabase';

function getSessionId(): string {
  let id = localStorage.getItem('vrsus_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vrsus_session_id', id);
  }
  return id;
}

export async function castVote(duelId: string, pick: 'A' | 'B') {
  const sessionId = getSessionId();
  const { error } = await supabase
    .from('votes')
    .upsert({ duel_id: duelId, session_id: sessionId, pick }, { onConflict: 'duel_id,session_id' });
  return !error;
}

export async function getVoteCounts(duelId: string): Promise<{ a: number; b: number; userPick: 'A' | 'B' | null }> {
  const sessionId = getSessionId();
  const { data } = await supabase
    .from('votes')
    .select('pick, session_id')
    .eq('duel_id', duelId);
  if (!data) return { a: 0, b: 0, userPick: null };
  const a = data.filter(v => v.pick === 'A').length;
  const b = data.filter(v => v.pick === 'B').length;
  const userPick = data.find(v => v.session_id === sessionId)?.pick as 'A' | 'B' | null ?? null;
  return { a, b, userPick };
}

export async function getBatchVoteCounts(duelIds: string[]): Promise<Record<string, { a: number; b: number; userPick: 'A' | 'B' | null }>> {
  const sessionId = getSessionId();
  const { data } = await supabase
    .from('votes')
    .select('duel_id, pick, session_id')
    .in('duel_id', duelIds);
  const result: Record<string, { a: number; b: number; userPick: 'A' | 'B' | null }> = {};
  for (const id of duelIds) {
    const rows = data?.filter(v => v.duel_id === id) ?? [];
    result[id] = {
      a: rows.filter(v => v.pick === 'A').length,
      b: rows.filter(v => v.pick === 'B').length,
      userPick: rows.find(v => v.session_id === sessionId)?.pick as 'A' | 'B' | null ?? null,
    };
  }
  return result;
}
