import { supabase } from './supabase';

export interface RatePhoto {
  duelId: string;
  photoUrl: string;
  winner: string;
  side: 'A' | 'B';
}

// Fetch a pool of photos to rate — winner photos from public duels
// Excludes photos already rated by this session (stored in localStorage)
export async function getRatingPool(limit = 30): Promise<RatePhoto[]> {
  const { data, error } = await supabase
    .from('duels')
    .select('id, winner, image_a_url, image_b_url')
    .eq('is_public', true)
    .not('image_a_url', 'is', null)
    .not('image_b_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Get already-rated duel IDs from localStorage
  const rated = JSON.parse(localStorage.getItem('vrsus_rated') || '[]') as string[];

  const pool: RatePhoto[] = [];
  for (const d of data) {
    if (rated.includes(d.id)) continue;
    // Add both photos from each duel
    if (d.image_a_url) {
      pool.push({ duelId: d.id, photoUrl: d.image_a_url, winner: d.winner, side: 'A' });
    }
    if (d.image_b_url) {
      pool.push({ duelId: d.id, photoUrl: d.image_b_url, winner: d.winner, side: 'B' });
    }
  }

  // Shuffle the pool
  return pool.sort(() => Math.random() - 0.5);
}

export async function submitRating(
  duelId: string,
  photoUrl: string,
  score: number,
  userId: string | null
): Promise<void> {
  await supabase.from('ratings').insert({
    user_id: userId || null,
    duel_id: duelId,
    photo_url: photoUrl,
    score,
  });

  // Mark duel as rated in localStorage
  const rated = JSON.parse(localStorage.getItem('vrsus_rated') || '[]') as string[];
  if (!rated.includes(duelId)) {
    rated.push(duelId);
    localStorage.setItem('vrsus_rated', JSON.stringify(rated));
  }
}

export async function getUserAvgRating(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('ratings')
    .select('score')
    .eq('user_id', userId);

  if (!data || data.length === 0) return null;
  const avg = data.reduce((sum, r) => sum + r.score, 0) / data.length;
  return Math.round(avg * 10) / 10;
}
