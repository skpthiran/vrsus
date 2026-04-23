// Log helper  
const log = (msg: string) => console.log(`[VRSUS] ${msg}`);

interface Env {
  OPENROUTER_API_KEY: string;
}

function extractJSON(text: string): string {
  // Remove <think>...</think> blocks (DeepSeek R1)
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Remove markdown code fences
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  // Find the outermost { } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No valid JSON object found in response: ' + text.slice(0, 200));
  }
  
  let jsonStr = text.slice(start, end + 1);
  
  // Fix common issues: remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  
  // Fix unescaped newlines inside strings
  jsonStr = jsonStr.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1 $2"');
  
  return jsonStr;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Debug: check env vars are present
  const apiKey = context.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    log('CRITICAL: Missing OPENROUTER_API_KEY');
    return Response.json({ error: 'Missing OPENROUTER_API_KEY', detail: 'API key not found in environment' }, { status: 500, headers: corsHeaders });
  }
  log('API key present: ' + !!apiKey);

  try {
    const body = await context.request.json() as any;
    const { photoA, photoB, mode = 'general' } = body;

    if (!photoA || !photoB) {
      log('ERROR: Photo data missing in request');
      return Response.json({ error: 'Both photoA and photoB are required' }, { status: 400, headers: corsHeaders });
    }

    log('Body parsed, mode: ' + mode + ', photoA length: ' + (photoA?.length || 0));
    const baseURL = 'https://openrouter.ai/api/v1';

    const openrouterFetch = async (model: string, messages: any[], maxTokens: number = 1000) => {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vrsus.pages.dev',
          'X-Title': 'VRSUS',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      });
      
      const data = await res.json() as any;
      
      // If OpenRouter returns an error object instead of choices
      if (data.error) {
        throw new Error(`OpenRouter error (${model}): ${JSON.stringify(data.error)}`);
      }
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error(`No choices returned from ${model}. Full response: ${JSON.stringify(data)}`);
      }
      
      return data.choices[0].message.content || '{}';
    };

    // ── STAGE 1: Visual Audit — Qwen VL Plus ──────────────────────────────
    log('Starting stage 1...');
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
            text: `You are analyzing two photos for a "${mode}" context. Score each 1-10 on six criteria. You MUST respond with ONLY a JSON object, no other text.

Format (fill in numbers and descriptions):
{"A":{"confidence":7,"lighting":8,"expression":6,"grooming":7,"composition":8,"presence":7,"observation":"Description of photo A in one sentence."},"B":{"confidence":6,"lighting":7,"expression":8,"grooming":6,"composition":7,"presence":8,"observation":"Description of photo B in one sentence."}}`,
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoA}` } },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoB}` } },
        ],
      },
    ], 800);

    const visualScores = JSON.parse(extractJSON(raw1));
    log('Stage 1 complete');

    // ── STAGE 2: Judgment — DeepSeek R1 ───────────────────────────────────
    log('Starting stage 2...');
    const raw2 = await openrouterFetch('deepseek/deepseek-chat', [
      {
        role: 'system',
        content: 'You are VRSUS Judge. You receive visual scores and pick a winner. Respond only with valid JSON, no markdown fences, no reasoning text outside the JSON.',
      },
      {
        role: 'user',
        content: `Given these visual scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy the category scores EXACTLY as given above (do not change any values)\n- Calculate total as: sum of all 6 category scores multiplied by (100/60) to normalize to 100\n- Round total to nearest integer\n- Pick the winner based on higher total\n- Calculate margin as the difference between the two totals\n\nReturn ONLY this JSON with no extra text:\n{"winner":"A","scores":{"A":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0},"B":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0}},"margin":0,"winning_edge":"One sentence on the exact deciding factor.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
      },
    ], 800);

    const judgment = JSON.parse(extractJSON(raw2));
    log('Stage 2 complete');

    // ── STAGE 3: Glow-Up Tips — Llama 3.3 70B ────────────────────────────
    log('Starting stage 3...');
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
    ], 800);

    const tips = JSON.parse(extractJSON(raw3));
    log('Stage 3 complete');

    return Response.json({
      winner: judgment.winner,
      margin: judgment.margin,
      scores: judgment.scores,
      reasons_for_win: judgment.reasons_for_win,
      weaknesses_of_loser: tips.weaknesses_of_loser,
      summary: judgment.winning_edge,
    }, { headers: corsHeaders });

  } catch (err: any) {
    log('PIPELINE CRASH: ' + err.message);
    console.error('Pipeline error:', err.message);
    return Response.json({ 
      error: 'Analysis failed', 
      detail: err.message,
      stack: err.stack?.split('\n').slice(0,3).join(' | ')
    }, { status: 500, headers: corsHeaders });
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
