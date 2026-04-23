import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export function HistoryPage() {
  const mockHistory = [
    { id: 1, date: '2 hours ago', mode: 'General', winner: 'B', aScore: 84, bScore: 96, imgA: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop', imgB: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&fit=crop' },
    { id: 2, date: 'Yesterday', mode: 'LinkedIn', winner: 'A', aScore: 92, bScore: 78, imgA: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&fit=crop', imgB: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&fit=crop' },
    { id: 3, date: 'Mar 12', mode: 'Dating', winner: 'B', aScore: 65, bScore: 89, imgA: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop', imgB: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&fit=crop' },
    { id: 4, date: 'Mar 05', mode: 'Instagram', winner: 'A', aScore: 94, bScore: 91, imgA: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&fit=crop', imgB: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&fit=crop' },
    { id: 5, date: 'Feb 28', mode: 'Gym', winner: 'B', aScore: 75, bScore: 98, imgA: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&fit=crop', imgB: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&fit=crop' },
  ];

  return (
    <div className="flex-1 container mx-auto px-4 max-w-6xl py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Your Duels</h1>
          <p className="text-neutral-400">Review past results and track your photo performance.</p>
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-3">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="w-full bg-surface border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors"
               />
           </div>
           <button className="p-2.5 bg-surface border border-border rounded-full hover:bg-surface-hover text-neutral-400">
             <Filter size={18} />
           </button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
         {['All', 'Dating', 'LinkedIn', 'Instagram', 'Saved'].map((tab, i) => (
           <button 
             key={i} 
             className={cn(
               "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap",
               i === 0 ? "bg-foreground text-background" : "bg-surface text-neutral-400 border border-border hover:text-foreground"
             )}
           >
             {tab}
           </button>
         ))}
      </div>

      <div className="grid gap-4">
         {mockHistory.map((duel) => (
           <Link to="/duel/results" key={duel.id}>
             <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-surface border border-border rounded-3xl p-4 hover:border-accent/30 transition-all hover:bg-surface-hover group">
               {/* Previews */}
               <div className="flex items-center gap-2 w-full md:w-auto">
                 <div className={cn("relative w-20 h-28 rounded-xl overflow-hidden", duel.winner === 'A' ? "ring-2 ring-winner" : "opacity-60")}>
                    {duel.winner === 'A' && <div className="absolute top-0 right-0 bg-winner p-0.5 rounded-bl-lg z-10"><Trophy size={10} className="text-black" /></div>}
                    <img src={duel.imgA} alt="A" className="w-full h-full object-cover" />
                 </div>
                 <div className="text-neutral-600 font-display font-black">VS</div>
                 <div className={cn("relative w-20 h-28 rounded-xl overflow-hidden", duel.winner === 'B' ? "ring-2 ring-winner" : "opacity-60")}>
                    {duel.winner === 'B' && <div className="absolute top-0 right-0 bg-winner p-0.5 rounded-bl-lg z-10"><Trophy size={10} className="text-black" /></div>}
                    <img src={duel.imgB} alt="B" className="w-full h-full object-cover" />
                 </div>
               </div>

               {/* Info */}
               <div className="flex-1 w-full md:w-auto flex flex-col justify-center">
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-xs font-semibold px-2 py-1 bg-background rounded-md text-neutral-300">{duel.mode}</span>
                   <span className="text-xs text-neutral-500">{duel.date}</span>
                 </div>
                 <div className="text-lg font-display font-medium mb-1">
                   {duel.winner === 'A' ? 'Photo A' : 'Photo B'} won by {Math.abs(duel.aScore - duel.bScore)} points
                 </div>
                 <div className="flex items-center gap-4 text-sm text-neutral-400">
                   <span className={duel.winner === 'A' ? "text-winner font-bold" : ""}>A: {duel.aScore}</span>
                   <span className={duel.winner === 'B' ? "text-winner font-bold" : ""}>B: {duel.bScore}</span>
                 </div>
               </div>
               
               <div className="hidden md:flex pr-4">
                 <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-neutral-400 group-hover:bg-foreground group-hover:text-background transition-colors">
                    <span className="font-medium text-xl leading-none">→</span>
                 </div>
               </div>
             </div>
           </Link>
         ))}
      </div>
    </div>
  );
}

