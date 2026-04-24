import React from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Share2, Download, Copy, RefreshCw, CheckCircle2, ArrowUpRight, Loader2, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { getDuelById } from '../lib/duels';
import { useAuth } from '../contexts/AuthContext';

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const shareCardRef = React.useRef<HTMLDivElement>(null);
  
  const userPrediction = location.state?.userPrediction as 'A' | 'B' | null;
  
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadResult() {
      setLoading(true);
      
      // 1. Handle guest mode
      if (id === 'guest') {
        const guestResult = location.state?.result || JSON.parse(sessionStorage.getItem('vrsus_last_result') || 'null');
        if (guestResult) {
          setResult(guestResult);
          setLoading(false);
          return;
        }
      }

      // 2. Try session storage for specific ID
      const cached = sessionStorage.getItem('vrsus_last_result');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.id === id) {
          setResult(parsed);
          setLoading(false);
          return;
        }
      }

      // 2. If ID in URL, fetch from Supabase
      if (id) {
        try {
          const data = await getDuelById(id);
          if (data) {
            setResult(data);
          }
        } catch (err) {
          console.error('Failed to fetch duel:', err);
        }
      }
      
      setLoading(false);
    }

    loadResult();
  }, [id]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
      <p className="text-neutral-400">Loading result...</p>
    </div>
  );

  if (!result || !result.scores || !result.winner) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <p className="text-neutral-400 mb-4 text-lg">Duel result not found.</p>
      <Link to="/duel">
        <Button variant="default" className="bg-accent hover:bg-accent-hover text-white px-8">Start New Duel</Button>
      </Link>
    </div>
  );

  const winnerScore = result.scores[result.winner]?.total || 0;
  const loserLetter = result.winner === 'A' ? 'B' : 'A';
  const loserScore = result.scores[loserLetter]?.total || 0;
  const winnerPreview = result.winner === 'A' ? result.previewA : result.previewB;
  const loserPreview = result.winner === 'A' ? result.previewB : result.previewA;

  const categoryNames = result.scores?.A ? Object.keys(result.scores.A).filter(k => k !== 'total' && k !== 'observation') : ['face_card', 'body', 'style', 'glow', 'expression', 'aura'];
  const categoryLabels: Record<string, string> = {
    face_card: '😮 Face Card',
    body: '💪 Body',
    style: '👗 Style',
    glow: '✨ Glow',
    expression: '😄 Expression',
    aura: '⚡ Aura',
    confidence: '🔥 Confidence',
    lighting: '💡 Lighting',
    grooming: '🪒 Grooming',
    composition: '📸 Composition',
    presence: '👑 Presence'
  };

  const handleDownload = async () => {
    if (!shareCardRef.current) return;
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        width: 1080,
        height: 1080,
        scale: 1,
        useCORS: true,
        backgroundColor: '#030303',
        logging: false,
      } as any);
      const link = document.createElement('a');
      link.download = `vrsus-duel-${result.id || Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Share card generation failed:', err);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/results/${result.id || ''}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  const handleChallenge = () => {
    navigate('/duel', { 
      state: { 
        challengePhoto: winnerPreview,
        challengeDuelId: result.id,
        challengeDefenses: result.defenses || 0
      } 
    });
  };

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
          
          {/* Defense Count Banner */}
          {result.defenses > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-winner/10 border border-winner/30 rounded-full text-winner text-sm font-bold"
            >
              <span>🛡️</span>
              <span>This champion has defended {result.defenses} time{result.defenses !== 1 ? 's' : ''}</span>
            </motion.div>
          )}
        </div>

        {/* Guest Banner */}
        {!user && id === 'guest' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-8 bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
          >
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <Info size={24} />
              </div>
              <div>
                <h4 className="text-blue-400 font-bold">Guest Mode</h4>
                <p className="text-blue-400/70 text-sm">This result is only saved in your browser. Create an account to save your history.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Sign Up Now
            </button>
          </motion.div>
        )}

       {userPrediction && result && (
         <div className="max-w-4xl mx-auto mb-8">
           {userPrediction === result.winner ? (
             <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 text-green-400">
               <CheckCircle2 size={20} />
               <span className="font-bold">You called it! 🎯 Your prediction matched the AI.</span>
             </div>
           ) : (
             <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3 text-orange-400">
               <Info size={20} className="text-orange-400" />
               <span className="font-bold">AI surprised you 😮 It picked {result.winner} instead.</span>
             </div>
           )}
         </div>
       )}

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
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
             className="bg-surface/50 border border-winner/20 p-8 rounded-3xl relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-winner/5 blur-3xl rounded-full"></div>
             <div className="relative z-10 space-y-3">
               <p className="text-xs uppercase tracking-widest font-semibold text-winner text-center mb-4">🏆 The Verdict</p>
               <p className="text-base md:text-lg font-display leading-relaxed text-neutral-200">
                 {result.verdict || result.summary}
               </p>
               <p className="text-xs text-neutral-500 italic text-right">— VRSUS AI Judge</p>
             </div>
          </motion.div>

          {/* Score Breakdown */}
          <div className="space-y-6">
             <h3 className="text-sm tracking-widest uppercase font-semibold text-neutral-400 text-center">Detailed Breakdown</h3>
             <div className="grid gap-4">
                {(categoryNames ?? []).map((cat, i) => {
                  const scoreA = result.scores?.A?.[cat] ?? 0;
                  const scoreB = result.scores?.B?.[cat] ?? 0;
                  return (
                    <div key={i} className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-border">
                       <div className="w-12 text-center font-display font-bold text-lg text-neutral-400 flex-shrink-0">{scoreA}</div>
                       <div className="flex-1">
                          <div className="flex justify-between text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-2">
                             <span className="text-neutral-500">A</span>
                             <span className="text-foreground truncate px-2 capitalize">{categoryLabels[cat] || cat}</span>
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

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 pt-8 border-t border-border/50">
             {/* Why Winner Wins */}
              <div className="space-y-4 md:space-y-6">
                <h3 className="flex items-center gap-2 text-lg md:text-xl font-display font-bold text-white">
                  <CheckCircle2 className="text-winner w-5 h-5" />
                  Why Photo {result.winner} Wins
                </h3>
                <ul className="space-y-3 md:space-y-4">
                   {(result.reasonsForWin ?? []).map((item: string, i: number) => (
                     <li key={i} className="flex gap-3 text-sm md:text-base text-neutral-300 bg-surface p-3 md:p-4 rounded-xl md:rounded-2xl border border-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-winner mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                     </li>
                   ))}
                </ul>
              </div>

             {/* Where Loser Falls Behind & Tips */}
              <div className="space-y-4 md:space-y-6">
                <h3 className="flex items-center gap-2 text-lg md:text-xl font-display font-bold text-white">
                  <ArrowUpRight className="text-accent w-5 h-5" />
                  Improvement Tips for Photo {loserLetter}
                </h3>
                <ul className="space-y-3 md:space-y-4">
                   {(result.weaknessesOfLoser ?? []).map((item: string, i: number) => (
                     <li key={i} className="flex gap-3 text-sm md:text-base text-neutral-300 bg-surface p-3 md:p-4 rounded-xl md:rounded-2xl border border-border">
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
                <Button size="lg" variant="outline" className="glass" onClick={handleCopyLink}>
                   <Copy className="mr-2 w-5 h-5" />
                   Copy Link
                </Button>
                <Button size="lg" variant="ghost" className="text-neutral-400" onClick={handleDownload}>
                   <Download className="mr-2 w-5 h-5" />
                   Save Image
                </Button>
             </div>
          </div>

          {/* Challenge Winner Loop CTA */}
          <div className="mt-8 border border-winner/30 rounded-[2rem] p-8 bg-winner/5 flex flex-col items-center gap-6 text-center">
             <div className="w-16 h-16 rounded-full bg-winner/20 flex items-center justify-center text-3xl">
               ⚔️
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-display font-bold text-white">Can you beat this champion?</h3>
               <p className="text-neutral-400 max-w-md">
                 This photo is officially a VRSUS champion. Upload your best shot to see if you can take the title.
               </p>
             </div>
             <Button 
               onClick={handleChallenge}
               className="bg-winner hover:bg-yellow-500 text-black font-bold px-10 py-6 rounded-2xl text-lg shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all hover:scale-105 active:scale-95"
             >
               Accept the Challenge
             </Button>
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

       {/* Hidden Share Card for Export */}
       <div
         ref={shareCardRef}
         style={{
           position: 'fixed',
           left: '-9999px',
           top: 0,
           width: '1080px',
           height: '1080px',
           background: '#030303',
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '60px',
           fontFamily: 'Inter, sans-serif',
           gap: '32px',
         }}
       >
         {/* Top label */}
         <div style={{ color: '#6d28d9', fontSize: '18px', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase' }}>
           VRSUS — AI Photo Battle
         </div>

         {/* Photos side by side */}
         <div style={{ display: 'flex', gap: '24px', width: '100%', height: '600px', position: 'relative' }}>
           {/* Loser photo */}
           <div style={{ flex: 1, borderRadius: '24px', overflow: 'hidden', position: 'relative', opacity: 0.7 }}>
             <img src={loserPreview || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
             <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 16px', borderRadius: '12px', fontSize: '28px', fontWeight: 900 }}>
               {loserScore}
             </div>
             <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 700 }}>
               Photo {result.winner === 'A' ? 'B' : 'A'}
             </div>
           </div>

           {/* VS badge */}
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '72px', height: '72px', background: '#030303', border: '2px solid #6d28d9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: 900, zIndex: 10 }}>
             VS
           </div>

           {/* Winner photo */}
           <div style={{ flex: 1, borderRadius: '24px', overflow: 'hidden', position: 'relative', border: '4px solid #fbbf24', boxShadow: '0 0 60px rgba(251,191,36,0.4)' }}>
             <img src={winnerPreview || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
             <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#fbbf24', color: 'black', padding: '6px 14px', borderRadius: '8px', fontSize: '16px', fontWeight: 900 }}>
               🏆 WINNER
             </div>
             <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.8)', color: '#fbbf24', padding: '8px 16px', borderRadius: '12px', fontSize: '28px', fontWeight: 900 }}>
               {winnerScore}
             </div>
             <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 700 }}>
               Photo {result.winner}
             </div>
           </div>
         </div>

         {/* Summary */}
         <div style={{ color: '#e5e5e5', fontSize: '22px', textAlign: 'center', maxWidth: '800px', fontStyle: 'italic', lineHeight: 1.5 }}>
           "{result.summary}"
         </div>

         {/* Watermark */}
         <div style={{ color: '#444', fontSize: '16px', letterSpacing: '3px', textTransform: 'uppercase' }}>
           vrsus.app
         </div>
       </div>
    </div>
  );
}
