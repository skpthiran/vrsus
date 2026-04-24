import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Flame, MessageCircle, Share2, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { upsertReaction, getReactions, getComments, addComment, deleteComment } from '../lib/duels';

interface DuelCardProps {
  duel: any;
  onCardClick?: (duel: any) => void;
  showReactions?: boolean;
  voteCounts?: { a: number; b: number; userPick: 'A' | 'B' | null };
  onVote?: (pick: 'A' | 'B') => void;
  showVoting?: boolean;
}

export function DuelCard({ 
  duel, 
  onCardClick, 
  showReactions = true,
  voteCounts,
  onVote,
  showVoting = false
}: DuelCardProps) {
  const { user } = useAuth();
  const imgRef = React.useRef<HTMLDivElement>(null);
  const showWinnerReveal = !!voteCounts?.userPick;

  const totalVotes = (voteCounts?.a ?? 0) + (voteCounts?.b ?? 0);
  const aPercent = totalVotes === 0 ? 50 : Math.round((voteCounts!.a / totalVotes) * 100);
  const bPercent = 100 - aPercent;
  const [visible, setVisible] = React.useState(false);
  const [reactions, setReactions] = React.useState({ agree: 0, disagree: 0, fire: 0, userReaction: null as string | null });
  const [showComments, setShowComments] = React.useState(false);
  const [comments, setComments] = React.useState<any[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const isSeedDuel = duel.id?.startsWith('seed-');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!showReactions) return;
    if (isSeedDuel) {
      setReactions({ agree: 12, disagree: 3, fire: 28, userReaction: null });
      return;
    }
    getReactions(duel.id).then(data => {
      const agree = data.filter(r => r.reaction_type === 'agree').length;
      const disagree = data.filter(r => r.reaction_type === 'disagree').length;
      const fire = data.filter(r => r.reaction_type === 'fire').length;
      const userReaction = user ? (data.find(r => r.user_id === user.id)?.reaction_type || null) : null;
      setReactions({ agree, disagree, fire, userReaction });
    });
  }, [duel.id, user, showReactions]);

  const handleReaction = async (type: 'agree' | 'disagree' | 'fire') => {
    if (!user || isSeedDuel) return;
    const prev = { ...reactions };
    // Optimistic update
    const alreadyThis = reactions.userReaction === type;
    setReactions(r => ({
      ...r,
      [type]: alreadyThis ? r[type] - 1 : r[type] + 1,
      [r.userReaction as string]: r.userReaction && r.userReaction !== type ? r[r.userReaction as keyof typeof r] as number - 1 : r[r.userReaction as keyof typeof r],
      userReaction: alreadyThis ? null : type,
    }));
    try {
      await upsertReaction(duel.id, user.id, type);
    } catch {
      setReactions(prev);
    }
  };

  const handleOpenComments = async () => {
    setShowComments(true);
    if (!isSeedDuel) {
      const data = await getComments(duel.id);
      setComments(data);
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const displayName = user.email?.split('@')[0] || 'User';
      const comment = await addComment(duel.id, user.id, newComment.trim(), displayName);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="bg-surface border border-border rounded-[2rem] overflow-hidden">
      {/* Photo grid */}
      <div
        className={cn("grid grid-cols-2 relative", (onCardClick) && "cursor-pointer")}
        style={{ aspectRatio: '4/3' }}
        onClick={() => onCardClick && onCardClick(duel)}
      >
        {/* Photo A */}
        <div ref={imgRef} className="relative overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 overflow-hidden flex items-center justify-center">
            {visible && (duel.preview_a || duel.imgA) ? (
              <img 
                src={duel.preview_a || duel.imgA} 
                alt="A" 
                className={cn(
                  "w-full h-full object-cover transition-all duration-700", 
                  showWinnerReveal && duel.winner === 'B' ? "opacity-30 grayscale-[60%]" : ""
                )} 
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="font-display font-black text-4xl text-white/10 select-none">A</span>
            )}
          </div>
          <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="text-xs font-black text-white">A</span>
          </div>
          {/* Combined Top-Left Badge for left side */}
          <div className="absolute top-12 left-3 flex flex-col gap-1.5 z-10">
            <span className="text-[10px] font-black px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-white uppercase tracking-wider">{duel.mode}</span>
            {duel.isOwn && <span className="text-[10px] font-black px-2 py-0.5 bg-accent/80 backdrop-blur-md rounded-md text-white uppercase tracking-wider">YOURS</span>}
          </div>
          {(!showVoting || voteCounts?.userPick) && duel.winner === 'A' && (
            <>
              <div className="absolute inset-0 border-2 border-yellow-400 z-10 pointer-events-none" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl z-20 animate-bounce">👑</div>
              <div className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full z-20 shadow-[0_4px_12px_rgba(251,191,36,0.3)]">AI WINNER</div>
            </>
          )}
        </div>

        {/* Photo B */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-800 overflow-hidden flex items-center justify-center">
            {visible && (duel.preview_b || duel.imgB) ? (
              <img 
                src={duel.preview_b || duel.imgB} 
                alt="B" 
                className={cn(
                  "w-full h-full object-cover transition-all duration-700", 
                  showWinnerReveal && duel.winner === 'A' ? "opacity-30 grayscale-[60%]" : ""
                )} 
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="font-display font-black text-4xl text-white/10 select-none">B</span>
            )}
          </div>
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="text-xs font-black text-white">B</span>
          </div>
          {(!showVoting || voteCounts?.userPick) && duel.winner === 'B' && (
            <>
              <div className="absolute inset-0 border-2 border-yellow-400 z-10 pointer-events-none" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl z-20 animate-bounce">👑</div>
              <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full z-20 shadow-[0_4px_12px_rgba(251,191,36,0.3)]">AI WINNER</div>
            </>
          )}
        </div>

        {/* VS badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center z-10">
          <span className="font-display font-black text-white text-xs italic">VS</span>
        </div>

        {/* Unified Score + Description Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 flex flex-col gap-3 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
          {/* Score Row */}
          <div className="flex items-center justify-between">
            {(!showVoting || voteCounts?.userPick) && (
              <span className={cn(
                "backdrop-blur-md font-display font-black text-2xl px-4 py-1.5 rounded-xl border transition-all",
                showWinnerReveal && duel.winner === 'A' 
                  ? "bg-black/90 text-yellow-400 border-yellow-400/40 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-110" 
                  : "bg-black/80 text-white border-white/10"
              )}>
                {duel.aScore}
              </span>
            )}
            
            {(!showVoting || voteCounts?.userPick) && (
              <span className={cn(
                "backdrop-blur-md font-display font-black text-2xl px-4 py-1.5 rounded-xl border transition-all",
                showWinnerReveal && duel.winner === 'B' 
                  ? "bg-black/90 text-yellow-400 border-yellow-400/40 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-110" 
                  : "bg-black/80 text-white border-white/10"
              )}>
                {duel.bScore}
              </span>
            )}
          </div>
          
          {/* Description Text */}
          {(!showVoting || voteCounts?.userPick) && duel.reason && (
            <p className="text-white font-medium text-xs line-clamp-1 italic text-center opacity-80 px-2">
              "{duel.reason}"
            </p>
          )}
        </div>
      </div>

      {showVoting && (
        <div className="px-4 pb-4">
          {!voteCounts?.userPick ? (
            // Before voting — make the A and B buttons feel like a battle
            <>
              <p className="text-center text-white/40 text-xs font-bold tracking-widest uppercase mb-3">⚔️ Who wins?</p>
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onVote?.('A'); }}
                  className="flex-1 py-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-display font-black text-lg hover:bg-blue-500/40 hover:scale-105 transition-all active:scale-95"
                >
                  A
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onVote?.('B'); }}
                  className="flex-1 py-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 font-display font-black text-lg hover:bg-red-500/40 hover:scale-105 transition-all active:scale-95"
                >
                  B
                </button>
              </div>
            </>
          ) : (
            // After voting — show a red vs green battle bar with energy
            <div className="space-y-2">
              <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-700 ease-out rounded-l-full"
                  style={{ width: `${aPercent}%` }}
                />
                <div
                  className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 ease-out flex-1 rounded-r-full"
                />
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-green-400">A {aPercent}%</span>
                <div className="flex flex-col items-center">
                  <span className="text-white/30 text-[10px]">👥 {totalVotes} votes</span>
                  {voteCounts.userPick === duel.winner ? (
                    <span className="text-green-400 text-[10px] animate-pulse">✅ You picked right!</span>
                  ) : (
                    <span className="text-white/40 text-[10px]">😬 AI disagreed with you</span>
                  )}
                </div>
                <span className="text-red-400">{bPercent}% B</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reactions footer */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleReaction('agree')}
            className={cn("flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-1.5 rounded-full", reactions.userReaction === 'agree' ? "bg-green-500/20 text-green-400" : "text-neutral-400 hover:text-white", !user && "opacity-50 cursor-not-allowed")}
          >
            <ThumbsUp size={15} /> {reactions.agree}
          </button>
          <button
            onClick={() => handleReaction('disagree')}
            className={cn("flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-1.5 rounded-full", reactions.userReaction === 'disagree' ? "bg-red-500/20 text-red-400" : "text-neutral-400 hover:text-white", !user && "opacity-50 cursor-not-allowed")}
          >
            <ThumbsDown size={15} /> {reactions.disagree}
          </button>
          <button
            onClick={() => handleReaction('fire')}
            className={cn("flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-1.5 rounded-full", reactions.userReaction === 'fire' ? "bg-orange-500/20 text-orange-400" : "text-neutral-400 hover:text-white", !user && "opacity-50 cursor-not-allowed")}
          >
            <Flame size={15} /> {reactions.fire}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenComments}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors text-sm"
          >
            <MessageCircle size={16} />
            <span>{comments.length || duel.comments || 0}</span>
          </button>
          <button
            onClick={() => navigator.share?.({ url: window.location.href, title: 'VRSUS Duel' }).catch(() => navigator.clipboard.writeText(window.location.href))}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold text-sm">Comments</span>
            <button onClick={() => setShowComments(false)} className="text-neutral-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto px-4 space-y-3 pb-3">
            {comments.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-4">No comments yet. Be the first!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent">
                      {(comment.display_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 bg-background rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-300">
                        {comment.display_name || 'User'}
                      </span>
                      {user && comment.user_id === user.id && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-neutral-600 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-neutral-200 mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2 px-4 pb-4">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                maxLength={300}
                className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-neutral-500"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center disabled:opacity-50 flex-shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-neutral-500 pb-4">
              <a href="/auth" className="text-accent hover:underline">Sign in</a> to comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
