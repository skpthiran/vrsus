import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Trophy, MapPin, Grid, Layers, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPublicDuels } from '@/lib/duels';
import { DuelCard } from '@/components/DuelCard';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'fashion', label: 'Fashion', icon: Layers },
  { id: 'food', label: 'Food', icon: Zap },
];

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [dbDuels, setDbDuels] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        console.log('Fetching public duels...');
        const duels = await getPublicDuels();
        const leaderboardData: any[] = [];
        
        console.log('Explore duels loaded:', duels);

        setDbDuels(duels.map(d => ({
          id: d.id,
          mode: d.mode.charAt(0).toUpperCase() + d.mode.slice(1),
          winner: d.winner,
          aScore: d.score_a,
          bScore: d.score_b,
          imgA: d.image_a_url,
          imgB: d.image_b_url,
          reason: d.summary,
          isOwn: false,
          createdAt: d.created_at,
        })));
        
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('❌ Failed to load explore data:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCardClick = (duel: any) => {
    // If it's the user's own duel, they can click it for details
    // For now, no-op or navigate to result page if we had a shareable URL
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
              onClick={() => setActiveCategory(cat.id)}
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
          <div className="bg-surface border border-border rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-border bg-accent/5">
              <h2 className="text-xl font-display font-black">WEEKLY STARS</h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Top scores from the last 7 days</p>
            </div>
            
            <div className="divide-y divide-border">
              {leaderboard.length === 0 ? (
                <div className="p-10 text-center text-neutral-500">
                  No high scores this week yet.
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black italic",
                      index === 0 ? "bg-yellow-400 text-black" :
                      index === 1 ? "bg-neutral-300 text-black" :
                      index === 2 ? "bg-orange-400 text-black" : "text-neutral-500"
                    )}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">
                        {entry.profiles?.display_name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-neutral-500 font-medium">
                        {entry.mode} • {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-display font-black text-accent leading-none">
                        {entry.max_score}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-tighter">
                        SCORE
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : dbDuels.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-[2rem] border border-dashed border-neutral-800">
            <Trophy className="mx-auto text-neutral-700 mb-4" size={48} />
            <p className="text-neutral-500 font-bold">No live duels yet.</p>
            <button 
              onClick={() => navigate('/create')}
              className="mt-4 text-accent font-black hover:underline"
            >
              Be the first to battle →
            </button>
          </div>
        ) : (
          dbDuels.map((duel) => (
            <div key={duel.id} className="relative">
              <DuelCard 
                duel={duel} 
                onCardClick={handleCardClick}
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black pointer-events-none text-white/50 tracking-tighter uppercase">
                {new Date(duel.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
                  ? 'Today' 
                  : new Date(duel.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
        <div className="h-4" />
      </div>

      {/* Daily Leaderboard Card (Social proof) */}
      {!loading && dbDuels.length > 0 && (
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
