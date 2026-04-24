import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analyzePhotos } from '../lib/api';
import { saveDuelToSupabase } from '../lib/duels';
import { saveToHistory } from '../lib/history';
import { useAuth } from '../contexts/AuthContext';
import { DuelRecord } from '../types/history';

export function AnalyzingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [previews, setPreviews] = useState<{ previewA: string | null; previewB: string | null }>({
    previewA: null,
    previewB: null
  });
  const [userPrediction, setUserPrediction] = useState<'A' | 'B' | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const predictionRef = useRef<'A' | 'B' | null>(null);

  useEffect(() => {
    predictionRef.current = userPrediction;
  }, [userPrediction]);


  const steps = [
    "Reading image quality...",
    "Comparing facial clarity...",
    "Evaluating presence and styling...",
    "Calculating final scores...",
    "Selecting winner..."
  ];

  useEffect(() => {
    // 1. Get raw base64 from session storage
    const rawA = sessionStorage.getItem('vrsus_pending_a');
    const rawB = sessionStorage.getItem('vrsus_pending_b');
    const mode = sessionStorage.getItem('vrsus_pending_mode') || 'general';
    const challengeOf = sessionStorage.getItem('vrsus_pending_challenge_of') || undefined;

    if (!rawA || !rawB) {
      navigate('/duel');
      return;
    }

    // Set previews for the scanning animation
    const dataUrlA = `data:image/jpeg;base64,${rawA}`;
    const dataUrlB = `data:image/jpeg;base64,${rawB}`;
    
    setPreviews({
      previewA: dataUrlA,
      previewB: dataUrlB
    });

    // 2. Start step animation timer
    const stepTimer = setInterval(() => {
      setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000); // 2s per step for a smoother feel

    // 3. Run Analysis Pipeline
    analyzePhotos(rawA, rawB, mode)
      .then(async (result) => {
        // Prepare record for persistence
        const record: DuelRecord = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode,
          winner: result.winner,
          margin: result.margin,
          summary: result.summary,
          previewA: dataUrlA,
          previewB: dataUrlB,
          scores: result.scores,
          reasons_for_win: result.reasons_for_win,
          weaknesses_of_loser: result.weaknesses_of_loser,
          verdict: result.verdict,
          challenge_of: challengeOf,
        };

        // Persistent save to local history
        saveToHistory(record);

        // Save to Supabase if logged in
        let dbId = record.id;
        if (user) {
          const savedId = await saveDuelToSupabase(record, user.id);
          if (savedId) dbId = savedId;
        }

        // Cleanup pending photos
        sessionStorage.removeItem('vrsus_pending_a');
        sessionStorage.removeItem('vrsus_pending_b');
        sessionStorage.removeItem('vrsus_pending_mode');
        sessionStorage.removeItem('vrsus_pending_challenge_of');

        // Store result for Results page
        sessionStorage.setItem('vrsus_last_result', JSON.stringify({
          ...result,
          previewA: dataUrlA,
          previewB: dataUrlB,
        }));

        // Give the animation a tiny bit more time if it was too fast
        setTimeout(() => {
          navigate(`/results/${dbId}`, { state: { userPrediction: predictionRef.current } });
        }, 800);
      })
      .catch(err => {
        console.error('Analysis pipeline failed:', err);
        navigate('/duel', { state: { error: 'Analysis failed. Please try again.' } });
      });

    return () => clearInterval(stepTimer);
  }, [navigate, user]);

  if (!predictionLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <p className="text-white/60 text-sm font-semibold tracking-widest uppercase">AI is deciding...</p>
        <h2 className="font-display font-black text-4xl text-white text-center">Who do YOU think wins?</h2>
        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => { setUserPrediction('A'); setPredictionLocked(true); }}
            className="flex-1 py-6 rounded-3xl bg-white/10 border border-white/20 text-white font-display font-black text-3xl hover:bg-white/20 transition-all active:scale-95"
          >
            A
          </button>
          <button
            onClick={() => { setUserPrediction('B'); setPredictionLocked(true); }}
            className="flex-1 py-6 rounded-3xl bg-white/10 border border-white/20 text-white font-display font-black text-3xl hover:bg-white/20 transition-all active:scale-95"
          >
            B
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center container mx-auto px-4 max-w-6xl py-12">
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4 animate-pulse">Analyzing Duel</h1>
        <p className="text-neutral-400 text-lg h-8">
           <motion.span
             key={stepIndex}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
           >
             {steps[stepIndex]}
           </motion.span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-3xl w-full relative">
         <div className="absolute inset-0 bg-accent/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
         
         {[previews.previewA, previews.previewB].map((img, i) => (
            <div key={i} className="relative rounded-3xl overflow-hidden aspect-[3/4] border border-border/50 bg-surface z-10">
               {img ? (
                 <img src={img} alt="Scanning" className="w-full h-full object-cover opacity-50 grayscale" />
               ) : (
                 <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-neutral-600">No Image</span>
                 </div>
               )}
               
               {/* Scanning Line */}
               <motion.div 
                 className="absolute top-0 left-0 right-0 h-1 bg-accent shadow-[0_0_20px_rgba(109,40,217,1)]"
                 animate={{ top: ['0%', '100%', '0%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
               />
               
               {/* Shimmer/Pulse */}
               <motion.div 
                 className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/20 to-transparent"
                 animate={{ top: ['-100%', '200%'] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
               />
            </div>
         ))}

         {/* Center glowing orb */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-accent/20 border border-accent/40 rounded-full flex justify-center items-center z-20 shadow-[0_0_50px_rgba(109,40,217,0.5)]">
            <div className="w-8 h-8 rounded-full bg-accent animate-ping opacity-50"></div>
         </div>
      </div>
    </div>
  );
}
