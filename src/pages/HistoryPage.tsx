import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Trash2, Calendar, Zap, ArrowRight, Ghost } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getHistory, deleteFromHistory, clearHistory } from '../lib/history';
import { DuelRecord } from '../types/history';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { getUserDuels, deleteDuel, toggleDuelPrivacy } from '../lib/duels';
import { supabase } from '../lib/supabase';
import { Globe, Lock, Share2 } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [duels, setDuels] = useState<DuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 10;

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    
    if (user) {
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
          previewA: d.image_a_url,
          previewB: d.image_b_url,
          scores: d.scores,
          reasons_for_win: d.reasons_for_win,
          weaknesses_of_loser: d.weaknesses_of_loser,
          verdict: d.verdict,
          isPublic: d.is_public,
        }));

        setDuels(prev => [...prev, ...mapped]);
        setPage(prev => prev + 1);
      } catch (error) {
        console.error("Failed to load DB history:", error);
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

  useEffect(() => {
    // Reset and reload when user changes
    setDuels([]);
    setPage(0);
    setHasMore(true);
    // Explicitly call loadMore for the new user/initial state
    // But wait, the sentinel might not fire yet, so we call it.
    // However, the rule is "Use a SINGLE useEffect that triggers loadMore on mount"
  }, [user]);

  useEffect(() => {
    loadMore();
  }, [user]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this duel?')) return;

    // Optimistically remove from UI
    setDuels(prev => prev.filter(r => r.id !== id));

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
    setDuels([]);
  };
  
  const handleTogglePrivacy = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    
    // Optimistic update
    setDuels(prev => prev.map(r => r.id === id ? { ...r, isPublic: newStatus } : r));
    
    if (user) {
      const success = await toggleDuelPrivacy(id, newStatus);
      if (!success) {
        // Rollback
        setDuels(prev => prev.map(r => r.id === id ? { ...r, isPublic: currentStatus } : r));
      }
    }
  };

  const handleViewResult = (record: DuelRecord) => {
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
      verdict: record.verdict,
    }));
    navigate(`/results/${record.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">History</h1>
        {duels.length > 0 && (
          <Button variant="ghost" onClick={handleClear} className="text-neutral-400 hover:text-red-400">
            <Trash2 size={18} className="mr-2" /> Clear All
          </Button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[4/3] rounded-[2rem] bg-surface border border-border animate-pulse flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-white/20 animate-spin" />
            </div>
          ))}
        </div>
      )}

      {!loading && duels.length === 0 ? (
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
          {duels.map((record) => (
            <DuelCard 
              key={record.id} 
              record={record} 
              onDelete={handleDelete} 
              onTogglePrivacy={handleTogglePrivacy}
              onClick={() => handleViewResult(record)} 
            />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}

function DuelCard({ record, onDelete, onTogglePrivacy, onClick }: { 
  record: DuelRecord, 
  onDelete: (e: React.MouseEvent, id: string) => void, 
  onTogglePrivacy: (e: React.MouseEvent, id: string, current: boolean) => void,
  onClick: () => void 
}) {
  const winnerLetter = record.winner;
  const loserLetter = winnerLetter === 'A' ? 'B' : 'A';
  const winnerScore = record.scores[winnerLetter].total;
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
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
        <button 
          onClick={(e) => onTogglePrivacy(e, record.id, !!record.isPublic)}
          className={cn(
            "p-2 backdrop-blur-md rounded-full transition-all border",
            record.isPublic 
              ? "bg-accent/20 border-accent/30 text-accent" 
              : "bg-black/60 border-white/10 text-neutral-400"
          )}
          title={record.isPublic ? "Public - Visible in Explore" : "Private - Hidden from Explore"}
        >
          {record.isPublic ? <Globe size={16} /> : <Lock size={16} />}
        </button>
        <button 
          onClick={(e) => onDelete(e, record.id)}
          className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-neutral-400 hover:text-red-400 transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Status indicator (always visible) */}
      {!record.isPublic && (
        <div className="absolute top-2 left-6 bg-black/60 backdrop-blur-md border border-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1 z-10">
          <Lock size={10} /> Private
        </div>
      )}

      {/* Side by Side Preview */}
      <div className="grid grid-cols-2 gap-2 h-40">
        <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/5 flex items-center justify-center">
          {record.previewA ? (
            <img 
              src={record.previewA} 
              alt="A" 
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                record.winner === 'B' ? "opacity-50" : "opacity-100"
              )}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="font-display font-black text-2xl text-white/10 select-none">A</span>
          )}
          <div className="absolute top-2 left-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">A</div>
          {record.winner === 'A' && (
            <div className="absolute bottom-2 right-2 p-1 bg-winner rounded-full shadow-lg">
              <Trophy size={10} className="text-black" />
            </div>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/5 flex items-center justify-center">
          {record.previewB ? (
            <img 
              src={record.previewB} 
              alt="B" 
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                record.winner === 'A' ? "opacity-50" : "opacity-100"
              )}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="font-display font-black text-2xl text-white/10 select-none">B</span>
          )}
          <div className="absolute top-2 right-2 w-5 h-5 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10">B</div>
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
               {record.winner === 'A' ? 'Photo A' : 'Photo B'} Dominated
             </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-border/50">
           <div className="flex-1 flex flex-col items-center border-r border-border/50">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Winner</span>
             <span className="text-xl font-display font-bold text-winner">{winnerScore}</span>
           </div>
           <div className="flex-1 flex flex-col items-center">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Margin</span>
             <span className="text-xl font-display font-bold">+{record.margin}</span>
           </div>
           <div className="flex-1 flex flex-col items-center border-l border-border/50">
             <span className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Loser</span>
             <span className="text-xl font-display font-bold text-neutral-400">{loserScore}</span>
           </div>
        </div>

        <p className="text-sm text-neutral-400 line-clamp-2 italic leading-relaxed">
          "{record.verdict || record.summary}"
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">
             {record.isPublic ? (
               <span className="flex items-center gap-1 text-accent"><Globe size={10} /> Public Feed</span>
             ) : (
               <span className="flex items-center gap-1"><Lock size={10} /> Private Only</span>
             )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-widest group-hover:translate-x-1 transition-transform">
            Details <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
