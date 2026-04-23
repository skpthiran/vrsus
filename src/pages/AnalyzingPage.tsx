import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AnalyzingPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [previews, setPreviews] = useState<{ previewA: string | null; previewB: string | null }>({
    previewA: null,
    previewB: null
  });

  const steps = [
    "Reading image quality...",
    "Comparing facial clarity...",
    "Evaluating presence and styling...",
    "Calculating final scores...",
    "Selecting winner..."
  ];

  useEffect(() => {
    // Load previews from sessionStorage
    const storedPreviews = sessionStorage.getItem('vrsus_previews');
    if (storedPreviews) {
      setPreviews(JSON.parse(storedPreviews));
    }

    const timer = setInterval(() => {
      setStepIndex(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 1200);

    const redirectTimer = setTimeout(() => {
      navigate('/duel/results');
    }, 6500);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

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
                 <img src={img} alt="Scanning" className="w-full h-full object-cover opacity-50 grayscale transition-all duration-[6000ms] " />
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
