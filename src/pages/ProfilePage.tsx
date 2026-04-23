import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Zap, Calendar, Settings, Ghost, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDuels } from '../lib/duels';
import { supabase } from '../lib/supabase';
import { getHistory } from '../lib/history';
import { cn } from '../lib/utils';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, current_streak, best_streak')
          .eq('id', user.id)
          .single();
        setDisplayName(profile?.display_name || user.email?.split('@')[0] || 'User');
        setStreak({
          current: profile?.current_streak || 0,
          best: profile?.best_streak || 0,
        });

        // Load duels
        try {
          const duels = await getUserDuels(user.id);
          setHistory(duels.map(d => ({
            id: d.id,
            createdAt: d.created_at,
            mode: d.mode,
            winner: d.winner,
            margin: d.margin,
            summary: d.summary,
            previewA: d.image_a_url,
            previewB: d.image_b_url,
            scores: d.scores,
            reasons_for_win: d.reasons_for_win,
            weaknesses_of_loser: d.weaknesses_of_loser,
          })));
        } catch {
          setHistory(getHistory());
        }
      } else {
        setHistory(getHistory());
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) return { total, avgScore: 0, bestScore: 0, favoriteMode: 'None', streak: 0 };

    const avgScore = Math.round(
      history.reduce((sum, r) => sum + Math.max(r.scores?.A?.total ?? 0, r.scores?.B?.total ?? 0), 0) / total
    );

    const bestScore = Math.max(
      ...history.map(r => Math.max(r.scores?.A?.total ?? 0, r.scores?.B?.total ?? 0))
    );

    const modeCounts = history.reduce((acc, r) => {
      acc[r.mode] = (acc[r.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0][0];

    return { total, avgScore, bestScore, favoriteMode };
  }, [history]);

  const handleViewDuel = (record: any) => {
    sessionStorage.setItem('vrsus_result', JSON.stringify({
      winner: record.winner,
      margin: record.margin,
      scores: record.scores,
      reasons_for_win: record.reasons_for_win,
      weaknesses_of_loser: record.weaknesses_of_loser,
      summary: record.summary,
    }));
    sessionStorage.setItem('vrsus_previews', JSON.stringify({
      previewA: record.previewA,
      previewB: record.previewB,
    }));
    navigate('/duel/results');
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
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
            <Link to="/settings">
              <button className="flex items-center gap-2 text-sm text-neutral-400 hover:text-foreground transition-colors bg-surface border border-border px-3 py-2 rounded-xl">
                <Settings size={15} />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
            </Link>
          </div>

          {/* Streak Banner */}
          {streak.current > 0 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl px-5 py-4">
              <span className="text-3xl">🔥</span>
              <div>
                <div className="font-bold text-orange-400 text-lg">
                  {streak.current} duel streak!
                </div>
                <div className="text-xs text-neutral-400">
                  Keep uploading high-quality photos to extend it. Best ever: {streak.best}
                </div>
              </div>
            </div>
          )}

          {streak.current === 0 && streak.best > 0 && (
            <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-5 py-4">
              <span className="text-2xl">💀</span>
              <div>
                <div className="font-semibold text-neutral-300">Streak broken</div>
                <div className="text-xs text-neutral-500">Your best streak was {streak.best}. Upload a high-scoring photo to start again.</div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Duels', value: stats.total, icon: <Zap size={18} />, color: 'text-accent' },
              { label: 'Avg Score', value: stats.avgScore || '—', icon: <Star size={18} />, color: 'text-yellow-400' },
              { label: 'Best Score', value: stats.bestScore || '—', icon: <Trophy size={18} />, color: 'text-green-400' },
              { label: 'Best Streak', value: streak.best > 0 ? `${streak.best} 🔥` : '—', icon: <Zap size={18} />, color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-4">
                <div className={cn('mb-2', stat.color)}>{stat.icon}</div>
                <div className="text-xl font-display font-bold capitalize">{stat.value}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Recent Duels */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold">Recent Duels</h2>
              {history.length > 3 && (
                <Link to="/history" className="flex items-center gap-1 text-sm text-neutral-400 hover:text-foreground transition-colors">
                  See all <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {history.length === 0 ? (
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
                {history.slice(0, 5).map(record => (
                  <button
                    key={record.id}
                    onClick={() => handleViewDuel(record)}
                    className="w-full bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-accent/30 transition-colors text-left"
                  >
                    {/* Thumbnails */}
                    <div className="flex -space-x-3 flex-shrink-0">
                      {[record.previewA, record.previewB].map((img, i) => (
                        <div key={i} className={cn(
                          "w-12 h-12 rounded-xl overflow-hidden border-2 border-background bg-neutral-900",
                          i === 1 && "relative"
                        )}>
                          {img ? (
                            <img 
                              src={img} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              loading="lazy" 
                              decoding="async" 
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-800" />
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
                ))}
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
