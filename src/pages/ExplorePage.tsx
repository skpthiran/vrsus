import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Calendar, Zap, ArrowRight, Ghost, TrendingUp, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getHistory } from '../lib/history';
import { DuelRecord } from '../types/history';
import { cn } from '../lib/utils';

const SEED_DUELS = [
  {
    id: 'seed-1',
    createdAt: '2026-04-20T10:00:00Z',
    mode: 'dating',
    winner: 'B',
    margin: 12,
    summary: 'Photo B wins with stronger eye contact and warmer expression.',
    previewA: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
    previewB: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400',
    scores: { A: { total: 74 }, B: { total: 86 } },
    reasons_for_win: ['Stronger eye contact', 'Warmer expression', 'Better lighting'],
    isOwn: false,
  },
  {
    id: 'seed-2',
    createdAt: '2026-04-21T14:30:00Z',
    mode: 'linkedin',
    winner: 'A',
    margin: 8,
    summary: 'Photo A projects more authority with better posture and attire.',
    previewA: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400',
    previewB: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400',
    scores: { A: { total: 88 }, B: { total: 80 } },
    reasons_for_win: ['Better posture', 'Professional attire', 'Stronger presence'],
    isOwn: false,
  },
  {
    id: 'seed-3',
    createdAt: '2026-04-22T09:15:00Z',
    mode: 'gym',
    winner: 'B',
    margin: 5,
    summary: 'Photo B shows better muscle definition and lighting.',
    previewA: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400',
    previewB: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=400',
    scores: { A: { total: 81 }, B: { total: 86 } },
    reasons_for_win: ['Better muscle definition', 'Superior lighting', 'More dynamic pose'],
    isOwn: false,
  },
  {
    id: 'seed-4',
    createdAt: '2026-04-23T08:00:00Z',
    mode: 'general',
    winner: 'A',
    margin: 15,
    summary: 'Photo A dominates with exceptional natural lighting and authentic smile.',
    previewA: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400',
    previewB: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400',
    scores: { A: { total: 92 }, B: { total: 77 } },
    reasons_for_win: ['Exceptional natural lighting', 'Authentic smile', 'Great composition'],
    isOwn: false,
  },
];

type ExtendedDuelRecord = DuelRecord & { isOwn: boolean };

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All' | 'Mine' | 'Trending'>('All');

  const allDuels = useMemo(() => {
    const history = getHistory().map(d => ({ ...d, isOwn: true }));
    const combined = [...history, ...SEED_DUELS];
    
    // Deduplicate by ID
    const unique = combined.reduce((acc: any[], current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    return unique;
  }, []);

  const filteredDuels = useMemo(() => {
    let result = [...allDuels];

    if (activeTab === 'Mine') {
      result = result.filter(d => d.isOwn);
    } else if (activeTab === 'Trending') {
      result = result.sort((a, b) => b.margin - a.margin);
    } else {
      // All - default sort by date
      result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [activeTab, allDuels]);

  const handleViewResult = (record: ExtendedDuelRecord) => {
    if (!record.isOwn) return;

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Explore Duels</h1>
          <p className="text-neutral-400">See how others compare. Learn what makes a winning photo.</p>
        </div>
        <Link to="/duel">
          <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-2xl shadow-xl shadow-accent/20">
            Start a Duel
            <Zap className="ml-2 w-5 h-5 fill-current" />
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { id: 'All', icon: <Zap size={16} />, label: 'All' },
          { id: 'Trending', icon: <TrendingUp size={16} />, label: 'Trending' },
          { id: 'Mine', icon: <User size={16} />, label: 'My Duels' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all duration-300",
              activeTab === tab.id 
                ? "bg-foreground text-background shadow-lg scale-105" 
                : "bg-surface border border-border text-neutral-400 hover:text-foreground hover:border-neutral-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {filteredDuels.length === 0 && activeTab === 'Mine' ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 border border-border">
            <Ghost size={48} className="text-neutral-600" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-3">You haven't shared any duels yet.</h2>
          <p className="text-neutral-400 mb-8 max-w-xs mx-auto">Your photo battles will appear here once you've run your first analysis.</p>
          <Link to="/duel">
            <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-2xl shadow-xl shadow-accent/20">
              Run your first duel
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDuels.map((duel) => (
            <ExploreCard 
              key={duel.id} 
              duel={duel} 
              onClick={() => handleViewResult(duel)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExploreCard({ duel, onClick }: { duel: ExtendedDuelRecord, onClick: () => void }) {
  const winnerScore = duel.scores[duel.winner].total;
  const loserLetter = duel.winner === 'A' ? 'B' : 'A';
  const loserScore = duel.scores[loserLetter].total;
  
  const formattedDate = new Date(duel.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div 
      onClick={duel.isOwn ? onClick : undefined}
      className={cn(
        "group bg-surface border border-border rounded-3xl p-4 transition-all duration-300 flex flex-col gap-4 relative",
        duel.isOwn ? "hover:bg-surface-hover hover:border-neutral-700 cursor-pointer" : "cursor-default"
      )}
    >
      {/* Badges */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
          {duel.mode}
        </div>
        {duel.isOwn && (
          <div className="px-2 py-1 bg-accent/90 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-xl flex items-center gap-1">
            <User size={10} strokeWidth={3} /> YOUR DUEL
          </div>
        )}
      </div>

      {/* Side by Side Preview */}
      <div className="grid grid-cols-2 gap-2 h-44">
        <div className={cn(
          "rounded-2xl overflow-hidden relative transition-all duration-300",
          duel.winner === 'A' ? "ring-2 ring-winner ring-offset-4 ring-offset-surface scale-[0.98]" : "opacity-80 scale-95 grayscale-[20%]"
        )}>
          <img src={duel.previewA} alt="A" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">A</div>
        </div>
        <div className={cn(
          "rounded-2xl overflow-hidden relative transition-all duration-300",
          duel.winner === 'B' ? "ring-2 ring-winner ring-offset-4 ring-offset-surface scale-[0.98]" : "opacity-80 scale-95 grayscale-[20%]"
        )}>
          <img src={duel.previewB} alt="B" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">B</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-1">
                  <Calendar size={12} /> {formattedDate}
                </span>
             </div>
             <h3 className="font-display font-bold text-lg leading-tight">
               {duel.winner === 'A' ? 'Photo A' : 'Photo B'} takes the crown
             </h3>
          </div>
          {duel.winner && (
            <div className="p-2 bg-winner/20 rounded-xl">
              <Trophy size={16} className="text-winner" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-border/50">
            <div className="flex-1 flex flex-col items-center border-r border-border/50">
              <span className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Winner</span>
              <span className="text-xl font-display font-bold text-winner">{winnerScore}</span>
            </div>
            <div className="flex-1 flex flex-col items-center border-l border-border/50">
              <span className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Loser</span>
              <span className="text-xl font-display font-bold text-neutral-400">{loserScore}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-winner animate-pulse">
            <Zap size={12} className="fill-current" />
            🔥 {duel.margin} POINT EDGE
          </div>
        </div>

        <p className="text-sm text-neutral-400 line-clamp-2 italic leading-relaxed">
          "{duel.summary}"
        </p>

        {duel.isOwn && (
          <div className="flex items-center justify-center pt-2 text-xs font-bold text-accent group-hover:text-foreground transition-colors uppercase tracking-widest gap-1">
            Open results <ArrowRight size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
