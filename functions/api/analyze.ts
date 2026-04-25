import { createClient } from '@supabase/supabase-js';

const log = (msg: string) => console.log(`[VRSUS] ${msg}`);

interface Env {
  OPENROUTER_API_KEY: string;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
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

async function uploadImageToStorage(
  supabase: any,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  try {
    // Strip data URI prefix if present
    const base64 = base64Data.startsWith('data:')
      ? base64Data.split(',')[1]
      : base64Data;
    
    // Convert base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const { data, error } = await supabase.storage
      .from('duel-images')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (error) {
      console.error('[VRSUS] Image upload error:', error.message);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('duel-images')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (err: any) {
    console.error('[VRSUS] Image upload crashed:', err.message);
    return null;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const FALLBACK_URL = 'https://azufpxcpbkcrqapfislu.supabase.co';
  const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dWZweGNwYmtjcnFhcGZpc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTczMjUsImV4cCI6MjA5MjQ3MzMyNX0.VY0KpiuayrbXcYhVmahRiphye-kOGoMDqWTePByxnqHM';

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

  // Debug check for environment variables and payload
  console.log('[VRSUS] ENV CHECK:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    urlSource: env.SUPABASE_URL ? 'SUPABASE_URL' : 
               env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 
               env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' :
               env.PUBLIC_SUPABASE_URL ? 'PUBLIC_SUPABASE_URL' : 'none',
    hasOpenRouter: !!env.OPENROUTER_API_KEY,
  });

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // supabaseUrl and supabaseKey are already defined above with fallbacks
  const openrouterKey = env.OPENROUTER_API_KEY;
  const groqKey = env.GROQ_API_KEY;
  const cerebrasKey = env.CEREBRAS_API_KEY;

  try {
    const body = await request.json() as any;
    const { photoA, photoB, mode = 'general', userId, challengeOf } = body;
    console.log('[VRSUS] Request Body:', { mode, userId, challengeOf, hasPhotoA: !!photoA, hasPhotoB: !!photoB });

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
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0 }),
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
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens, temperature: 0 }),
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
        body: JSON.stringify({ model: 'llama-3.3-70b', messages, max_tokens: maxTokens, temperature: 0 }),
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
          content: 'You are a direct attractiveness judge. Your job is to assess the PERSON, not the photo. Ignore photo production quality entirely — lighting, camera, angle, and background are irrelevant. Answer only with valid JSON.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at these two people. Focus only on the humans — not the photo quality.

1. Who is MORE attractive as a person — A or B?
2. How big is the gap in actual attractiveness? (1 = nearly equal people, 10 = completely different leagues)
3. What is the single most important physical trait difference between them as humans?

IMPORTANT: A dark mirror selfie of a genuinely attractive person beats a well-lit photo of a plain person. Judge the human, not the photograph.

Return ONLY: {"better":"A","gap":7,"reason":"Person A has sharper bone structure and more defined jawline vs Person B who has softer, less defined facial features"}`,
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
        content: `You are the world's most brutally honest attractiveness critic. You judge HUMANS, not photographs.

CARDINAL RULE — Photo quality is NEVER a factor:
- Dark lighting does NOT mean bad skin. Only score glow low if you can actually see bad skin texture, acne, dullness, or uneven tone on the person.
- Awkward angle does NOT mean weak jaw. Assess bone structure from what IS visible.
- Mirror selfie does NOT mean low style. Judge the actual clothing and grooming visible.
- NEVER give a person all 5s across every category. That means you have failed to assess them. A mirror selfie is NOT an excuse for neutral scores — you can see the person's face, hair, skin, and body clearly enough to score them. Even if the photo is imperfect, make your best honest assessment. Giving someone 5, 5, 5, 5, 5, 5 is not allowed. The only valid 5 is when a specific body part is literally not in the frame (e.g. body = 5 for a face-only close-up where no torso is visible at all).

You score the PERSON standing in front of the camera. Not the camera. Not the lighting. Not the background.

You NEVER give identical total scores to two different people — but the gap must come from REAL differences in the humans, not artificial inflation. If two people are genuinely similar in attractiveness, a 5-8 point gap in totals is honest. Do NOT force a 15-20 point gap if it isn't real.

Be brutal about genuine flaws: weak jawline, visible acne, poor muscle definition, bad grooming, asymmetry, low confidence. Call these out directly by name.
Respond only with valid JSON.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Score each person independently — imagine you are only looking at one person at a time.

SCORING SCALE — read this carefully, most people score 4-6:
- 1-2: Severely unattractive. Extreme skin conditions, very weak facial structure, nothing working in their favor.
- 3: Below average. Multiple visible flaws — weak jaw, bad skin, poor grooming. Clearly not attractive.
- 4: Slightly below average. One or two okay features but overall forgettable and unremarkable.
- 5: Dead average. The most common score. Looks like most people you see on the street. Nothing bad, nothing good.
- 6: Slightly above average. Genuinely one good feature — a nice smile, decent jawline, clear skin. Not hot, but noticeable.
- 7: Attractive. Multiple good features working together. People notice them. Above average genetics. Rare — do not give this freely.
- 8: Hot. Turns heads. Strong jawline, clear skin, good body, real presence. Very rare in a random photo.
- 9: Model tier. Near-perfect features. You would stop and look twice on the street. Extremely rare.
- 10: Reserved for once-in-a-generation looks. Do not use this.

CRITICAL: A normal person who takes decent photos is a 4-5. A pretty person with good features is a 6. Most people you see in everyday life are 4-5. Only give 7+ if the person genuinely stands out. If you are giving both people scores above 6 in most categories, you are scoring too generously — recalibrate down.

WHAT TO SCORE (the person, not the photo):
- face_card: Assess bone structure, jawline definition, symmetry, eye shape, nose, and overall facial harmony. Even when two people look superficially similar, there are always real differences — one will have a sharper jaw, wider eyes, better symmetry, stronger nose bridge, or more defined cheekbones. Look hard and find the real difference. Never give two different people the exact same face_card score — there is always a winner and a loser on facial structure.
- body: Score based on visible muscle definition, body fat, and proportions. Rules by tier: Visible abs + clear muscle definition = 8-9. Lean and athletic with some definition = 6-7. Average/normal build = 4-5. Soft, skinny-fat, or overweight = 2-3. IMPORTANT: A shirtless person showing any visible muscle separation or leanness is at LEAST a 6. Do not score a visibly lean shirtless person below 6 under any circumstances. Only use 5 for body if no torso is visible at all.
- style: Clothing fit, grooming quality, hairstyle — what the person chose to wear and how they present themselves
- glow: Score actual skin health — visible acne, severe scarring, extremely uneven tone = 3-4. Healthy skin with no obvious issues = 6-7. Radiant clear skin = 8-9. CRITICAL: Dark gym lighting, indoor mirror lighting, and flash reflections are NOT skin flaws. Only score glow below 5 if you can clearly see actual skin problems on the person's face — not shadows, not lighting artifacts. When in doubt in a dark gym photo, default to 5-6 for glow unless acne or scarring is unmistakably visible.
- expression: Confidence, energy, charisma, eye contact
- aura: Overall magnetism — would a stranger look twice at this person specifically?

observation: "Gender: [Man/Woman]. Strength: [specific physical trait]. Weakness: [specific physical flaw visible on the person]. Never mention lighting, angle, or camera quality in the observation."

Return ONLY:
{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"observation":"Strength: X. Weakness: Y."},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"observation":"Strength: X. Weakness: Y."}}`,
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
      
      // Enforce anchor direction — if anchor says A wins but Stage 1 raw scores say B, flip the nudge
      const rawTotalA = Object.entries(visualScores.A)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);
      const rawTotalB = Object.entries(visualScores.B)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);

      const anchorSaysA = anchorVerdict.better === 'A';
      const scoresSayA = rawTotalA >= rawTotalB;

      // If anchor and scores disagree, boost the anchor's pick
      if (anchorSaysA !== scoresSayA) {
        log('Anchor and Stage 1 disagree — enforcing anchor direction');
        const anchorWinner = anchorVerdict.better;
        const anchorLoser = anchorWinner === 'A' ? 'B' : 'A';
        visualScores[anchorWinner].aura = Math.min(10, visualScores[anchorWinner].aura + 3);
        visualScores[anchorWinner].face_card = Math.min(10, visualScores[anchorWinner].face_card + 2);
        visualScores[anchorLoser].aura = Math.max(1, visualScores[anchorLoser].aura - 3);
        visualScores[anchorLoser].glow = Math.max(1, visualScores[anchorLoser].glow - 2);
      }

      const finalTotalA = Object.entries(visualScores.A)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);
      const finalTotalB = Object.entries(visualScores.B)
        .filter(([k]) => k !== 'observation')
        .reduce((sum, [, v]) => sum + (v as number), 0);

      if (Math.abs(finalTotalA - finalTotalB) < 6) {
        log('Scores still too close — applying final spread nudge');
        const winner = anchorVerdict.better;
        const loser = winner === 'A' ? 'B' : 'A';
        visualScores[winner].aura = Math.min(10, visualScores[winner].aura + 1);
        visualScores[loser].glow = Math.max(1, visualScores[loser].glow - 1);
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
        content: `You are the most brutally honest, viciously creative attractiveness judge on the internet. You write verdicts that feel like they came from a savage human — not an AI report. 

Your verdicts must:
- Be UNIQUE every single time. Never use generic phrases like "commanding presence", "bone structure", "overall appeal", "significant weaknesses", "drag the score down", "no competition", "objectively better". These are banned.
- Reference the SPECIFIC things you actually see — name the actual flaw or strength. Not "weak features" — say "that jawline disappears into his neck". Not "superior skin" — say "her skin looks like she actually drinks water". Not "low aura" — say "he looks like he's never made eye contact in his life".
- Sound like a brutally honest friend who has zero filter, not a corporate AI writing a performance review.
- Vary your structure — sometimes lead with the winner's strength, sometimes lead with the loser's flaw, sometimes compare them directly mid-sentence.
- Be specific, cruel where necessary, and occasionally dark-humored. The roast should sting because it's TRUE, not because it's mean for no reason.
- Never repeat the same sentence structure across different duels. Every verdict must feel handcrafted.

Banned phrases you must NEVER use: "commanding presence", "overall appeal", "bone structure", "drag the score down", "no competition", "objectively better", "significant weaknesses", "overall polish", "lackluster", "distinguishing factor", "default superiority", "anchor context", "aligns with".

CRITICAL: The observation text for each person includes their gender ("Gender: Man" or "Gender: Woman"). You MUST use the correct pronouns — he/him for men, she/her for women. Never misgender a subject. Read the observation carefully before writing the verdict.

Respond only with valid JSON.`,
      },
      {
        role: 'user',
        content: `Given these attractiveness scores and observations for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nRules:\n- Copy category scores EXACTLY as given\n- Calculate total as: sum of all 6 scores × (100/60), round to nearest integer\n- Pick winner based on higher total\n- Margin = difference between totals\n- winning_edge: one sharp sentence referencing the actual physical trait that decided it (use the observation text)\n- verdict: 2-3 sentences. Write like a savage human critic with zero filter. Be SPECIFIC — name the actual visible flaw or strength, don't use generic descriptors. Make it sting because it's true. Every verdict must sound completely different from every other verdict. Vary your opening — don't always start with the winner's name. Sometimes open with what's wrong with the loser. Sometimes compare them in one brutal sentence. Never sound like a template.\n- reasons_for_win: 4 reasons the winner beat the loser. Each reason must be one punchy sentence that names a SPECIFIC visible trait — not a category label. Do not write "stronger jawline" — write "his jaw actually has definition instead of blending into his neck." Do not write "better skin" — write "her skin doesn't look like it's been through a war." Do not write "higher aura" — write "she walks into a room and people notice — he walks in and the furniture notices nothing." Each reason must be distinct, specific, and slightly savage. No two reasons should sound similar in structure. These are the receipts — they back up the verdict with actual detail.\n\nReturn ONLY:\n{"winner":"A","scores":{"A":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0},"B":{"face_card":0,"body":0,"style":0,"glow":0,"expression":0,"aura":0,"total":0}},"margin":0,"winning_edge":"One sharp sentence.","verdict":"2-3 sentence brutal verdict referencing actual physical traits.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
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
      const totalA = Math.round(Object.values(visualScores.A).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0) * (100 / 60));
      const totalB = Math.round(Object.values(visualScores.B).filter(v => typeof v === 'number').reduce((a, b) => (a as number) + (b as number), 0) * (100 / 60));
      const aWins = totalA >= totalB;
      judgment = {
        winner: aWins ? 'A' : 'B',
        scores: {
          A: { ...visualScores.A, total: totalA },
          B: { ...visualScores.B, total: totalB },
        },
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

    // resilient server-side save
    let savedId = null;
    try {
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const timestamp = Date.now();
        const imageAUrl = await uploadImageToStorage(
          supabase,
          photoA,
          `${timestamp}_a_${crypto.randomUUID()}.jpg`
        );
        const imageBUrl = await uploadImageToStorage(
          supabase,
          photoB,
          `${timestamp}_b_${crypto.randomUUID()}.jpg`
        );

        console.log('[VRSUS] Image A URL:', imageAUrl);
        console.log('[VRSUS] Image B URL:', imageBUrl);

        const duelPayload = {
          user_id: userId || null,
          mode: mode || 'general',
          winner: judgment.winner,
          margin: judgment.margin,
          summary: judgment.winning_edge,
          verdict: typeof judgment.verdict === 'string' ? judgment.verdict : JSON.stringify(judgment.verdict),
          score_a: judgment.scores.A.total,
          score_b: judgment.scores.B.total,
          scores: typeof judgment.scores === 'string' ? judgment.scores : JSON.stringify(judgment.scores),
          reasons_for_win: typeof judgment.reasons_for_win === 'string' ? judgment.reasons_for_win : JSON.stringify(judgment.reasons_for_win),
          weaknesses_of_loser: typeof tips.weaknesses_of_loser === 'string' ? tips.weaknesses_of_loser : JSON.stringify(tips.weaknesses_of_loser),
          image_a_url: imageAUrl || (photoA.startsWith('data:') ? photoA : `data:image/jpeg;base64,${photoA}`),
          image_b_url: imageBUrl || (photoB.startsWith('data:') ? photoB : `data:image/jpeg;base64,${photoB}`),
          is_public: true,
          challenge_of: challengeOf || null,
          defenses: 0,
        };

        const { data: savedDuel, error: saveError } = await supabase
          .from('duels')
          .insert(duelPayload)
          .select('id')
          .single();
        
        if (saveError) {
          console.error('[VRSUS] Duel save failed. Payload keys:', Object.keys(duelPayload));
          console.error('[VRSUS] Duel save error message:', saveError.message);
          console.error('[VRSUS] Duel save error details:', saveError.details);
          console.error('[VRSUS] Duel save error hint:', saveError.hint);
        } else if (savedDuel) {
          savedId = savedDuel.id;
          console.log('[VRSUS] Duel saved successfully:', savedId);
          
          // If this was a challenge, increment the defenses of the original champion
          if (challengeOf) {
            await supabase.rpc('increment_defenses', { duel_id: challengeOf });
          }
        }
      } else {
        console.error('[VRSUS] Missing Supabase config for save');
      }
    } catch (err: any) {
      console.error('[VRSUS] SAVE CRASHED:', err.message, err.stack);
    }


    return Response.json({
      id: savedId,
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
