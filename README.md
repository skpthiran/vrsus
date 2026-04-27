[README.md](https://github.com/user-attachments/files/27114583/README.md)
# VRSUS — AI Photo Battle Platform

> Upload two photos. Let AI pick the winner.

**VRSUS** is a competitive photo battle platform where two images go head-to-head and a multi-stage AI pipeline delivers a verdict — scoring each person across six dimensions, generating a brutal written breakdown, and crowning a winner. No votes. No followers. Pure AI judgment.

🔗 **Live:** [e2c7a957.vrsus.pages.dev/duel](https://e2c7a957.vrsus.pages.dev/duel)

---

## What It Does

Submit two photos and VRSUS runs them through a 3-stage AI pipeline:

1. **Anchor Pass** — Gemini Vision establishes the ground truth winner before scoring begins, preventing score drift
2. **Visual Audit (Stage 1)** — Gemini 2.0 Flash scores each person independently across six dimensions: face card, body, style, glow, expression, and aura
3. **Verdict Generation (Stage 2)** — DeepSeek writes a brutal, handcrafted-feeling written judgment with a winning edge, margin, and four reasons for the win
4. **Improvement Tips (Stage 3)** — The loser receives three specific, harsh-but-constructive critiques with actionable fixes

Every verdict is unique. Every score is anchored against vision-level ground truth.

---

## Architecture

### Multi-Provider AI Inference Pipeline

VRSUS is built on a **fault-tolerant multi-provider inference system** designed to never fail silently. Each text-generation stage cascades through three providers automatically:

```
Stage 1 (Vision)       → Gemini 2.0 Flash (OpenRouter)
                           └─ fallback: neutral scores + anchor enforcement

Stage 2 (Verdict)      → DeepSeek Chat (OpenRouter)
                           └─ fallback: Groq [llama-3.3-70b-versatile]
                           └─ fallback: Cerebras [llama-3.3-70b]

Stage 3 (Tips)         → Llama 3.3 70B (OpenRouter)
                           └─ fallback: Groq [llama-3.3-70b-versatile]
                           └─ fallback: Cerebras [llama-3.3-70b]
```

**Groq handles Stage 2 and Stage 3 fallback inference** — chosen specifically for its ultra-low latency. In a live battle product, a user waiting 8+ seconds for a verdict kills the experience. Groq's LPU inference keeps the pipeline fast even when primary providers are slow or unavailable.

The `fetchWithFallback` orchestrator logs every provider attempt and surface, giving full visibility into which model served each stage in production.

### Anchor Enforcement System

Before scoring, a lightweight anchor pass forces the model to commit to a winner. If Stage 1 visual scores contradict the anchor verdict, the system automatically nudges scores in the anchor's direction — scaled to the anchor's confidence gap (1–10). This prevents the common failure mode where two similar-looking inputs receive nearly identical scores and produce a meaningless result.

### Deployment

- **Frontend:** React 19 + Vite, deployed on Cloudflare Pages
- **Backend:** Cloudflare Workers (Pages Functions) — `functions/api/analyze.ts`
- **Database:** Supabase (PostgreSQL + Realtime + Row Level Security)
- **Image Storage:** Supabase Storage (`duel-images` bucket)
- **Real-time leaderboard:** Supabase Realtime subscriptions

---

## Features

**Core**
- Upload any two photos and receive an AI verdict in seconds
- Six-dimension scoring system: face card, body, style, glow, expression, aura
- Brutal, uniquely-generated written verdicts — no two are the same
- Improvement tips for the losing photo

**Competitive Layer**
- Multi-metric leaderboard: win count, win rate, and win streak
- Daily, Weekly, and All-Time tabs — top 10 only
- Champion system: challenge the current champion with your best duel
- Defense counter: champions earn defense tallies for every title defense
- Rank progression: Bronze → Silver → Gold → Elite → God

**Social**
- Public duel feed with infinite scroll
- Shareable result cards (html2canvas)
- User profiles with full duel history
- Challenge system: duel directly against another user's best photo

**UX**
- Dark, high-contrast UI with Motion.js animations
- Mobile-first layout down to 375px
- Auth via Supabase (email + OAuth)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Motion.js |
| Routing | React Router v7 |
| Backend | Cloudflare Workers (Pages Functions) |
| Database | Supabase — PostgreSQL, Realtime, RLS, Storage |
| AI — Vision | Google Gemini 2.0 Flash via OpenRouter |
| AI — Verdict | DeepSeek Chat → **Groq (llama-3.3-70b)** → Cerebras |
| AI — Tips | Llama 3.3 70B → **Groq (llama-3.3-70b)** → Cerebras |
| Deployment | Cloudflare Pages |
| UI Components | Lucide React, html2canvas |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- API keys for at least one AI provider (OpenRouter recommended for vision support)

### Installation

```bash
git clone https://github.com/skpthiran/vrsus
cd vrsus
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For the Cloudflare Worker (`functions/api/analyze.ts`), set these as Worker secrets via the Cloudflare dashboard or `wrangler secret put`:

```
SUPABASE_URL
SUPABASE_ANON_KEY
OPENROUTER_API_KEY     # Required for vision (Gemini) — Stage 1
GROQ_API_KEY           # Fallback inference for Stage 2 + 3
CEREBRAS_API_KEY       # Second fallback
```

> The pipeline degrades gracefully. If only `OPENROUTER_API_KEY` is set, Stage 1 runs normally and Stages 2–3 will attempt OpenRouter models. Adding `GROQ_API_KEY` enables the fast fallback layer.

### Running Locally

```bash
# Frontend only
npm run dev

# Frontend + Express dev server
npm run dev:all
```

### Deploying to Cloudflare Pages

```bash
npm run build
```

Deploy the `dist/` folder to Cloudflare Pages and connect the `functions/` directory as Pages Functions. Set all Worker secrets via the Cloudflare dashboard.

---

## Project Structure

```
vrsus/
├── functions/
│   └── api/
│       └── analyze.ts        # Core AI pipeline — Cloudflare Worker
├── src/
│   ├── pages/
│   │   ├── CreateDuelPage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── ExplorePage.tsx
│   │   └── ProfilePage.tsx
│   ├── lib/
│   │   ├── leaderboard.ts    # Champion system + multi-metric rankings
│   │   ├── ranks.ts          # Rank calculation (Bronze → God)
│   │   ├── duels.ts
│   │   └── supabase.ts
│   └── components/
│       ├── DuelCard.tsx
│       └── ShareCard.tsx
└── public/
    └── manifest.json         # PWA manifest
```

---

## The AI Pipeline In Detail

```
POST /api/analyze
  ├── Anchor Pass          [Gemini 2.0 Flash — vision]
  │   └── Returns: { better: "A"|"B", gap: 1-10, reason: string }
  │
  ├── Stage 1: Visual Audit [Gemini 2.0 Flash — vision]
  │   ├── Scores each person independently (no comparison bias)
  │   ├── Enforces anchor direction if scores contradict anchor
  │   └── Returns: { A: { face_card, body, style, glow, expression, aura, observation }, B: {...} }
  │
  ├── Stage 2: Verdict      [DeepSeek → Groq → Cerebras]
  │   ├── Receives visual scores + mode
  │   ├── Calculates totals, margin, winner
  │   └── Returns: { winner, scores, margin, winning_edge, verdict, reasons_for_win }
  │
  └── Stage 3: Tips         [Llama 3.3 → Groq → Cerebras]
      ├── Targets the loser only
      └── Returns: { weaknesses_of_loser: [3 specific critiques with fixes] }
```

Results are persisted to Supabase with image URLs, scores, verdict text, and challenge metadata before returning to the client.

---

## Why Groq

Groq's LPU inference is the backbone of VRSUS's fallback layer for a specific reason: **the product is real-time and user-facing**. A verdict that takes 12 seconds feels broken. A verdict that takes 2 seconds feels alive.

Stages 2 and 3 are text-only — no vision required — which makes them ideal for Groq's `llama-3.3-70b-versatile`. The fallback triggers automatically when OpenRouter is slow or rate-limited, keeping p95 response times low without the user ever knowing a switch happened.

---

## Built By

**Thiran Thathsara A. Wijesingha**
AI-Native Product Engineer · IIT (University of Westminster, UK)

[github.com/skpthiran](https://github.com/skpthiran) · [linkedin.com/in/skpthiran](https://linkedin.com/in/skpthiran)

---

*Built entirely independently. Original concept, architecture, and implementation — no templates, no team.*
