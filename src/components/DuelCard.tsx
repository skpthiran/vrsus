import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Flame, MessageCircle, Share2, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { upsertReaction, getReactions, getComments, addComment, deleteComment } from '../lib/duels';

interface DuelCardProps {
  duel: any;
  onCardClick?: (duel: any) => void;
}

export function DuelCard({ duel, onCardClick }: DuelCardProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState({ agree: 0, disagree: 0, fire: 0, userReaction: null as string | null });
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSeedDuel = duel.id?.startsWith('seed-');

  useEffect(() => {
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
  }, [duel.id, user]);

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
        className={cn("grid grid-cols-2 relative", (duel.isOwn && onCardClick) && "cursor-pointer")}
        style={{ aspectRatio: '4/3' }}
        onClick={() => onCardClick && duel.isOwn && onCardClick(duel)}
      >
        {/* Photo A */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full bg-neutral-900 overflow-hidden">
            {duel.imgA ? (
              <img 
                src={duel.imgA} 
                alt="A" 
                className={cn("w-full h-full object-cover transition-all", duel.winner === 'B' ? "opacity-50 grayscale-[40%]" : "")} 
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display font-black text-4xl text-white/20">A</span>
              </div>
            )}
          </div>
          <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs font-black text-white">A</span>
          </div>
          {duel.winner === 'A' && (
            <>
              <div className="absolute inset-0 ring-4 ring-inset" style={{ '--tw-ring-color': '#fbbf24' } as any} />
              <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full z-10">👑 WIN</div>
              <div className="absolute bottom-2 left-2 z-10">
                <span className="bg-black/80 backdrop-blur-sm text-yellow-400 font-display font-black text-xl px-3 py-1.5 rounded-xl border border-yellow-400/40 shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                  {duel.aScore}
                </span>
              </div>
            </>
          )}
          {duel.winner === 'B' && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="bg-black/80 backdrop-blur-sm text-white font-display font-black text-xl px-3 py-1.5 rounded-xl border border-white/20">
                {duel.aScore}
              </span>
            </div>
          )}
        </div>

        {/* Photo B */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full bg-neutral-900 overflow-hidden">
            {duel.imgB ? (
              <img 
                src={duel.imgB} 
                alt="B" 
                className={cn("w-full h-full object-cover transition-all", duel.winner === 'A' ? "opacity-50 grayscale-[40%]" : "")} 
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display font-black text-4xl text-white/20">B</span>
              </div>
            )}
          </div>
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs font-black text-white">B</span>
          </div>
          {duel.winner === 'B' && (
            <>
              <div className="absolute inset-0 ring-4 ring-inset" style={{ '--tw-ring-color': '#fbbf24' } as any} />
              <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full z-10">👑 WIN</div>
              <div className="absolute bottom-2 right-2 z-10">
                <span className="bg-black/80 backdrop-blur-sm text-yellow-400 font-display font-black text-xl px-3 py-1.5 rounded-xl border border-yellow-400/40 shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                  {duel.bScore}
                </span>
              </div>
            </>
          )}
          {duel.winner === 'A' && (
            <div className="absolute bottom-2 right-2 z-10">
              <span className="bg-black/80 backdrop-blur-sm text-white font-display font-black text-xl px-3 py-1.5 rounded-xl border border-white/20">
                {duel.bScore}
              </span>
            </div>
          )}
        </div>

        {/* VS badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center z-10">
          <span className="font-display font-black text-white text-xs">VS</span>
        </div>

        {/* Mode + summary overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white">{duel.mode}</span>
            {duel.isOwn && <span className="text-xs font-bold px-2 py-1 bg-accent/80 backdrop-blur-md rounded-md text-white">YOUR DUEL</span>}
          </div>
          {duel.reason && <p className="text-white text-xs mt-1 line-clamp-1 hidden md:block">"{duel.reason}"</p>}
        </div>
      </div>

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
