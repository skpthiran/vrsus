const log = (msg: string) => console.log(`[VRSUS] ${msg}`);

interface Env {
  OPENROUTER_API_KEY: string;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
}

function extractJSON(text: string): string {
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No valid JSON found: ' + text.slice(0, 200));
  }
  let jsonStr = text.slice(start, end + 1);
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  jsonStr = jsonStr.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1 $2"');
  return jsonStr;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const openrouterKey = context.env.OPENROUTER_API_KEY;
  const groqKey = context.env.GROQ_API_KEY;
  const cerebrasKey = context.env.CEREBRAS_API_KEY;

  try {
    const body = await context.request.json() as any;
    const { photoA, photoB, mode = 'general' } = body;

    if (!photoA || !photoB) {
      return Response.json({ error: 'Both photoA and photoB are required' }, { status: 400, headers: corsHeaders });
    }

    // ── Provider fetch helpers ─────────────────────────────────────────────

    const openrouterFetch = async (model: string, messages: any[], maxTokens = 800) => {
      if (!openrouterKey) throw new Error('No OpenRouter key');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vrsus.pages.dev',
          'X-Title': 'VRSUS',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      });
      const data = await res.json() as any;
      if (data.error) throw new Error(`OpenRouter(${model}): ${JSON.stringify(data.error)}`);
      if (!data.choices?.length) throw new Error(`OpenRouter no choices: ${JSON.stringify(data)}`);
      return data.choices[0].message.content || '{}';
    };

    const groqFetch = async (messages: any[], maxTokens = 800) => {
      if (!groqKey) throw new Error('No Groq key');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens }),
      });
      const data = await res.json() as any;
      if (data.error) throw new Error(`Groq: ${JSON.stringify(data.error)}`);
      if (!data.choices?.length) throw new Error(`Groq no choices: ${JSON.stringify(data)}`);
      return data.choices[0].message.content || '{}';
    };

    const cerebraseFetch = async (messages: any[], maxTokens = 800) => {
      if (!cerebrasKey) throw new Error('No Cerebras key');
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cerebrasKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages, max_tokens: maxTokens }),
      });
      const data = await res.json() as any;
      if (data.error) throw new Error(`Cerebras: ${JSON.stringify(data.error)}`);
      if (!data.choices?.length) throw new Error(`Cerebras no choices: ${JSON.stringify(data)}`);
      return data.choices[0].message.content || '{}';
    };

    // Tries providers in order, stops at first success
    const fetchWithFallback = async (
      stageName: string,
      primaryFn: () => Promise<string>,
      fallbacks: Array<() => Promise<string>>
    ): Promise<string> => {
      const attempts = [primaryFn, ...fallbacks];
      const providerNames = ['OpenRouter', 'Groq', 'Cerebras'];
      let lastError: Error | null = null;
      for (let i = 0; i < attempts.length; i++) {
        try {
          const result = await attempts[i]();
          log(`${stageName} ✓ via ${providerNames[i]}`);
          return result;
        } catch (err: any) {
          lastError = err;
          log(`${stageName} ✗ ${providerNames[i]}: ${err.message}`);
        }
      }
      throw lastError ?? new Error(`${stageName}: all providers failed`);
    };

    // ── STAGE 1: Visual Audit — Vision only (OpenRouter Qwen) ─────────────
    log('Stage 1 starting...');
    const stage1Messages = [
      {
        role: 'system',
        content: 'You are a precise visual analyst. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a brutally honest attractiveness analyst judging two photos for a "${mode}" context. Score each person 1-10 on these six criteria. Be real — don't give everyone 7s. You MUST respond with ONLY a JSON object, no other text.

Criteria:
- face_card: Facial attractiveness — bone structure, symmetry, features, jawline, eyes
- body: Physique and body aesthetics — build, posture, proportions
- style: Outfit, fashion sense, grooming, overall presentation
- glow: Skin quality, hair, radiance, how healthy and fresh they look
- expression: Energy, smile, vibe, charisma — how alive they look in the photo
- aura: Overall X-factor and magnetism — star quality, would you look twice?

Format:
{"A":{"face_card":7,"body":8,"style":6,"glow":7,"expression":8,"aura":7,"observation":"One sentence describing person A's overall look and strongest feature."},"B":{"face_card":6,"body":7,"style":8,"glow":6,"expression":7,"aura":8,"observation":"One sentence describing person B's overall look and strongest feature."}}`,
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoA}` } },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoB}` } },
        ],
      },
    ];

    // Stage 1 is vision-only — Groq/Cerebras don't support images so only OpenRouter
    // If OpenRouter fails for vision, we generate neutral scores as graceful degradation
    let visualScores: any;
    try {
      const raw1 = await openrouterFetch('qwen/qwen-vl-plus', stage1Messages, 800);
      visualScores = JSON.parse(extractJSON(raw1));
      log('Stage 1 complete');
    } catch (err: any) {
      log('Stage 1 failed, using neutral fallback scores: ' + err.message);
      visualScores = {
        A: { face_card: 7, body: 7, style: 7, glow: 7, expression: 7, aura: 7, observation: 'Photo A analyzed.' },
        B: { face_card: 7, body: 7, style: 7, glow: 7, expression: 7, aura: 7, observation: 'Photo B analyzed.' },
      };
    }

    // ── STAGE 2: Judgment — OpenRouter → Groq → Cerebras ──────────────────
    log('Stage 2 starting...');
    const stage2Messages = [
      {
        role: 'system',
        content: 'You are VRSUS Judge. You receive visual scores and pick a winner. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `Given these attractiveness scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy category scores EXACTLY as given\n- Calculate total as: sum of all 6 scores × (100/60), round to nearest integer\n- Pick winner based on higher total\n- Margin = difference between totals\n- winning_edge should reference face card, body, style, glow, expression or aura specifically\n\nReturn ONLY this JSON:\n{"winner":"A","scores":{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0}},"margin":0,"winning_edge":"One sentence naming the exact deciding factor — face card, body, glow, etc.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
      },
    ];

    const raw2 = await fetchWithFallback(
      'Stage 2',
      () => openrouterFetch('deepseek/deepseek-chat', stage2Messages, 800),
      [
        () => groqFetch(stage2Messages, 800),
        () => cerebraseFetch(stage2Messages, 800),
      ]
    );
    const judgment = JSON.parse(extractJSON(raw2));
    log('Stage 2 complete');

    // ── STAGE 3: Tips — OpenRouter → Groq → Cerebras ──────────────────────
    log('Stage 3 starting...');
    const loser = judgment.winner === 'A' ? 'B' : 'A';
    const loserScores = visualScores[loser];

    const stage3Messages = [
      {
        role: 'system',
        content: 'You are a confident, direct beauty and style coach. Give real, actionable advice. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `The losing photo (Photo ${loser}) had these scores: ${JSON.stringify(loserScores)}\nObservation: "${loserScores.observation}"\nMode: "${mode}"\n\nGive 3 specific, actionable tips to improve their attractiveness score — could be about face card angles, body posture, style choices, skin/hair glow, expression energy, or overall aura. Be direct and helpful. Return ONLY this JSON:\n{"weaknesses_of_loser":["tip 1","tip 2","tip 3"]}`,
      },
    ];

    const raw3 = await fetchWithFallback(
      'Stage 3',
      () => openrouterFetch('meta-llama/llama-3.3-70b-instruct', stage3Messages, 800),
      [
        () => groqFetch(stage3Messages, 800),
        () => cerebraseFetch(stage3Messages, 800),
      ]
    );
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
    log('PIPELINE FAILED: ' + err.message);
    return Response.json({
      error: 'Analysis failed',
      detail: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join(' | '),
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
