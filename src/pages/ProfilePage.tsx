import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Zap, Settings, Ghost, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDuels } from '../lib/duels';
import { supabase } from '../lib/supabase';
import { getHistory } from '../lib/history';
import { cn } from '../lib/utils';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { calculateRank } from '../lib/ranks';

function DuelRow({ record, onClick }: { record: any, onClick: () => void, key?: any }) {
  const imgRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      onClick={onClick}
      className="w-full bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-accent/30 transition-colors text-left"
    >
      {/* Thumbnails */}
      <div ref={imgRef} className="flex -space-x-3 flex-shrink-0">
        {[record.previewA, record.previewB].map((img, i) => (
          <div key={i} className={cn(
            "w-12 h-12 rounded-xl overflow-hidden border-2 border-background",
            i === 0 ? "bg-gradient-to-br from-neutral-800 to-neutral-900" : "bg-gradient-to-br from-neutral-900 to-neutral-800",
            i === 1 && "relative"
          )}>
            {visible && img ? (
              <img 
                src={img} 
                alt="" 
                className="w-full h-full object-cover" 
                loading="lazy" 
                decoding="async" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display font-black text-lg text-white/10 select-none">
                  {i === 0 ? 'A' : 'B'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-yellow-400">👑 Photo {record.winner} wins</span>
          <span className="text-xs text-neutral-500 capitalize">{record.mode}</span>
        </div>
        <p className="text-xs text-neutral-400 truncate">{record.summary || 'No summary'}</p>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <div className="text-lg font-display font-bold text-accent">
          {record.winner === 'A' ? record.scores?.A?.total : record.scores?.B?.total}
        </div>
        <div className="text-xs text-neutral-500">score</div>
      </div>

      <ArrowRight size={16} className="text-neutral-600 flex-shrink-0" />
    </button>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [duels, setDuels] = React.useState<any[]>([]);
  const [displayName, setDisplayName] = React.useState('');
  const [profile, setProfile] = React.useState<any>(null);
  const [streak, setStreak] = React.useState({ current: 0, best: 0 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const PAGE_SIZE = 6;

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    if (user?.id) {
      try {
        const results = await getUserDuels(user.id, page, PAGE_SIZE);
        if (results.length < PAGE_SIZE) setHasMore(false);

        const mapped = results.map(d => ({
          id: d.id,
          createdAt: d.created_at,
          mode: d.mode,
          winner: d.winner,
          margin: d.margin,
          summary: d.summary,
          previewA: d.preview_a,
          previewB: d.preview_b,
          scores: d.scores,
          reasons_for_win: d.reasons_for_win,
          weaknesses_of_loser: d.weaknesses_of_loser,
        }));

        setDuels(prev => [...prev, ...mapped]);
        setPage(prev => prev + 1);
      } catch {
        if (page === 0) setDuels(getHistory());
        setHasMore(false);
      }
    } else {
      if (page === 0) setDuels(getHistory());
      setHasMore(false);
    }
    setLoadingMore(false);
    setLoading(false);
  }, [loadingMore, hasMore, page, user]);

  React.useEffect(() => {
    async function loadProfile() {
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url, country, total_duels, total_wins, avg_score, best_score, current_streak')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
        console.log('profile state:', profileData);
        setDisplayName(profileData?.display_name || user.email?.split('@')[0] || 'User');

        setStreak({
          current: profileData?.current_streak || 0,
          best: profileData?.best_streak || 0,
        });
      }
    }
    loadProfile();
    
    // Reset and load duels when user changes
    setDuels([]);
    setPage(0);
    setHasMore(true);
  }, [user]);

  // Initial load
  React.useEffect(() => {
    loadMore();
  }, [user, loadMore]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  const stats = React.useMemo(() => {
    const total = duels.length;
    if (total === 0) return { total, avgScore: 0, bestScore: 0, favoriteMode: 'None' };

    const avgScore = Math.round(
      duels.reduce((sum, r) => sum + Math.max(r.scores?.A?.total ?? 0, r.scores?.B?.total ?? 0), 0) / total
    );

    const bestScore = Math.max(
      ...duels.map(r => Math.max(r.scores?.A?.total ?? 0, r.scores?.B?.total ?? 0))
    );

    const modeCounts = duels.reduce((acc, r) => {
      acc[r.mode] = (acc[r.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteMode = Object.entries(modeCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];

    return { total, avgScore, bestScore, favoriteMode };
  }, [duels]);

  const handleViewDuel = (record: any) => {
    sessionStorage.setItem('vrsus_last_result', JSON.stringify({
      id: record.id,
      winner: record.winner,
      margin: record.margin,
      scores: record.scores,
      reasons_for_win: record.reasons_for_win,
      weaknesses_of_loser: record.weaknesses_of_loser,
      summary: record.summary,
      previewA: record.previewA,
      previewB: record.previewB,
    }));
    navigate(`/results/${record.id}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Profile Header Skeleton */}
      {loading && (
        <div className="flex-1 container mx-auto px-4 max-w-4xl py-8 space-y-8 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-surface rounded" />
              <div className="h-4 w-48 bg-surface rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface border border-border rounded-2xl" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-surface border border-border rounded-[2rem]" />)}
          </div>
        </div>
      )}

      {!loading && !user && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-20">
          <Ghost size={48} className="text-neutral-600 mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">No Profile Yet</h2>
          <p className="text-neutral-400 mb-6 max-w-sm">Sign in to save your duels, track your stats, and build your profile.</p>
          <Link to="/auth">
            <button className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full font-semibold">
              <LogIn size={18} />
              Sign In
            </button>
          </Link>
        </div>
      )}

      {!loading && user && (
        <div className="flex-1 container mx-auto px-4 max-w-4xl py-8 space-y-8">
          {/* Profile Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-2xl font-black text-accent">
                  {displayName[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">{displayName}</h1>
                <p className="text-sm text-neutral-500">{user?.email}</p>
                {profile?.country && profile.country !== 'Unknown' && (
                  <p className="text-xs text-neutral-500 mt-0.5">📍 {profile.country}</p>
                )}
              </div>
            </div>
            
            <Link to="/settings">
              <button className="flex items-center gap-2 text-sm text-neutral-400 hover:text-foreground transition-colors bg-surface border border-border px-3 py-2 rounded-xl">
                <Settings size={15} />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </Link>
          </div>

          {/* Stats — ALWAYS render this if profile exists */}
          {profile && (
            <div className="mb-8 space-y-4">
              {/* Rank badge */}
              {(() => {
                const winRate = profile.total_duels > 0 ? Math.round((profile.total_wins / profile.total_duels) * 100) : 0;
                const rankInfo = calculateRank(profile.total_duels ?? 0, winRate);
                return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <span className="text-3xl">{rankInfo.emoji}</span>
                      <div className="flex-1">
                        <p className={`font-display font-black text-xl ${rankInfo.color}`}>{rankInfo.rank}</p>
                        {rankInfo.nextRank && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                              <div className="h-full bg-accent rounded-full" style={{ width: `${rankInfo.progress}%` }} />
                            </div>
                            <span className="text-white/30 text-xs">→ {rankInfo.nextRank}</span>
                          </div>
                        )}
                      </div>
                      {winRate > 0 && (
                        <div className="text-right">
                          <p className="text-white/40 text-xs">You're top</p>
                          <p className="text-accent font-bold">{Math.max(1, 100 - winRate)}%</p>
                        </div>
                      )}
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Win Rate', value: `${winRate}%`, emoji: '🏆' },
                        { label: 'Avg Score', value: profile.avg_score ?? 0, emoji: '📊' },
                        { label: 'Best Score', value: profile.best_score ?? 0, emoji: '⭐' },
                        { label: 'Streak', value: `${profile.current_streak ?? 0} 🔥`, emoji: '🔥' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                          <p className="text-2xl font-display font-black text-white">{stat.value}</p>
                          <p className="text-white/40 text-xs mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}







          {/* Recent Duels */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold">Recent Duels</h2>
              {duels.length > 3 && (
                <Link to="/history" className="flex items-center gap-1 text-sm text-neutral-400 hover:text-foreground transition-colors">
                  See all <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {duels.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <Ghost size={36} className="text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400 font-medium">No duels yet</p>
                <p className="text-neutral-500 text-sm mb-4">Run your first duel to see stats here</p>
                <Link to="/duel">
                  <button className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-semibold">
                    Start a Duel
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {duels.map(record => (
                  <DuelRow 
                    key={record.id} 
                    record={record} 
                    onClick={() => handleViewDuel(record)} 
                  />
                ))}
                <div ref={sentinelRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={signOut}
              className="text-sm text-neutral-500 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
