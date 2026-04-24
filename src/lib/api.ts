const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function analyzePhotos(photoA: string, photoB: string, mode: string, userId?: string, challengeOf?: string) {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoA, photoB, mode, userId, challengeOf }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || 'Analysis failed');
  }
  return res.json();
}
