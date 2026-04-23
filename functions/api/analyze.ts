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

    // ── ANCHOR PASS: Force model to compare before scoring ─────────────────
    log('Anchor pass starting...');
    let anchorVerdict = { better: 'A', gap: 5, reason: 'Default' };
    try {
      const anchorMessages = [
        {
          role: 'system',
          content: 'You are a direct attractiveness judge. Answer only with valid JSON.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at these two people. Be completely honest.
1. Who is MORE attractive overall — A or B?
2. How big is the gap? (1 = almost equal, 10 = completely different leagues)
3. What is the single biggest visible difference?

Return ONLY: {"better":"A","gap":7,"reason":"Person A has sharper jawline and cleaner skin vs Person B who has aged skin and weaker features"}`,
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoA}` } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoB}` } },
          ],
        },
      ];
      const anchorRaw = await openrouterFetch('google/gemini-2.0-flash-001', anchorMessages, 300);
      anchorVerdict = JSON.parse(extractJSON(anchorRaw));
      log(`Anchor: ${anchorVerdict.better} wins by gap ${anchorVerdict.gap} — ${anchorVerdict.reason}`);
    } catch (err: any) {
      log('Anchor pass failed, continuing: ' + err.message);
    }

    // ── STAGE 1: Visual Audit — Vision only (Gemini) ────────────────────────
    log('Stage 1 starting...');
    const stage1Messages = [
      {
        role: 'system',
        content: 'You are a blunt attractiveness rater. You MUST differentiate between people. Giving the same score to two different people is a failure. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `IMPORTANT CONTEXT: A preliminary comparison determined that Photo ${anchorVerdict.better} is MORE attractive with a gap score of ${anchorVerdict.gap}/10. Reason: "${anchorVerdict.reason}". Your individual scores MUST reflect this — the better person should score noticeably higher overall.

Rate the PERSON'S attractiveness, not the photo quality. If someone took a sideways or tilted photo, judge their visible facial features as best you can — do NOT tank their score just because of angle.

REALISTIC SCORE SCALE — follow this strictly:
- 1–3: Genuinely ugly. Significant facial flaws, very unattractive.
- 4–5: Below average. Weak features, skin issues, nothing stands out.
- 6: Average. Forgettable but not unattractive.
- 7: Above average. Decent looking, noticeable.
- 8: Attractive. Turns heads. Clear strengths.
- 9–10: Model/celebrity tier. Reserved for genuinely exceptional looks.

Most real people score between 5–7. Do NOT give 8+ unless the person is genuinely attractive. Do NOT give 88+ total scores to average-looking people.

RULES:
1. Person A and B MUST have different totals — at least 6 points apart.
2. If a photo is blurry, sideways, or low quality — mention it in the observation but score based on what IS visible.
3. Bad photo angle ≠ ugly person. Judge the face, not the photographer.
4. Visible skin problems (acne, texture, uneven tone) = lower glow score (4–5).
5. Strong jawline, clear skin, athletic build, sharp features = 8+. Average person = 5–6.

Criteria (score 1–10):
- face_card: Bone structure, jawline, symmetry, eyes, nose
- body: Physique, build, posture — only score what's visible
- style: Outfit, grooming, presentation
- glow: Skin clarity, hair quality, freshness
- expression: Charisma, confidence, energy
- aura: Would a stranger look twice?

observation: Name the biggest strength AND biggest weakness honestly. If photo quality is bad, note it.

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
      const raw1 = await openrouterFetch('google/gemini-2.0-flash-001', stage1Messages, 800);
      visualScores = JSON.parse(extractJSON(raw1));
      
      // Force score spread if AI still played it safe
      const totalA = Object.entries(visualScores.A)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);
      const totalB = Object.entries(visualScores.B)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);

      if (Math.abs(totalA - totalB) < 6) {
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
        content: `Given these attractiveness scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nANCHOR CONTEXT: A preliminary visual audit decided ${anchorVerdict.better} is superior. Reason: "${anchorVerdict.reason}".\n\nRules:\n- Copy category scores EXACTLY as given\n- Calculate total as: sum of all 6 scores × (100/60), round to nearest integer\n- Pick winner based on higher total\n- Margin = difference between totals\n- winning_edge: one sharp sentence naming the exact deciding factor\n- verdict: 2-3 sentences. State BLUNTLY why the winner is better and what specifically is wrong with the loser. Use words like "significantly weaker", "drags the score down", "no competition". Do NOT say "despite" or use diplomatic softeners. Your reasoning MUST align with the ANCHOR CONTEXT mentioned above.\n- reasons_for_win: 4 bullet-point reasons the winner is better\n\nReturn ONLY this JSON:\n{"winner":"A","scores":{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0}},"margin":0,"winning_edge":"One sharp sentence.","verdict":"2-3 sentence brutal verdict on why winner won and loser lost.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
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
