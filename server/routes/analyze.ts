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

  try {
    const { photoA, photoB, mode = 'general' } = req.body;

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
    const cleanStage1 = rawStage1.replace(/```json|```/g, '').trim();
    const visualScores = JSON.parse(cleanStage1);

    // ── STAGE 2: Judgment — DeepSeek R1 ───────────────────────────────────
    const stage2 = await openrouter.chat.completions.create({
      model: 'deepseek/deepseek-r1',
      messages: [
        {
          role: 'system',
          content: 'You are VRSUS Judge. You receive visual scores and pick a winner. Respond only with valid JSON, no markdown fences, no reasoning text outside the JSON.',
        },
        {
          role: 'user',
          content: `Given these visual scores for mode "${mode}":\n${JSON.stringify(visualScores, null, 2)}\n\nCalculate a total score out of 100 for each photo using equal category weights. Pick a clear winner. Return ONLY this JSON:\n{"winner":"A","scores":{"A":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0},"B":{"confidence":0,"lighting":0,"expression":0,"grooming":0,"composition":0,"presence":0,"total":0}},"margin":0,"winning_edge":"One sentence on the exact deciding factor.","reasons_for_win":["reason 1","reason 2","reason 3","reason 4"]}`,
        },
      ],
    });

    const rawStage2 = stage2.choices[0].message.content || '{}';
    const cleanStage2 = rawStage2.replace(/```json|```/g, '').trim();
    const judgment = JSON.parse(cleanStage2);

    // ── STAGE 3: Glow-Up Tips — Llama 3.3 70B ────────────────────────────
    const loser = judgment.winner === 'A' ? 'B' : 'A';
    const loserScores = visualScores[loser];

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
    const cleanStage3 = rawStage3.replace(/```json|```/g, '').trim();
    const tips = JSON.parse(cleanStage3);

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
    console.error('Analysis pipeline error:', err.message);
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

export default router;
