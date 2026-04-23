import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Trophy, MapPin, Grid, Layers, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPublicDuels } from '@/lib/duels';
import { DuelCard } from '@/components/DuelCard';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'fashion', label: 'Fashion', icon: Layers },
  { id: 'food', label: 'Food', icon: Zap },
  { id: 'tech', label: 'Gadgets', icon: Search },
];

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [dbDuels, setDbDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPublicDuels().then(duels => {
      console.log('📡 Public duels from Supabase:', duels.length, duels);
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
      })));
      setLoading(false);
    }).catch(err => {
      console.error('❌ Failed to load public duels:', err);
      setLoading(false);
    });
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

      {/* Main Feed */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-4">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="font-bold animate-pulse">Scanning the multiverse...</p>
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
            <DuelCard 
              key={duel.id} 
              duel={duel} 
              onCardClick={handleCardClick}
            />
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
