import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Star, Zap, Calendar, User, Shield, ArrowRight, Ghost, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getHistory } from '../lib/history';
import { cn } from '../lib/utils';
import { DuelRecord } from '../types/history';

export function ProfilePage() {
  const navigate = useNavigate();
  const history = useMemo(() => getHistory(), []);
  
  const stats = useMemo(() => {
    const totalDuels = history.length;
    const wins = { 
      A: history.filter(r => r.winner === 'A').length, 
      B: history.filter(r => r.winner === 'B').length 
    };
    
    const avgScore = totalDuels === 0 
      ? 0 
      : Math.round(history.reduce((sum, r) => sum + Math.max(r.scores.A.total, r.scores.B.total), 0) / totalDuels);
    
    const bestDuel = history.reduce((best, r) => 
      !best || Math.max(r.scores.A.total, r.scores.B.total) > Math.max(best.scores.A.total, best.scores.B.total) 
        ? r 
        : best, null as DuelRecord | null);
    
    const modeCounts = history.reduce((acc, r) => { 
      acc[r.mode] = (acc[r.mode] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>);

    const favoriteMode = totalDuels === 0 
      ? 'None' 
      : Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0][0];

    const recentDuels = history.slice(0, 3);

    return {
      totalDuels,
      avgScore,
      bestDuel,
      favoriteMode,
      modeCounts,
      recentDuels
    };
  }, [history]);

  const handleRecentClick = (record: DuelRecord) => {
    const result = {
      winner: record.winner,
      margin: record.margin,
      scores: record.scores,
      reasons_for_win: record.reasons_for_win,
      weaknesses_of_loser: record.weaknesses_of_loser,
      summary: record.summary
    };
    
    const previews = {
      previewA: record.previewA,
      previewB: record.previewB
    };

    sessionStorage.setItem('vrsus_result', JSON.stringify(result));
    sessionStorage.setItem('vrsus_previews', JSON.stringify(previews));
    navigate('/duel/results');
  };

  return (
    <div className="flex-1 container mx-auto px-4 max-w-6xl py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* Left Column - Profile & Info */}
        <div className="space-y-8">
          <div className="bg-surface border border-border rounded-3xl p-8 flex flex-col items-center text-center">
            <div className={cn(
              "w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-blue-500 flex items-center justify-center mb-6 relative",
              stats.totalDuels > 0 && "ring-4 ring-winner ring-offset-4 ring-offset-background"
            )}>
              <span className="text-3xl font-display font-bold text-white">JD</span>
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-1">Jordan Davis</h1>
            <div className="flex items-center gap-1.5 text-accent text-sm font-bold uppercase tracking-wider mb-6">
              <Shield size={14} fill="currentColor" />
              Verified VRSUS Member
            </div>

            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl border border-neutral-800 hover:bg-neutral-800"
              onClick={() => alert('Coming soon')}
            >
              Edit Profile
            </Button>

            <div className="w-full h-[1px] bg-border my-8"></div>

            <div className="w-full space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Total Duels</span>
                <span className="font-bold text-foreground">{stats.totalDuels}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Avg Winner Score</span>
                <span className="font-bold text-foreground">{stats.avgScore}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Favorite Mode</span>
                <span className="font-bold text-foreground capitalize">{stats.favoriteMode}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Member Since</span>
                <span className="font-bold text-foreground">Apr 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & History */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Main Stat Cards */}
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold px-1 flex items-center gap-2">
               <span className="w-2 h-6 bg-accent rounded-full"></span>
               Your Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border rounded-3xl p-6 flex items-center gap-4">
                 <div className="p-3 bg-accent/20 rounded-2xl text-accent">
                    <Trophy size={24} />
                 </div>
                 <div>
                    <div className="text-2xl font-display font-bold leading-none">{stats.totalDuels}</div>
                    <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Duels</div>
                 </div>
              </div>
              <div className="bg-surface border border-border rounded-3xl p-6 flex items-center gap-4">
                 <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                    <Star size={24} />
                 </div>
                 <div>
                    <div className="text-2xl font-display font-bold leading-none">{stats.avgScore}</div>
                    <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Avg Score</div>
                 </div>
              </div>
              <div className="bg-surface border border-border rounded-3xl p-6 flex items-center gap-4">
                 <div className="p-3 bg-winner/20 rounded-2xl text-winner">
                    <Zap size={24} />
                 </div>
                 <div>
                    <div className="text-2xl font-display font-bold leading-none">
                      {stats.bestDuel ? Math.max(stats.bestDuel.scores.A.total, stats.bestDuel.scores.B.total) : 0}
                    </div>
                    <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Best Score</div>
                 </div>
              </div>
            </div>
          </div>

          {/* Recent Duels */}
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold px-1 flex items-center gap-2">
               <span className="w-2 h-6 bg-winner rounded-full"></span>
               Recent Duels
            </h2>
            {stats.recentDuels.length === 0 ? (
              <div className="bg-surface border border-border rounded-3xl p-12 text-center">
                 <p className="text-neutral-500 mb-6">No duels yet — Start your first duel</p>
                 <Link to="/duel">
                    <Button variant="secondary">Start Duel</Button>
                 </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentDuels.map((record) => {
                   const winScore = Math.max(record.scores.A.total, record.scores.B.total);
                   return (
                    <div 
                      key={record.id} 
                      onClick={() => handleRecentClick(record)}
                      className="bg-surface border border-border hover:bg-surface-hover rounded-2xl p-3 flex items-center gap-4 transition-all group cursor-pointer"
                    >
                      <div className="flex gap-1 h-16 w-32 shrink-0">
                        <img src={record.previewA} className="w-1/2 h-full object-cover rounded-lg border border-white/5" />
                        <img src={record.previewB} className="w-1/2 h-full object-cover rounded-lg border border-white/5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <span className={cn(
                             "text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1",
                             record.winner === 'A' ? "bg-blue-500/20 text-blue-400" : "bg-violet-500/20 text-violet-400"
                           )}>
                             {record.winner} Wins
                           </span>
                           <span className="text-[10px] text-neutral-500 font-bold">{new Date(record.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm font-bold flex items-center gap-3">
                          <span className="text-lg font-display text-winner">{winScore}</span>
                          <span className="text-neutral-600">|</span>
                          <span className="text-neutral-400 flex items-center gap-1"><Zap size={12} className="text-winner" fill="currentColor"/> +{record.margin} pts</span>
                        </div>
                      </div>
                      <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={20} className="text-neutral-600" />
                      </div>
                    </div>
                   );
                })}
              </div>
            )}
          </div>

          {/* Mode Breakdown */}
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold px-1 flex items-center gap-2">
               <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
               Mode Breakdown
            </h2>
            <div className="bg-surface border border-border rounded-3xl p-8">
              {stats.totalDuels === 0 ? (
                <p className="text-center text-neutral-500 text-sm italic">Run more duels to see your mode breakdown</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(stats.modeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([mode, count]) => {
                      const maxCount = Math.max(...Object.values(stats.modeCounts));
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={mode} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                            <span className="text-neutral-400">{mode}</span>
                            <span className="text-foreground">{count} Duels</span>
                          </div>
                          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-accent to-blue-500 rounded-full transition-all duration-1000"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
