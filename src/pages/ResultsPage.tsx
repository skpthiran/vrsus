import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Share2, Download, Copy, RefreshCw, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export function ResultsPage() {
  const navigate = useNavigate();
  const result = JSON.parse(sessionStorage.getItem('vrsus_result') || 'null');
  const previews = JSON.parse(sessionStorage.getItem('vrsus_previews') || 'null');

  useEffect(() => {
    if (!result || !previews) {
      navigate('/duel');
    }
  }, [result, previews, navigate]);

  if (!result || !previews) return null;

  const winnerScore = result.scores[result.winner].total;
  const loserLetter = result.winner === 'A' ? 'B' : 'A';
  const loserScore = result.scores[loserLetter].total;
  const winnerPreview = result.winner === 'A' ? previews.previewA : previews.previewB;
  const loserPreview = result.winner === 'A' ? previews.previewB : previews.previewA;

  const categoryNames = ['confidence', 'lighting', 'expression', 'grooming', 'composition', 'presence'];

  return (
    <div className="flex-1 container mx-auto px-4 max-w-6xl py-12">
       <div className="text-center mb-12">
          <motion.h1 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="text-4xl md:text-6xl font-display font-bold tracking-tighter mb-4 text-glow-winner"
          >
            Winner Selected
          </motion.h1>
          <p className="text-neutral-400 text-lg">AI has determined the stronger visual impression.</p>
       </div>

       {/* Hero Result Grid */}
       <div className="grid md:grid-cols-2 gap-6 md:gap-16 relative mb-16">
          {/* Loser Photo */}
          <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="relative rounded-3xl overflow-hidden aspect-[3/4] border border-border/50 bg-black"
          >
            <img src={loserPreview} alt={`Photo ${loserLetter}`} className="w-full h-full object-cover opacity-80" />
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-sm border border-white/20 flex items-center justify-center">{loserLetter}</div>
            <div className="absolute bottom-6 inset-x-6 flex items-end justify-between">
               <div>
                  <div className="text-xs uppercase tracking-widest text-white/70 font-semibold mb-1">Total Score</div>
                  <div className="font-display font-bold text-6xl text-white/90 leading-none">{loserScore}</div>
               </div>
            </div>
          </motion.div>

          {/* Winner Photo */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="relative rounded-3xl overflow-hidden aspect-[3/4] ring-4 ring-winner shadow-[0_0_60px_rgba(251,191,36,0.3)] bg-black z-10 scale-105"
          >
            <div className="absolute top-0 right-0 p-1.5 z-20 w-full flex justify-end">
               <div className="bg-winner text-black text-sm font-bold px-4 py-2 rounded-bl-2xl rounded-tr-xl flex items-center gap-1.5 shadow-lg">
                  <Trophy size={16} />
                  WINNER
               </div>
            </div>
            <img src={winnerPreview} alt={`Photo ${result.winner}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-sm border border-white/20 flex items-center justify-center z-10">{result.winner}</div>
            <div className="absolute bottom-6 inset-x-6 flex items-end justify-between z-10">
               <div>
                  <div className="text-xs uppercase tracking-widest text-winner/90 font-semibold mb-1 text-glow-winner">Total Score</div>
                  <div className="font-display font-bold text-7xl text-winner leading-none text-glow-winner">{winnerScore}</div>
               </div>
               <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-white/70 font-semibold mb-1">Edge</div>
                  <div className="font-display font-bold text-3xl text-white">+{result.margin}</div>
               </div>
            </div>
          </motion.div>

          {/* VS Badge */}
          <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background border border-border/50 rounded-full flex-col justify-center items-center z-20 shadow-2xl">
             <span className="font-display font-black text-xl text-neutral-500">VS</span>
          </div>
       </div>

       <div className="max-w-4xl mx-auto space-y-12">
          {/* Dramatic Summary */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
             className="bg-surface/50 border border-winner/20 p-8 rounded-3xl text-center relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-winner/5 blur-3xl rounded-full"></div>
             <p className="text-xl md:text-2xl font-display font-semibold leading-relaxed relative z-10">
               "{result.summary}"
             </p>
          </motion.div>

          {/* Score Breakdown */}
          <div className="space-y-6">
             <h3 className="text-sm tracking-widest uppercase font-semibold text-neutral-400 text-center">Detailed Breakdown</h3>
             <div className="grid gap-4">
                {categoryNames.map((cat, i) => {
                  const scoreA = result.scores.A[cat];
                  const scoreB = result.scores.B[cat];
                  return (
                    <div key={i} className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-border">
                       <div className="w-12 text-center font-display font-bold text-lg text-neutral-400 flex-shrink-0">{scoreA}</div>
                       <div className="flex-1">
                          <div className="flex justify-between text-xs uppercase tracking-wider font-semibold mb-2">
                             <span className="text-neutral-500">A</span>
                             <span className="text-foreground capitalize">{cat}</span>
                             <span className="text-winner">B</span>
                          </div>
                          <div className="relative h-2 bg-black rounded-full overflow-hidden flex">
                             {/* A's bar (left aligned) */}
                             <div className="absolute left-0 top-0 bottom-0 bg-neutral-600 rounded-l-full" style={{ width: `50%` }}>
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${scoreA * 10}%` }}
                                 transition={{ duration: 1, delay: 0.5 }}
                                 className="absolute right-0 top-0 bottom-0 bg-neutral-400" 
                               ></motion.div>
                             </div>
                             {/* Boundary */}
                             <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-background z-10 -translate-x-1/2"></div>
                             {/* B's bar (right aligned) */}
                             <div className="absolute right-0 top-0 bottom-0 bg-winner/20 rounded-r-full" style={{ width: `50%` }}>
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${scoreB * 10}%` }}
                                 transition={{ duration: 1, delay: 0.5 }}
                                 className="absolute left-0 top-0 bottom-0 bg-winner shadow-[0_0_10px_rgba(251,191,36,0.8)]" 
                               ></motion.div>
                             </div>
                          </div>
                       </div>
                       <div className="w-12 text-center font-display font-bold text-lg text-winner flex-shrink-0">{scoreB}</div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-border/50">
             {/* Why Winner Wins */}
             <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-xl font-display font-bold text-white">
                  <CheckCircle2 className="text-winner" />
                  Why Photo {result.winner} Wins
                </h3>
                <ul className="space-y-4">
                   {result.reasons_for_win.map((item: string, i: number) => (
                     <li key={i} className="flex gap-3 text-neutral-300 bg-surface p-4 rounded-2xl border border-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-winner mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                     </li>
                   ))}
                </ul>
             </div>

             {/* Where Loser Falls Behind & Tips */}
             <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-xl font-display font-bold text-white">
                  <ArrowUpRight className="text-accent" />
                  Improvement Tips for Photo {loserLetter}
                </h3>
                <ul className="space-y-4">
                   {result.weaknesses_of_loser.map((item: string, i: number) => (
                     <li key={i} className="flex gap-3 text-neutral-300 bg-surface p-4 rounded-2xl border border-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                     </li>
                   ))}
                </ul>
             </div>
          </div>

          {/* Share Card Area */}
          <div className="mt-16 bg-gradient-to-br from-surface to-black p-8 md:p-12 rounded-[2rem] border border-border text-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full"></div>
             
             <h3 className="text-3xl font-display font-bold mb-4">Share Your Result</h3>
             <p className="text-neutral-400 mb-8 max-w-md mx-auto">Show off your winning photo or ask your friends if they agree with the AI's verdict.</p>
             
             <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-foreground text-background font-semibold hover:bg-neutral-200">
                   <Share2 className="mr-2 w-5 h-5" />
                   Share to Socials
                </Button>
                <Button size="lg" variant="outline" className="glass">
                   <Copy className="mr-2 w-5 h-5" />
                   Copy Link
                </Button>
                <Button size="lg" variant="ghost" className="text-neutral-400">
                   <Download className="mr-2 w-5 h-5" />
                   Save Image
                </Button>
             </div>
          </div>
          
          <div className="text-center pt-8">
             <Link to="/duel">
                <Button variant="ghost" size="lg" className="text-neutral-400 hover:text-white">
                   <RefreshCw className="mr-2 w-5 h-5" />
                   Run Another Duel
                </Button>
             </Link>
          </div>
       </div>
    </div>
  );
}
