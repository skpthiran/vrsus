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

  // Track by photo URL so both photos from a duel can be rated independently
  const ratedPhotos = JSON.parse(localStorage.getItem('vrsus_rated_photos') || '[]') as string[];

  const pool: RatePhoto[] = [];
  for (const d of data) {
    if (d.image_a_url && !ratedPhotos.includes(d.image_a_url)) {
      pool.push({ duelId: d.id, photoUrl: d.image_a_url, winner: d.winner, side: 'A' });
    }
    if (d.image_b_url && !ratedPhotos.includes(d.image_b_url)) {
      pool.push({ duelId: d.id, photoUrl: d.image_b_url, winner: d.winner, side: 'B' });
    }
  }

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

  // Track by photo URL — each photo is rated independently
  let ratedPhotos = JSON.parse(localStorage.getItem('vrsus_rated_photos') || '[]') as string[];
  if (!ratedPhotos.includes(photoUrl)) {
    ratedPhotos.push(photoUrl);
    // Keep only last 500 to avoid localStorage quota issues
    if (ratedPhotos.length > 500) ratedPhotos = ratedPhotos.slice(-500);
    localStorage.setItem('vrsus_rated_photos', JSON.stringify(ratedPhotos));
  }
}

export async function getUserAvgRating(userId: string): Promise<number | null> {
  // Get all duels belonging to this user
  const { data: duels } = await supabase
    .from('duels')
    .select('image_a_url, image_b_url')
    .eq('user_id', userId)
    .eq('is_public', true);

  if (!duels || duels.length === 0) return null;

  // Collect all photo URLs from this user's duels
  const photoUrls = duels.flatMap(d => [d.image_a_url, d.image_b_url].filter(Boolean));
  if (photoUrls.length === 0) return null;

  // Get all ratings for those photos
  const { data: ratingRows } = await supabase
    .from('ratings')
    .select('score')
    .in('photo_url', photoUrls);

  if (!ratingRows || ratingRows.length === 0) return null;
  const avg = ratingRows.reduce((sum, r) => sum + r.score, 0) / ratingRows.length;
  return Math.round(avg * 10) / 10;
}

export async function getPhotoAvgRating(photoUrl: string): Promise<{ avg: number; total: number } | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('score')
    .eq('photo_url', photoUrl);

  if (error || !data || data.length === 0) return null;
  const avg = data.reduce((sum, r) => sum + r.score, 0) / data.length;
  return { avg: Math.round(avg * 10) / 10, total: data.length };
}
