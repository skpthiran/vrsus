import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/analyze', async (req: Request, res: Response) => {
  const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'VRSUS',
    },
  });

  const { photoA, photoB, mode = 'general' } = req.body;
  console.log('📥 Analyze request received, mode:', mode);

  try {
    if (!photoA || !photoB) {
      return res.status(400).json({ error: 'Both photoA and photoB are required' });
    }

    // ── STAGE 1: Visual Audit — Qwen VL Plus ──────────────────────────────
    const stage1 = await openrouter.chat.completions.create({
      model: 'qwen/qwen-vl-plus',
      messages: [
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
      ],
    });

    const rawStage1 = stage1.choices[0].message.content || '{}';
    console.log('✅ Stage 1 raw response:', rawStage1);
    
    // Improved JSON extraction: find the first { and the last }
    const extractJSON = (text: string) => {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? match[0] : text;
    };

    let visualScores;
    try {
      visualScores = JSON.parse(extractJSON(rawStage1));
      console.log('✅ Stage 1 parsed OK');
    } catch (e) {
      console.error('❌ Stage 1 JSON parse failed. Raw was:', rawStage1);
      throw new Error('Stage 1 JSON parse failed');
    }

    // ── STAGE 2: Judgment — DeepSeek R1 ───────────────────────────────────
    let judgment;
    try {
      const stage2 = await openrouter.chat.completions.create({
        model: 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'system',
            content: 'You are VRSUS Judge. You receive visual scores and pick a winner. Respond only with valid JSON, no markdown fences, no reasoning text outside the JSON.',
          },
          {
            role: 'user',
            content: `Given these visual scores for mode "${mode}":
${JSON.stringify(visualScores, null, 2)}

Rules:
- Copy the category scores EXACTLY as given above (do not change any values)
- Calculate total as: sum of all 6 category scores multiplied by (100/60) to normalize to 100
- Round total to nearest integer
- Pick the winner based on higher total
- Calculate margin as the difference between the two totals

Return ONLY this JSON with no extra text:
{"winner":"A","scores":{"A":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0},"B":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0}},"margin":0,"winning_edge":"One sentence on the exact deciding factor.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
          },
        ],
      });

      const rawStage2 = stage2.choices[0].message.content || '{}';
      console.log('✅ Stage 2 raw response:', rawStage2);
      judgment = JSON.parse(extractJSON(rawStage2));
      console.log('✅ Stage 2 parsed OK');
    } catch (e: any) {
      console.error('❌ Stage 2 failed, using fallback:', e.message);
      const totalA = Math.round(Object.values(visualScores.A).filter(v => typeof v === 'number').reduce((a, b) => (a as any) + (b as any), 0) * (100 / 60));
      const totalB = Math.round(Object.values(visualScores.B).filter(v => typeof v === 'number').reduce((a, b) => (a as any) + (b as any), 0) * (100 / 60));
      const aWins = totalA >= totalB;
      judgment = {
        winner: aWins ? 'A' : 'B',
        scores: {
          A: { ...visualScores.A, total: totalA },
          B: { ...visualScores.B, total: totalB },
        },
        margin: Math.abs(totalA - totalB),
        winning_edge: aWins ? 'Superior overall presentation and visual clarity.' : 'Stronger presence and technical execution.',
        reasons_for_win: ['Stronger bone structure', 'Clearer skin quality', 'Better overall style', 'Higher visual aura']
      };
    }

    // ── STAGE 3: Glow-Up Tips — Llama 3.3 70B ────────────────────────────
    const loser = judgment.winner === 'A' ? 'B' : 'A';
    const loserScores = visualScores[loser];

    let tips;
    try {
      const stage3 = await openrouter.chat.completions.create({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly photo coach. Be encouraging but actionable. Respond only with valid JSON, no markdown fences.',
          },
          {
            role: 'user',
            content: `The losing photo (Photo ${loser}) had these scores: ${JSON.stringify(loserScores)}\nObservation: "${loserScores.observation}"\nMode: "${mode}"\n\nWrite 3 specific, actionable improvement tips. Return ONLY this JSON:\n{"weaknesses_of_loser":["tip 1","tip 2","tip 3"]}`,
          },
        ],
      });

      const rawStage3 = stage3.choices[0].message.content || '{}';
      console.log('✅ Stage 3 raw response:', rawStage3);
      tips = JSON.parse(extractJSON(rawStage3));
      console.log('✅ Stage 3 parsed OK');
    } catch (e: any) {
      console.error('❌ Stage 3 failed, using fallback:', e.message);
      tips = {
        weaknesses_of_loser: [
          'Work on lighting to highlight facial definition.',
          'Try different angles to capture your best features.',
          'Maintain consistent grooming for a sharper look.'
        ]
      };
    }

    // ── FINAL RESPONSE ────────────────────────────────────────────────────
    return res.json({
      winner: judgment.winner,
      margin: judgment.margin,
      scores: judgment.scores,
      reasons_for_win: judgment.reasons_for_win,
      weaknesses_of_loser: tips.weaknesses_of_loser,
      summary: judgment.winning_edge,
    });

  } catch (err: any) {
    console.error('❌ Pipeline failed at stage:', err.message, err.stack);
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

export default router;
