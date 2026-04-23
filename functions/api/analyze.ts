interface Env {
  OPENROUTER_API_KEY: string;
}

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return text.slice(start, end + 1);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { photoA, photoB, mode = 'general' } = await context.request.json() as any;

    if (!photoA || !photoB) {
      return Response.json({ error: 'Both photoA and photoB are required' }, { status: 400, headers: corsHeaders });
    }

    const apiKey = context.env.OPENROUTER_API_KEY;
    const baseURL = 'https://openrouter.ai/api/v1';

    const openrouterFetch = async (model: string, messages: any[]) => {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vrsus.pages.dev',
          'X-Title': 'VRSUS',
        },
        body: JSON.stringify({ model, messages }),
      });
      const data = await res.json() as any;
      return data.choices[0].message.content || '{}';
    };

    // ── STAGE 1: Visual Audit — Qwen VL Plus ──────────────────────────────
    const raw1 = await openrouterFetch('qwen/qwen-vl-plus', [
      {
        role: 'system',
        content: 'You are a precise visual analyst. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze Photo A and Photo B for a "${mode}" context. Score each photo 1-10 on: confidence, lighting, expression, grooming, composition, presence. Return ONLY this JSON with no extra text:\n{"A":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"observation":"2 sentence description"},"B":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"observation":"2 sentence description"}}`,
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoA}` } },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoB}` } },
        ],
      },
    ]);

    const visualScores = JSON.parse(extractJSON(raw1));

    // ── STAGE 2: Judgment — DeepSeek R1 ───────────────────────────────────
    const raw2 = await openrouterFetch('deepseek/deepseek-r1', [
      {
        role: 'system',
        content: 'You are VRSUS Judge. You receive visual scores and pick a winner. Respond only with valid JSON, no markdown fences, no reasoning text outside the JSON.',
      },
      {
        role: 'user',
        content: `Given these visual scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy the category scores EXACTLY as given above (do not change any values)\n- Calculate total as: sum of all 6 category scores multiplied by (100/60) to normalize to 100\n- Round total to nearest integer\n- Pick the winner based on higher total\n- Calculate margin as the difference between the two totals\n\nReturn ONLY this JSON with no extra text:\n{"winner":"A","scores":{"A":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0},"B":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0}},"margin":0,"winning_edge":"One sentence on the exact deciding factor.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
      },
    ]);

    const judgment = JSON.parse(extractJSON(raw2));

    // ── STAGE 3: Glow-Up Tips — Llama 3.3 70B ────────────────────────────
    const loser = judgment.winner === 'A' ? 'B' : 'A';
    const loserScores = visualScores[loser];

    const raw3 = await openrouterFetch('meta-llama/llama-3.3-70b-instruct', [
      {
        role: 'system',
        content: 'You are a friendly photo coach. Be encouraging but actionable. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `The losing photo (Photo ${loser}) had these scores: ${JSON.stringify(loserScores)}\nObservation: "${loserScores.observation}"\nMode: "${mode}"\n\nWrite 3 specific, actionable improvement tips. Return ONLY this JSON:\n{"weaknesses_of_loser":["tip 1","tip 2","tip 3"]}`,
      },
    ]);

    const tips = JSON.parse(extractJSON(raw3));

    return Response.json({
      winner: judgment.winner,
      margin: judgment.margin,
      scores: judgment.scores,
      reasons_for_win: judgment.reasons_for_win,
      weaknesses_of_loser: tips.weaknesses_of_loser,
      summary: judgment.winning_edge,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Pipeline error:', err.message);
    return Response.json({ error: 'Analysis failed', detail: err.message }, { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
