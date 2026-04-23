import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, TrendingUp, Flame, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { getHistory } from '../lib/history';

const SEED_DUELS = [
  { id: 'seed-1', mode: 'Dating Profile', winner: 'B', aScore: 72, bScore: 94, likes: '1.2k', comments: 124, imgA: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop', reason: "Stronger background depth and more inviting expression." },
  { id: 'seed-2', mode: 'LinkedIn', winner: 'A', aScore: 96, bScore: 82, likes: '840', comments: 56, imgA: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&fit=crop', reason: "Professional lighting and excellent framing." },
  { id: 'seed-3', mode: 'Gym Progress', winner: 'B', aScore: 88, bScore: 91, likes: '2.5k', comments: 342, imgA: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&fit=crop', reason: "Better contrast and more dynamic posture." },
];

export function ExplorePage() {
  const [activeTab, setActiveTab] = useState('Trending');
  const [reactions, setReactions] = useState<Record<string, { agree: number; disagree: number; fire: number; userReaction: string | null }>>({});

  // Merge history duels + seed duels
  const historyDuels = getHistory().map(r => ({
    id: r.id,
    mode: r.mode.charAt(0).toUpperCase() + r.mode.slice(1),
    winner: r.winner,
    aScore: r.scores.A.total,
    bScore: r.scores.B.total,
    likes: String(Math.floor(Math.random() * 500) + 10),
    comments: Math.floor(Math.random() * 50) + 1,
    imgA: r.previewA,
    imgB: r.previewB,
    reason: r.summary,
    isOwn: true,
    record: r,
  }));

  const allDuels = [
    ...historyDuels,
    ...SEED_DUELS.map(s => ({ ...s, isOwn: false, record: null })),
  ];

  const tabs = ['Trending', 'Dating', 'LinkedIn', 'Gym', 'Fashion'];

  const filtered = activeTab === 'Trending'
    ? allDuels
    : allDuels.filter(d => d.mode.toLowerCase().includes(activeTab.toLowerCase()));

  const getReaction = (id: string) => reactions[id] || { agree: 12, disagree: 3, fire: 28, userReaction: null };

  const handleReaction = (id: string, type: 'agree' | 'disagree' | 'fire') => {
    setReactions(prev => {
      const current = getReaction(id);
      const alreadyReacted = current.userReaction === type;
      return {
        ...prev,
        [id]: {
          ...current,
          [type]: alreadyReacted ? current[type] - 1 : current[type] + 1,
          userReaction: alreadyReacted ? null : type,
        }
      };
    });
  };

  const handleCardClick = (duel: any) => {
    if (!duel.isOwn || !duel.record) return;
    sessionStorage.setItem('vrsus_result', JSON.stringify(duel.record));
    sessionStorage.setItem('vrsus_previews', JSON.stringify({ previewA: duel.record.previewA, previewB: duel.record.previewB }));
    window.location.href = '/duel/results';
  };

  return (
    <div className="flex-1 container mx-auto px-4 max-w-7xl py-12 flex flex-col md:flex-row gap-8">

      <div className="flex-1 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Explore</h1>
          <p className="text-neutral-400">See what's trending across VRSUS right now.</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all",
                activeTab === tab ? "bg-foreground text-background" : "bg-surface text-neutral-400 border border-border hover:text-foreground"
              )}
            >
              {tab === 'Trending' && <TrendingUp size={16} />}
              {tab}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-neutral-500">
            <p className="mb-4">No duels in this category yet.</p>
            <Link to="/duel"><Button>Start a Duel</Button></Link>
          </div>
        ) : (
          <div className="space-y-12">
            {filtered.map(duel => {
              const r = getReaction(duel.id);
              return (
                <div key={duel.id} className="bg-surface border border-border rounded-[2rem] overflow-hidden group">
                  {/* Photo grid */}
                  <div
                    className={cn("grid grid-cols-2 aspect-[4/3] md:aspect-[16/9] relative", duel.isOwn && "cursor-pointer")}
                    onClick={() => handleCardClick(duel)}
                  >
                    <img src={duel.imgA} alt="A" className={cn("w-full h-full object-cover", duel.winner === 'B' ? "opacity-60 grayscale-[30%]" : "")} />
                    <img src={duel.imgB} alt="B" className={cn("w-full h-full object-cover", duel.winner === 'A' ? "opacity-60 grayscale-[30%]" : "")} />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white shadow-lg">{duel.mode}</span>
                            {duel.isOwn && <span className="text-xs font-bold px-2 py-1 bg-accent/80 backdrop-blur-md rounded-md text-white">YOUR DUEL</span>}
                          </div>
                          <p className="text-white font-medium max-w-md hidden md:block">"{duel.reason}"</p>
                        </div>
                        {duel.isOwn && (
                          <Button className="bg-white/20 hover:bg-white backdrop-blur-md text-white hover:text-black border border-white/20 transition-all font-semibold rounded-full px-6 py-2">
                            View Duel
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md border border-white/20 rounded-full flex justify-center items-center">
                      <span className="font-display font-bold text-white text-sm">VS</span>
                    </div>
                  </div>

                  {/* Reactions footer */}
                  <div className="p-4 flex items-center justify-between border-t border-border">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleReaction(duel.id, 'agree')}
                        className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-full", r.userReaction === 'agree' ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white")}
                      >
                        <ThumbsUp size={16} /> {r.agree} Agree
                      </button>
                      <button
                        onClick={() => handleReaction(duel.id, 'disagree')}
                        className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-full", r.userReaction === 'disagree' ? "bg-red-500/20 text-red-400" : "text-neutral-400 hover:text-white")}
                      >
                        <ThumbsDown size={16} /> {r.disagree} Disagree
                      </button>
                      <button
                        onClick={() => handleReaction(duel.id, 'fire')}
                        className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-full", r.userReaction === 'fire' ? "bg-orange-500/20 text-orange-400" : "text-neutral-400 hover:text-white")}
                      >
                        <Flame size={16} /> {r.fire}
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                        <MessageCircle size={18} />
                        <span className="text-sm font-medium">{duel.comments}</span>
                      </button>
                      <button className="text-neutral-400 hover:text-white transition-colors">
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block w-80 space-y-8 pl-8 border-l border-border/50">
        <div>
          <h3 className="font-display font-bold mb-4">Trending Categories</h3>
          <div className="space-y-3">
            {[
              { name: 'First Date Impact', count: '12k' },
              { name: 'Corporate Headshot', count: '8.4k' },
              { name: 'Mirror Selfies', count: '6.2k' },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer">
                <span className="font-medium text-sm text-neutral-300">{c.name}</span>
                <span className="text-xs text-neutral-500">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-b from-accent/20 to-transparent border border-accent/20 text-center">
          <h3 className="font-display font-bold mb-2">Want to be featured?</h3>
          <p className="text-sm text-neutral-400 mb-4">Make your next duel public to appear on the explore page.</p>
          <Link to="/duel"><Button className="w-full">Create Public Duel</Button></Link>
        </div>
      </div>

    </div>
  );
}
