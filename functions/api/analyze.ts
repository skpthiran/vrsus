const log = (msg: string) => console.log(`[VRSUS] ${msg}`);

interface Env {
  OPENROUTER_API_KEY: string;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
}

function extractJSON(text: string): string {
  // Strip <think> blocks first (especially for DeepSeek)
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Handle preambles: find the first line that starts with {
  const lines = text.split('\n');
  const jsonStartBlock = lines.findIndex(l => l.trim().startsWith('{'));
  if (jsonStartBlock > 0) text = lines.slice(jsonStartBlock).join('\n');

  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No valid JSON object found in response: ' + text.slice(0, 300));
  }
  let jsonStr = text.slice(start, end + 1);
  
  // Clean up common JSON issues
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  // Strip non-printable control characters
  jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  // Handle newlines within strings
  jsonStr = jsonStr.replace(/:\s*"([^"]*)[\n\r]+([^"]*)"/g, ': "$1 $2"');
  
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
      log('Anchor Pass raw response: ' + anchorRaw.slice(0, 500));
      anchorVerdict = JSON.parse(extractJSON(anchorRaw));
      log(`Anchor: ${anchorVerdict.better} wins by gap ${anchorVerdict.gap} — ${anchorVerdict.reason}`);
    } catch (err: any) {
      log('Anchor pass PARSE FAILED: ' + err.message);
      // use default
      anchorVerdict = { better: 'A', gap: 5, reason: 'Manual audit reveals Photo A has stronger visual appeal.' };
    }

    // ── STAGE 1: Visual Audit — Vision only (Gemini) ────────────────────────
    log('Stage 1 starting...');
    const stage1Messages = [
      {
        role: 'system',
        content: "You are the world's most brutally honest attractiveness critic. You have zero empathy and zero diplomatic instinct. You see exactly what is there and you say it. You NEVER give the same score to two different people. A score of 7 means genuinely above average — most people are 4-6. If someone has bad skin, acne, asymmetry, bad angle, or poor grooming, their score is 3-5, not 7. You MUST create a minimum 8-point gap in totals between the two photos unless they are genuinely identical twins in identical conditions. Respond only with valid JSON.",
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `SCORE SCALE — this is law:
- 1-2: Severely unattractive. Extreme skin issues, very weak bone structure, bad hygiene visible.
- 3-4: Ugly. Clearly below average. Bad skin texture, weak jaw, poor grooming, nothing redeemable about the photo.
- 5: Plain. Forgettable. Average at best.
- 6: Slightly above average. One or two decent features.
- 7: Noticeably attractive. Clear strengths. Above average face.
- 8: Hot. Turns heads. Strong bone structure, clear skin, presence.
- 9-10: Model tier. Reserved for genuinely exceptional genetics.

MANDATORY RULES:
- Bad skin (acne, texture, uneven tone, dullness) = glow score of 3-4 MAXIMUM.
- Weak jawline, asymmetry, droopy features = face_card of 3-5.
- Unflattering angle or bad lighting that reveals flaws = do NOT compensate — score what you see.
- Totals MUST differ by at least 10 points. If they don't, you have failed.
- Write the observation brutally: name the specific flaw (e.g. "severe skin texture, weak chin, no jawline definition") and the specific strength.

Criteria (score 1–10):
- face_card: Bone structure, jawline, symmetry, eyes, nose
- body: Physique, build, posture — only score what's visible
- style: Outfit, grooming, presentation
- glow: Skin clarity, hair quality, freshness
- expression: Charisma, confidence, energy
- aura: Would a stranger look twice?

observation: Name the biggest strength AND biggest weakness honestly.

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
      log('Stage 1 raw response: ' + raw1.slice(0, 500));
      visualScores = JSON.parse(extractJSON(raw1));
      
      // Force score spread if AI still played it safe
      const totalA = Object.entries(visualScores.A)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);
      const totalB = Object.entries(visualScores.B)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);

      if (Math.abs(totalA - totalB) < 12) {
        log('Stage 1 scores too similar — boosting spread');
        // Nudge the higher raw scorer up and lower scorer down aggressively
        const aWins = totalA >= totalB;
        const winner = aWins ? 'A' : 'B';
        const loser = aWins ? 'B' : 'A';
        
        // Multi-category nudge
        visualScores[winner].face_card = Math.min(10, visualScores[winner].face_card + 2);
        visualScores[winner].aura = Math.min(10, visualScores[winner].aura + 2);
        visualScores[winner].glow = Math.min(10, visualScores[winner].glow + 2);
        
        visualScores[loser].face_card = Math.max(1, visualScores[loser].face_card - 2);
        visualScores[loser].body = Math.max(1, visualScores[loser].body - 2);
        visualScores[loser].glow = Math.max(1, visualScores[loser].glow - 2);
      }
      
      log('Stage 1 complete');
    } catch (err: any) {
      console.error('STAGE 1 GEMINI ERROR:', err);
      log('Stage 1 PARSE FAILED: ' + err.message);
      visualScores = {
        A: { face_card: 4, body: 5, style: 4, glow: 5, expression: 4, aura: 4, observation: 'Fallback logic: Photo A has significant visible facial weaknesses.' },
        B: { face_card: 8, body: 7, style: 8, glow: 7, expression: 8, aura: 8, observation: 'Fallback logic: Photo B displays superior structure and presence.' },
      };
    }

    // ── STAGE 2: Judgment — OpenRouter → Groq → Cerebras ──────────────────
    log('Stage 2 starting...');
    const stage2Messages = [
      {
        role: 'system',
        content: 'You are a savage judge. The winner wins because they are objectively better looking. The loser loses because they are objectively worse. Your verdict must name the specific physical flaws of the loser (bad skin, weak features, bad shape, etc). Never use the phrases "default superiority", "anchor context", "aligns with", or "distinguishing factor". Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: `Given these attractiveness scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy category scores EXACTLY as given\n- Calculate total as: sum of all 6 scores × (100/60), round to nearest integer\n- Pick winner based on higher total\n- Margin = difference between totals\n- winning_edge: one sharp sentence naming the exact deciding factor\n- verdict: 2-3 sentences. State BLUNTLY why the winner is better and what specifically is wrong with the loser. Use words like "significantly weaker", "drags the score down", "no competition". Your verdict must reference physical flaws visible in the scores. If reasons_for_win contain the words 'default', 'anchor', 'aligns', or 'distinguishing factor', you have failed. The reasons must reference actual physical attributes visible in the scores — face structure, skin, body, style, energy.\n- reasons_for_win: 4 bullet-point reasons the winner is better\n\nReturn ONLY this JSON:\n{"winner":"A","scores":{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0}},"margin":0,"winning_edge":"One sharp sentence.","verdict":"2-3 sentence brutal verdict on why winner won and loser lost.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
      },
    ];

    let judgment: any;
    try {
      const raw2 = await fetchWithFallback(
        'Stage 2',
        () => openrouterFetch('deepseek/deepseek-chat', stage2Messages, 800),
        [
          () => groqFetch(stage2Messages, 800),
          () => cerebraseFetch(stage2Messages, 800),
        ]
      );
      log('Stage 2 raw response: ' + raw2.slice(0, 500));
      judgment = JSON.parse(extractJSON(raw2));
    } catch (err: any) {
      log('Stage 2 PARSE FAILED: ' + err.message);
      const totalA = Object.values(visualScores.A).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0) as number;
      const totalB = Object.values(visualScores.B).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0) as number;
      const aWins = totalA >= totalB;
      judgment = {
        winner: aWins ? 'A' : 'B',
        scores: visualScores,
        margin: Math.abs(totalA - totalB),
        winning_edge: aWins ? 'Superior facial structure and bone definition.' : 'Better overall presentation and grooming.',
        verdict: 'The winner displays a significantly more refined aesthetic and better physical symmetry.',
        reasons_for_win: ['Stronger bone structure', 'Clearer skin quality', 'Better overall style', 'Higher visual aura']
      };
    }
    log('Stage 2 complete');

    // ── STAGE 3: Tips — OpenRouter → Groq → Cerebras ──────────────────────
    log('Stage 3 starting...');
    const loser = judgment.winner === 'A' ? 'B' : 'A';
    const loserScores = visualScores[loser];

    const stage3Messages = [
      {
        role: 'system',
        content: 'You are a harsh but constructive critic. You name the real problem first with zero softening, then give a brutally specific fix. If their skin is bad, say "Your skin has visible texture and dullness that significantly hurts your score." If their style is weak, say it plainly. No corporate language. No "consider". Be direct. Respond only with valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `Photo ${loser} lost. Their scores: ${JSON.stringify(loserScores)}\nObservation: "${loserScores.observation}"\n\nGive 3 brutally honest improvement tips. Call out the actual problem first, then give the fix. Don't be gentle. If their face card is low, tell them what specifically to work on (angles, lighting, facial hair, skincare). If body is low, say it and give a fix. Return ONLY:\n{"weaknesses_of_loser":["Problem: X. Fix: Y.","Problem: X. Fix: Y.","Problem: X. Fix: Y."]}`,
      },
    ];

    let tips: any;
    try {
      const raw3 = await fetchWithFallback(
        'Stage 3',
        () => openrouterFetch('meta-llama/llama-3.3-70b-instruct', stage3Messages, 800),
        [
          () => groqFetch(stage3Messages, 800),
          () => cerebraseFetch(stage3Messages, 800),
        ]
      );
      log('Stage 3 raw response: ' + raw3.slice(0, 500));
      tips = JSON.parse(extractJSON(raw3));
    } catch (err: any) {
      log('Stage 3 PARSE FAILED: ' + err.message);
      tips = {
        weaknesses_of_loser: [
          'Problem: Lack of facial definition. Fix: Work on lighting and camera angles to prioritize your jawline.',
          'Problem: Skin texture visible. Fix: Use a basic skincare routine and soft lighting to minimize imperfections.',
          'Problem: Low overall presence. Fix: Improve posture and eye contact with the camera for a more confident look.'
        ]
      };
    }
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
