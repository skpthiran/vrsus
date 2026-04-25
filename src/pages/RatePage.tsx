import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRatingPool, submitRating, RatePhoto } from '../lib/ratings';

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

  useEffect(() => {
    getRatingPool(50).then(data => {
      setPool(data);
      setLoading(false);
      if (data.length === 0) setDone(true);
    });
  }, []);

  const current = pool[index];

  const handleScore = async (score: number) => {
    if (!current || submitting || animating) return;
    setSubmitting(true);
    setDirection('rate');
    setAnimating(true);

    await submitRating(current.duelId, current.photoUrl, score, user?.id || null);
    setRated(r => r + 1);

    setTimeout(() => {
      if (index + 1 >= pool.length) {
        setDone(true);
      } else {
        setIndex(i => i + 1);
      }
      setAnimating(false);
      setSubmitting(false);
    }, 300);
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
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/10 font-black text-6xl">?</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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
