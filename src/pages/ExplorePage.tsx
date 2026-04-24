import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Grid, Layers, Zap, Trophy, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { getPublicDuels } from '../lib/duels';
import { DuelCard } from '../components/DuelCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { getBatchVoteCounts, castVote } from '../lib/votes';
import { getLeaderboard } from '../lib/stats';
import { calculateRank } from '../lib/ranks';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'fashion', label: 'Fashion', icon: Layers },
  { id: 'food', label: 'Food', icon: Zap },
];

export function ExplorePage() {
  const navigate = useNavigate();
  const [duels, setDuels] = React.useState<any[]>([]);
  const [activeCategory, setActiveCategory] = React.useState('all');

  const [leaderboardFilter, setLeaderboardFilter] = React.useState<'global' | 'country'>('global');
  const [leaderboard, setLeaderboard] = React.useState<any[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [votes, setVotes] = React.useState<Record<string, { a: number; b: number; userPick: 'A' | 'B' | null }>>({});
  const PAGE_SIZE = 6;

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await getPublicDuels(page, PAGE_SIZE);
      console.log(`[VRSUS] ExplorePage: getPublicDuels returned ${next.length} results for page ${page}`);
      
      if (next.length < PAGE_SIZE) setHasMore(false);

      const mapped = next.map(d => ({
        ...d,
        mode: d.mode.charAt(0).toUpperCase() + d.mode.slice(1),
        isOwn: false,
      }));

      setDuels(prev => [...prev, ...mapped]);
      
      // Batch fetch vote counts
      const voteMap = await getBatchVoteCounts(next.map(d => d.id));
      setVotes(prev => ({ ...prev, ...voteMap }));
      
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('❌ Failed to load explore data:', err);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  }, [loadingMore, hasMore, page]);

  // Load when tab switches to Leaderboard
  React.useEffect(() => {
    if (activeCategory === 'leaderboard') {
      getLeaderboard(leaderboardFilter === 'country' ? 'Sri Lanka' : undefined)
        .then(setLeaderboard);
    }
  }, [activeCategory, leaderboardFilter]);


  React.useEffect(() => {
    loadMore();
  }, []);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  const handleCardClick = (duel: any) => {
    navigate(`/results/${duel.id}`);
  };

  return (
    <div className="pb-24 pt-4 px-4 bg-background min-h-screen max-w-2xl mx-auto">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-black mb-1">EXPLORE</h1>
        <p className="text-neutral-500 font-medium mb-5">See what the world is deciding.</p>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-accent transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search duels, people, styles..." 
            className="w-full bg-surface border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent transition-all font-medium placeholder:text-neutral-600"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (cat.id === 'leaderboard') {
                  setPage(0);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all font-bold text-sm",
                activeCategory === cat.id 
                  ? "bg-accent text-white shadow-[0_4px_12px_rgba(255,255,255,0.15)]" 
                  : "bg-surface border border-border text-neutral-400 hover:border-neutral-700"
              )}
            >
              <Icon size={16} />
              {cat.label}
            </button>

          );
        })}
      </div>

      {/* Main Feed / Leaderboard */}
      <div className="space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[4/3] rounded-[2rem] bg-surface border border-border animate-pulse flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-white/20 animate-spin" />
              </div>
            ))}
          </div>
        ) : activeCategory === 'leaderboard' ? (
          <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
              {['global', 'country'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setLeaderboardFilter(f as any)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    leaderboardFilter === f 
                      ? 'bg-accent text-white' 
                      : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                >
                  {f === 'global' ? '🌍 Global' : '🇱🇰 Sri Lanka'}
                </button>
              ))}
            </div>

            {/* Leaderboard rows */}
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">
                  <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No players on this leaderboard yet.</p>
                </div>
              ) : (
                leaderboard.map((entry) => {
                  const rankInfo = calculateRank(entry.total_duels, entry.winRate);
                  return (
                    <div key={entry.id} className="flex items-center gap-4 bg-surface border border-border rounded-2xl px-4 py-3 hover:border-white/20 transition-colors">
                      <span className="font-display font-black text-2xl text-white/30 w-10">#{entry.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{entry.display_name ?? 'Anonymous'}</p>
                        <p className="text-white/40 text-xs">{entry.country} · {entry.total_duels} duels</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-display font-black text-lg ${rankInfo.color}`}>
                          {rankInfo.emoji} {rankInfo.rank}
                        </p>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">{entry.winRate}% wins</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        ) : duels.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-[2rem] border border-dashed border-neutral-800">
            <Trophy className="mx-auto text-neutral-700 mb-4" size={48} />
            <p className="text-neutral-500 font-bold">No live duels yet.</p>
            <button 
              onClick={() => navigate('/duel')}
              className="mt-4 text-accent font-black hover:underline"
            >
              Be the first to battle →
            </button>
          </div>
        ) : (
          duels.map((duel) => (
            <div key={duel.id} className="relative">
              <DuelCard 
                duel={duel} 
                onCardClick={handleCardClick}
                showReactions={false}
                showVoting={true}
                voteCounts={votes[duel.id]}
                onVote={async (pick) => {
                  // Optimistic update
                  setVotes(prev => ({
                    ...prev,
                    [duel.id]: {
                      ...prev[duel.id],
                      userPick: pick,
                      a: pick === 'A' ? (prev[duel.id]?.a ?? 0) + 1 : (prev[duel.id]?.a ?? 0),
                      b: pick === 'B' ? (prev[duel.id]?.b ?? 0) + 1 : (prev[duel.id]?.b ?? 0),
                    }
                  }));
                  await castVote(duel.id, pick);
                }}
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black pointer-events-none text-white/50 tracking-tighter uppercase">
                {new Date(duel.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
                  ? 'Today' 
                  : new Date(duel.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
        <div ref={sentinelRef} className="h-4" />
      </div>

      {/* Daily Leaderboard Card (Social proof) */}
      {!loading && duels.length > 0 && (
        <div className="mt-8 p-6 bg-accent/5 border border-accent/10 rounded-[2rem] text-center mb-10 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-[50px] rounded-full" />
          <Info className="mx-auto text-accent mb-2" size={24} />
          <h3 className="font-display font-black text-white text-lg mb-1 tracking-tight">VOTER LEVEL: 12</h3>
          <p className="text-neutral-500 text-xs font-bold mb-4 tracking-wide uppercase">You're in the Top 15% of Deciders today</p>
          <div className="w-full bg-neutral-800/50 h-2 rounded-full overflow-hidden border border-white/5">
            <div className="bg-gradient-to-r from-accent to-accent-light h-full w-[85%] shadow-[0_0_10px_rgba(255,50,50,0.5)]" />
          </div>
        </div>
      )}
    </div>
  );
}
