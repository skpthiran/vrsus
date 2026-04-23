const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function analyzePhotos(photoA: string, photoB: string, mode: string) {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoA, photoB, mode }),
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}
