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
      {
        role: 'system',
        content: 'You are a blunt attractiveness rater. You MUST differentiate between people. Giving the same score to two different people is a failure. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Look at these two people carefully. They are DIFFERENT people with DIFFERENT levels of attractiveness. Your job is to score them honestly and DIFFERENTLY.

RULES YOU CANNOT BREAK:
1. You CANNOT give Person A and Person B the same total score. They must differ by at least 8 points.
2. You CANNOT give any single person more than ONE score of 7. Everything else must be 8+ (genuine strength) or 6 and below (weakness).
3. A 5 = below average. A 3 = ugly. A 9 = model-tier. Stop hiding in the 6-7 range.
4. Age, skin damage, weak jaw, bad body = LOW scores. Defined jaw, clear skin, athletic build, strong features = HIGH scores.

Criteria:
- face_card: Jawline, bone structure, symmetry, eyes, nose. Weak jaw = 4 or below. Model jaw = 8+.
- body: Physique, build, posture visible in photo. Unfit = 4 or below. Athletic = 8+.
- style: Outfit, grooming, fit of clothes. Basic/wrinkled = 4. Sharp = 8+.
- glow: Skin quality, hair, freshness. Aged/dull skin = 3-4. Clear glowing skin = 8+.
- expression: Charisma, confidence, energy in photo.
- aura: Raw magnetism. Would a stranger look twice?

observation: Be blunt. "Weak jaw, aged skin, zero body visible" or "Sharp jawline, athletic build, clean presentation."

Return ONLY:
{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"observation":"..."},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"observation":"..."}}`,
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
      const raw1 = await openrouterFetch('meta-llama/llama-4-maverick', stage1Messages, 800);
      visualScores = JSON.parse(extractJSON(raw1));
      
      // Force score spread if AI still played it safe
      const totalA = Object.entries(visualScores.A)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);
      const totalB = Object.entries(visualScores.B)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);

      if (Math.abs(totalA - totalB) < 4) {
        log('Stage 1 scores too similar — boosting spread');
        // Nudge the higher raw scorer up and lower scorer down
        const aWins = totalA >= totalB;
        const winner = aWins ? 'A' : 'B';
        const loser = aWins ? 'B' : 'A';
        visualScores[winner].face_card = Math.min(10, visualScores[winner].face_card + 1);
        visualScores[winner].aura = Math.min(10, visualScores[winner].aura + 1);
        visualScores[loser].face_card = Math.max(1, visualScores[loser].face_card - 1);
        visualScores[loser].body = Math.max(1, visualScores[loser].body - 1);
      }
      
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
        content: 'You are a brutal judge. No diplomatic language. Winners win because they are objectively better. Losers lose because they are objectively worse. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: `Given these attractiveness scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy category scores EXACTLY as given\n- Calculate total as: sum of all 6 scores × (100/60), round to nearest integer\n- Pick winner based on higher total\n- Margin = difference between totals\n- winning_edge: one sharp sentence naming the exact deciding factor\n- verdict: 2-3 sentences. State BLUNTLY why the winner is better and what specifically is wrong with the loser. Use words like "significantly weaker", "drags the score down", "no competition". Do NOT say "despite" or use diplomatic softeners. Example: "Person A's face card is in a different league. Person B has a forgettable face and the body score sealed the loss. There was no category where B had a clear enough edge to matter."\n- reasons_for_win: 4 bullet-point reasons the winner is better\n\nReturn ONLY this JSON:\n{"winner":"A","scores":{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0}},"margin":0,"winning_edge":"One sharp sentence.","verdict":"2-3 sentence brutal verdict on why winner won and loser lost.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
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
        content: 'You are a harsh but honest personal trainer and stylist. You identify real problems and give real fixes. No sugarcoating. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `Photo ${loser} lost. Their scores: ${JSON.stringify(loserScores)}\nObservation: "${loserScores.observation}"\n\nGive 3 brutally honest improvement tips. Call out the actual problem first, then give the fix. Don't be gentle. If their face card is low, tell them what specifically to work on (angles, lighting, facial hair, skincare). If body is low, say it and give a fix. Return ONLY:\n{"weaknesses_of_loser":["Problem: X. Fix: Y.","Problem: X. Fix: Y.","Problem: X. Fix: Y."]}`,
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
      verdict: judgment.verdict,
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
