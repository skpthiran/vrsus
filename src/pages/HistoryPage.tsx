import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Trash2, Calendar, Zap, ArrowRight, Ghost } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getHistory, deleteFromHistory, clearHistory } from '../lib/history';
import { DuelRecord } from '../types/history';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { getUserDuels, deleteDuel } from '../lib/duels';
import { supabase } from '../lib/supabase';

export function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<DuelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (user) {
        try {
          const duels = await getUserDuels(user.id);
          // map Supabase shape to DuelRecord shape
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
            verdict: d.verdict,
          })));
        } catch (error) {
          console.error("Failed to load DB history:", error);
          setHistory(getHistory());
        }
      } else {
        setHistory(getHistory());
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this duel?')) return;

    // Optimistically remove from UI
    setHistory(prev => prev.filter(r => r.id !== id));

    if (user) {
      try {
        await deleteDuel(id);
      } catch (err) {
        console.error('Failed to delete from DB:', err);
      }
    }
    
    // Also remove from local storage if it was there
    deleteFromHistory(id);
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all history?')) return;

    if (user) {
      try {
        const { error } = await supabase
          .from('duels')
          .delete()
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to clear DB history:', err);
      }
    }

    clearHistory();
    setHistory([]);
  };

  const handleViewResult = (record: DuelRecord) => {
    sessionStorage.setItem('vrsus_last_result', JSON.stringify({
      winner: record.winner,
      margin: record.margin,
      scores: record.scores,
      reasons_for_win: record.reasons_for_win,
      weaknesses_of_loser: record.weaknesses_of_loser,
      summary: record.summary,
      previewA: record.previewA,
      previewB: record.previewB,
      verdict: record.verdict,
    }));
    navigate('/duel/results');
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 container mx-auto px-4 max-w-6xl py-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Duel History</h1>
          <p className="text-neutral-400">Review your past battles and AI insights.</p>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-12 px-6 rounded-2xl">
            <Trash2 size={20} className="mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 border border-border">
            <Ghost size={48} className="text-neutral-600" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-3">No duels yet</h2>
          <p className="text-neutral-400 mb-8 max-w-xs mx-auto">Your photo battles will appear here once you've run your first analysis.</p>
          <Link to="/duel">
            <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-2xl shadow-xl shadow-accent/20">
              Start Your First Duel
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((record) => (
            <DuelCard 
              key={record.id} 
              record={record} 
              onDelete={handleDelete} 
              onClick={() => handleViewResult(record)} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DuelCard({ record, onDelete, onClick }: { record: DuelRecord, onDelete: (e: React.MouseEvent, id: string) => void, onClick: () => void }) {
  const winnerScore = record.scores[record.winner].total;
  const loserLetter = record.winner === 'A' ? 'B' : 'A';
  const loserScore = record.scores[loserLetter].total;
  
  const formattedDate = new Date(record.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div 
      onClick={onClick}
      className="group bg-surface hover:bg-surface-hover border border-border hover:border-neutral-700 rounded-3xl p-4 transition-all duration-300 cursor-pointer flex flex-col gap-4 relative"
    >
      <button 
        onClick={(e) => onDelete(e, record.id)}
        className="absolute top-6 right-6 p-2 bg-black/60 backdrop-blur-md rounded-full text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <Trash2 size={18} />
      </button>

      {/* Side by Side Preview */}
      <div className="grid grid-cols-2 gap-2 h-40">
        <div className="rounded-2xl overflow-hidden relative">
          <img src={record.previewA} alt="A" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">A</div>
          {record.winner === 'A' && (
            <div className="absolute bottom-2 right-2 p-1 bg-winner rounded-full shadow-lg">
              <Trophy size={10} className="text-black" />
            </div>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden relative">
          <img src={record.previewB} alt="B" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">B</div>
          {record.winner === 'B' && (
            <div className="absolute bottom-2 right-2 p-1 bg-winner rounded-full shadow-lg">
              <Trophy size={10} className="text-black" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">{record.mode}</span>
                <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <Calendar size={12} /> {formattedDate}
                </span>
             </div>
             <h3 className={cn(
               "font-display font-bold text-lg",
               record.winner === 'A' ? "text-blue-400" : "text-violet-400"
             )}>
               Photo {record.winner} is the winner
             </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-border/50">
           <div className="flex-1 flex flex-col items-center border-r border-border/50">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500">Winner</span>
             <span className="text-xl font-display font-bold text-winner">{winnerScore}</span>
           </div>
           <div className="flex-1 flex flex-col items-center">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500">Margin</span>
             <span className="text-xl font-display font-bold">+{record.margin}</span>
           </div>
           <div className="flex-1 flex flex-col items-center border-l border-border/50">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500">Loser</span>
             <span className="text-xl font-display font-bold text-neutral-400">{loserScore}</span>
           </div>
        </div>

        <p className="text-sm text-neutral-400 line-clamp-2 italic">
          "{record.verdict || record.summary}"
        </p>

        <div className="flex items-center justify-center pt-2 text-xs font-bold text-neutral-500 group-hover:text-foreground transition-colors uppercase tracking-widest gap-1">
          Open Full Results <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
}
