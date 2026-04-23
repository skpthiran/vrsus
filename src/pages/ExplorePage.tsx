import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

export function ExplorePage() {
  const trendingDuels = [
    { id: 1, mode: 'Dating Profile', winner: 'B', aScore: 72, bScore: 94, likes: '1.2k', comments: 124, imgA: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop', reason: "Stronger background depth and more inviting expression." },
    { id: 2, mode: 'LinkedIn', winner: 'A', aScore: 96, bScore: 82, likes: '840', comments: 56, imgA: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&fit=crop', reason: "Professional lighting and excellent framing." },
    { id: 3, mode: 'Gym Progress', winner: 'B', aScore: 88, bScore: 91, likes: '2.5k', comments: 342, imgA: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&fit=crop', imgB: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&fit=crop', reason: "Better contrast and more dynamic posture." },
  ];

  return (
    <div className="flex-1 container mx-auto px-4 max-w-7xl py-12 flex flex-col md:flex-row gap-8">
       
       <div className="flex-1 max-w-3xl">
          <div className="mb-10">
             <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Explore</h1>
             <p className="text-neutral-400">See what's trending across VRSUS right now.</p>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
            {['Trending', 'Dating', 'LinkedIn', 'Gym', 'Fashion'].map((tab, i) => (
              <button 
                key={i} 
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2",
                  i === 0 ? "bg-foreground text-background" : "bg-surface text-neutral-400 border border-border hover:text-foreground"
                )}
              >
                {i === 0 && <TrendingUp size={16} />}
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-12">
            {trendingDuels.map(duel => (
               <div key={duel.id} className="bg-surface border border-border rounded-[2rem] overflow-hidden group">
                  <div className="grid grid-cols-2 aspect-[4/3] md:aspect-[16/9] relative">
                     <img src={duel.imgA} alt="A" className={cn("w-full h-full object-cover", duel.winner === 'B' ? "opacity-60 grayscale-[30%]" : "")} />
                     <img src={duel.imgB} alt="B" className={cn("w-full h-full object-cover", duel.winner === 'A' ? "opacity-60 grayscale-[30%]" : "")} />
                     
                     {/* Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
                        <div className="flex items-center justify-between">
                           <div>
                              <div className="text-xs font-semibold px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white mb-2 inline-block shadow-lg">
                                 {duel.mode}
                              </div>
                              <p className="text-white font-medium max-w-md hidden md:block">"{duel.reason}"</p>
                           </div>
                           
                           <Link to="/duel/results">
                              <Button className="bg-white/20 hover:bg-white backdrop-blur-md text-white hover:text-black border border-white/20 transition-all font-semibold rounded-full p-6 py-2">
                                 View Duel
                              </Button>
                           </Link>
                        </div>
                     </div>

                     {/* VS Badge */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md border border-white/20 rounded-full flex justify-center items-center">
                        <span className="font-display font-bold text-white text-sm">VS</span>
                     </div>
                  </div>
                  
                  {/* Footer Stats */}
                  <div className="p-4 flex items-center justify-between border-t border-border">
                     <div className="flex items-center gap-6">
                        <button className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                           <Heart size={20} />
                           <span className="text-sm font-medium">{duel.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                           <MessageCircle size={20} />
                           <span className="text-sm font-medium">{duel.comments}</span>
                        </button>
                     </div>
                     <button className="text-neutral-400 hover:text-white transition-colors">
                        <Share2 size={20} />
                     </button>
                  </div>
               </div>
            ))}
          </div>
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
          
          <div className="p-6 rounded-2xl bg-gradient-t from-accent/20 to-transparent border border-accent/20 text-center">
            <h3 className="font-display font-bold mb-2">Want to be featured?</h3>
            <p className="text-sm text-neutral-400 mb-4">Make your next duel public to appear on the explore page.</p>
            <Link to="/duel">
              <Button className="w-full">Create Public Duel</Button>
            </Link>
          </div>
       </div>
    </div>
  );
}

