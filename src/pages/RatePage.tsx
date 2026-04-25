import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRatingPool, submitRating, getPhotoAvgRating, RatePhoto } from '../lib/ratings';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const scoreLabel = (s: number) => {
  if (s <= 2) return { label: 'Rough', color: 'text-red-500' };
  if (s <= 4) return { label: 'Below avg', color: 'text-orange-400' };
  if (s === 5) return { label: 'Average', color: 'text-yellow-400' };
  if (s <= 7) return { label: 'Decent', color: 'text-lime-400' };
  if (s <= 9) return { label: 'Hot', color: 'text-green-400' };
  return { label: 'Elite', color: 'text-emerald-400' };
};

export default function RatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pool, setPool] = useState<RatePhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [rated, setRated] = useState(0);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'rate' | 'skip'>('rate');
  const [reveal, setReveal] = useState<{ avg: number; total: number; yourScore: number } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionScores, setSessionScores] = useState<number[]>([]);

  const preloadImage = (url: string) => {
    const img = new Image();
    img.src = url;
  };

  useEffect(() => {
    getRatingPool(10).then(async initial => {
      if (initial.length === 0) { setDone(true); setLoading(false); return; }
      setPool(initial);
      setLoading(false);
      // Preload first photo immediately
      if (initial[0]?.photoUrl) preloadImage(initial[0].photoUrl);

      // Fetch full pool in background
      const full = await getRatingPool(50);
      setPool(full);
    });
  }, []);

  // Preload next 2 photos whenever index changes
  useEffect(() => {
    if (pool[index + 1]?.photoUrl) preloadImage(pool[index + 1].photoUrl);
    if (pool[index + 2]?.photoUrl) preloadImage(pool[index + 2].photoUrl);
  }, [index, pool]);

  const current = pool[index];

  const handleScore = async (score: number) => {
    if (!current || submitting || animating) return;
    setSubmitting(true);

    // Submit rating
    await submitRating(current.duelId, current.photoUrl, score, user?.id || null);
    const newRated = rated + 1;
    setRated(newRated);
    const newScores = [...sessionScores, score];
    setSessionScores(newScores);

    // Fetch community average (includes the vote just submitted)
    const community = await getPhotoAvgRating(current.photoUrl);
    setReveal({
      avg: community?.avg ?? score,
      total: community?.total ?? 1,
      yourScore: score,
    });

    // Auto-advance after 1.8 seconds
    setTimeout(() => {
      setReveal(null);

      // Every 10 ratings — show summary
      if (newRated % 10 === 0) {
        setShowSummary(true);
        setSubmitting(false);
        return;
      }

      setAnimating(true);
      setTimeout(() => {
        if (index + 1 >= pool.length) {
          setDone(true);
        } else {
          setIndex(i => i + 1);
        }
        setAnimating(false);
        setSubmitting(false);
      }, 300);
    }, 1800);
  };

  const handleContinue = () => {
    setShowSummary(false);
    setAnimating(true);
    setTimeout(() => {
      if (index + 1 >= pool.length) {
        setDone(true);
      } else {
        setIndex(i => i + 1);
      }
      setAnimating(false);
    }, 300);
  };

  const getSummaryStats = () => {
    if (sessionScores.length === 0) return null;
    const avg = Math.round((sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length) * 10) / 10;
    const highest = Math.max(...sessionScores);
    const lowest = Math.min(...sessionScores);
    const aboveAvg = sessionScores.filter(s => s >= 7).length;
    let tasteType = '';
    let tasteEmoji = '';
    if (avg >= 7.5) { tasteType = 'Easy Rater'; tasteEmoji = '😍'; }
    else if (avg >= 6) { tasteType = 'Generous Judge'; tasteEmoji = '😊'; }
    else if (avg >= 4.5) { tasteType = 'Balanced Critic'; tasteEmoji = '⚖️'; }
    else if (avg >= 3) { tasteType = 'Tough Judge'; tasteEmoji = '😤'; }
    else { tasteType = 'Savage'; tasteEmoji = '💀'; }
    return { avg, highest, lowest, aboveAvg, tasteType, tasteEmoji };
  };

  const handleSkip = () => {
    if (animating) return;
    setDirection('skip');
    setAnimating(true);
    setTimeout(() => {
      if (index + 1 >= pool.length) {
        setDone(true);
      } else {
        setIndex(i => i + 1);
      }
      setAnimating(false);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showSummary) {
    const stats = getSummaryStats();
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
        {/* Title */}
        <div className="mb-8">
          <div className="text-5xl mb-3">{stats?.tasteEmoji}</div>
          <h2 className="font-display font-black text-3xl text-white">
            {rated} Ratings Done
          </h2>
          <p className="text-neutral-500 text-sm mt-1">Here's your taste profile so far</p>
        </div>

        {/* Taste type badge */}
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-6 py-3 mb-8">
          <p className="text-accent font-black text-xl">{stats?.tasteType}</p>
          <p className="text-neutral-500 text-xs mt-0.5">Your rating personality</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="font-black text-2xl text-white">{stats?.avg}</div>
            <div className="text-neutral-500 text-xs mt-0.5">Avg you give</div>
          </div>
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="font-black text-2xl text-lime-400">{stats?.highest}</div>
            <div className="text-neutral-500 text-xs mt-0.5">Highest</div>
          </div>
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="font-black text-2xl text-red-400">{stats?.lowest}</div>
            <div className="text-neutral-500 text-xs mt-0.5">Lowest</div>
          </div>
        </div>

        {/* Hot picks stat */}
        <p className="text-neutral-400 text-sm mb-10">
          You rated <span className="text-white font-bold">{stats?.aboveAvg}</span> out of {rated} people a 7 or above
        </p>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full max-w-sm bg-accent text-white font-black py-4 rounded-2xl text-lg hover:opacity-90 transition-opacity mb-3"
        >
          Keep Rating 🔥
        </button>
        <button
          onClick={() => navigate('/explore')}
          className="text-neutral-500 font-bold text-sm hover:text-white transition-colors"
        >
          Browse Explore
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🔥</div>
        <h2 className="font-display font-black text-3xl text-white mb-3">
          You've seen everything
        </h2>
        <p className="text-neutral-500 mb-2">
          You rated <span className="text-white font-bold">{rated}</span> photos
        </p>
        <p className="text-neutral-600 text-sm mb-8">
          Come back when more duels are posted
        </p>
        <button
          onClick={() => navigate('/duel')}
          className="bg-accent text-white font-black px-8 py-3.5 rounded-2xl hover:opacity-90 transition-opacity"
        >
          Run a Duel Instead
        </button>
        <button
          onClick={() => navigate('/explore')}
          className="mt-3 text-neutral-500 font-bold text-sm hover:text-white transition-colors"
        >
          Browse Explore
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-4">
        <div>
          <h1 className="font-display font-black text-2xl text-white">HOT OR NOT</h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            {rated} rated · {pool.length - index} left
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:border-white/30 transition-colors"
        >
          <X size={16} className="text-neutral-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 rounded-full"
            style={{ width: `${(index / pool.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Photo Card */}
      <div className="flex-1 px-4 pb-4">
        <div
          className={`relative w-full rounded-[2rem] overflow-hidden border border-border bg-surface transition-all duration-300 ${
            animating
              ? direction === 'rate'
                ? 'opacity-0 scale-95 translate-x-4'
                : 'opacity-0 scale-95 -translate-x-4'
              : 'opacity-100 scale-100 translate-x-0'
          }`}
          style={{ aspectRatio: '3/4' }}
        >
          {current?.photoUrl ? (
            <img
              src={current.photoUrl}
              className="w-full h-full object-cover object-top"
              alt="Rate this"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/10 font-black text-6xl">?</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {reveal && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
              <div className="text-center px-8">
                {/* Community score */}
                <div className="mb-6">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Community</div>
                  <div className="font-display font-black text-7xl text-white">{reveal.avg}</div>
                  <div className="text-white/40 text-sm mt-1">{reveal.total} {reveal.total === 1 ? 'rating' : 'ratings'}</div>
                </div>

                {/* Divider */}
                <div className="w-16 h-px bg-white/20 mx-auto mb-6" />

                {/* Your score vs community */}
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className={`font-black text-3xl ${scoreLabel(reveal.yourScore).color}`}>{reveal.yourScore}</div>
                    <div className="text-white/30 text-xs mt-0.5">You</div>
                  </div>
                  <div className="text-white/20 font-bold text-xl">vs</div>
                  <div className="text-center">
                    <div className="font-black text-3xl text-white">{reveal.avg}</div>
                    <div className="text-white/30 text-xs mt-0.5">Crowd</div>
                  </div>
                </div>

                {/* Taste comparison line */}
                <div className="mt-6">
                  {reveal.yourScore > reveal.avg + 1 && (
                    <p className="text-lime-400 text-sm font-bold">You rate warmer than the crowd 🔥</p>
                  )}
                  {reveal.yourScore < reveal.avg - 1 && (
                    <p className="text-blue-400 text-sm font-bold">You're a harsher judge than most ❄️</p>
                  )}
                  {Math.abs(reveal.yourScore - reveal.avg) <= 1 && (
                    <p className="text-white/50 text-sm font-bold">Your taste is on point with the crowd ✓</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Score preview on hover */}
          {hoveredScore && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-4 text-center">
                <div className="font-black text-6xl text-white">{hoveredScore}</div>
                <div className={`font-bold text-lg mt-1 ${scoreLabel(hoveredScore).color}`}>
                  {scoreLabel(hoveredScore).label}
                </div>
              </div>
            </div>
          )}

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white/60 text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 transition-colors"
          >
            Skip
          </button>

          {/* Flame badge */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <Flame size={12} className="text-accent" />
            <span className="text-white/60 text-xs font-bold">Rate 1–10</span>
          </div>
        </div>
      </div>

      {/* Score Buttons */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-5 gap-2 mb-2">
          {SCORES.slice(0, 5).map(score => (
            <button
              key={score}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              onClick={() => handleScore(score)}
              disabled={submitting}
              className={`py-3.5 rounded-2xl font-black text-lg transition-all border ${
                score <= 2
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40'
                  : score <= 4
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
              } active:scale-95 disabled:opacity-50`}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SCORES.slice(5).map(score => (
            <button
              key={score}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              onClick={() => handleScore(score)}
              disabled={submitting}
              className={`py-3.5 rounded-2xl font-black text-lg transition-all border ${
                score <= 7
                  ? 'bg-lime-500/10 border-lime-500/20 text-lime-400 hover:bg-lime-500/20'
                  : score <= 9
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
              } active:scale-95 disabled:opacity-50`}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-neutral-600 text-xs">Rough</span>
          <span className="text-neutral-600 text-xs">Elite</span>
        </div>
      </div>
    </div>
  );
}
