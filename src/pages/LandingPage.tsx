import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Upload, Sparkles, Trophy, Share2, Shield, Search } from 'lucide-react';
import { Button } from '../components/ui/button';

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Logo Bar */}
      <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="font-display font-black text-white text-sm">V</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">VRSUS</span>
        </Link>
      </div>
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 md:pt-32 md:pb-40 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-gradient-vrsus -z-20"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] -z-10 mix-blend-overlay"></div>
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] -z-10 pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-accent/30 text-accent font-medium text-xs tracking-wider uppercase mb-8">
            <Sparkles size={14} />
            <span className="text-glow">VRSUS AI Engine v2.0 Live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter mb-6 leading-[0.9]">
            Upload 2 Photos.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-violet-400 to-blue-500">Let AI Pick the Winner.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            VRSUS compares two photos, scores each one, and reveals which image makes the stronger first impression — with a detailed breakdown.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/duel">
              <Button size="lg" className="w-full sm:w-auto h-14 bg-foreground text-background font-semibold text-lg hover:bg-neutral-200">
                Start a Duel
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
<button 
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-8 h-14 rounded-full hover:bg-white/10 transition-all glass"
              >
                Sign In
              </button>
            </div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-20 w-full max-w-5xl mx-auto relative perspective-1000"
        >
           <div className="relative rounded-3xl border border-border/50 bg-black shadow-2xl overflow-hidden glass p-4 md:p-6 tilted-hero border-glow">
              <div className="grid grid-cols-2 gap-4 md:gap-8 items-center bg-surface rounded-2xl p-4 md:p-8">
                {/* Photo A Preview */}
                <div className="relative group rounded-xl overflow-hidden aspect-[3/4]">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop" alt="Photo A" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-sm border border-white/20">A</div>
                  <div className="absolute bottom-4 inset-x-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">Score</span>
                    <span className="font-display font-bold text-xl text-white">84</span>
                  </div>
                </div>

                {/* Photo B Preview - Winner */}
                <div className="relative group rounded-xl overflow-hidden aspect-[3/4] ring-2 ring-winner shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                  <div className="absolute top-0 right-0 p-1 z-10 w-full flex justify-end">
                     <div className="bg-winner text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg flex items-center gap-1">
                        <Trophy size={12} />
                        WINNER
                     </div>
                  </div>
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" alt="Photo B" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-sm border border-white/20">B</div>
                  <div className="absolute bottom-4 inset-x-4 bg-black/80 backdrop-blur-md border border-winner/30 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-winner">Score</span>
                    <span className="font-display font-bold text-xl text-winner">96</span>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-background/90 backdrop-blur-xl border border-accent/50 rounded-full flex flex-col justify-center items-center z-10 shadow-xl">
                  <span className="font-display font-black text-xl md:text-2xl text-white">VS</span>
                </div>
              </div>
           </div>
        </motion.div>
      </section>

      {/* Social Proof Strip */}
      <section className="py-12 border-y border-border/50 bg-black/50">
         <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-80">
              <div className="text-center">
                 <div className="font-display font-bold text-3xl md:text-4xl text-white mb-1">50K+</div>
                 <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Duels Run</div>
              </div>
              <div className="text-center">
                 <div className="font-display font-bold text-3xl md:text-4xl text-white mb-1">92%</div>
                 <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Share Rate</div>
              </div>
              <div className="text-center text-left">
                 <div className="text-sm font-medium text-neutral-400 max-w-[200px] leading-snug">
                   Used for Dating, LinkedIn, Selfies, and Gym Pics.
                 </div>
              </div>
            </div>
         </div>
      </section>

      {/* How it Works */}
      <section className="py-32 container mx-auto px-4 max-w-7xl">
         <div className="text-center mb-20">
           <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">How it Works</h2>
           <p className="text-neutral-400 text-lg">Three steps to the perfect first impression.</p>
         </div>

         <div className="grid md:grid-cols-3 gap-8">
           {[
             { step: '01', title: 'Upload 2 Photos', desc: 'Securely upload two photos you want to compare.', icon: <Upload size={32} className="text-accent" /> },
             { step: '02', title: 'AI Scores Both', desc: 'Our vision engine deeply analyzes lighting, expression, and presence.', icon: <Search size={32} className="text-accent" /> },
             { step: '03', title: 'Get Winner + Reasons', desc: 'Discover exactly why one photo hits harder than the other.', icon: <Trophy size={32} className="text-accent" /> },
           ].map((item, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-surface border border-border hover:border-accent/30 transition-colors group">
                 <div className="absolute right-8 top-8 text-6xl font-display font-black text-white/5 group-hover:text-white/10 transition-colors">{item.step}</div>
                 <div className="w-16 h-16 rounded-2xl bg-black border border-border/50 flex items-center justify-center mb-8 shadow-lg group-hover:border-accent/40 group-hover:shadow-[0_0_20px_rgba(109,40,217,0.2)] transition-all">
                   {item.icon}
                 </div>
                 <h3 className="text-2xl font-bold font-display mb-3">{item.title}</h3>
                 <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
           ))}
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 relative px-4 text-center overflow-hidden">
         <div className="absolute inset-0 bg-accent/5"></div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-accent/20 blur-[100px] -z-10"></div>
         
         <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-8">Ready to see <br />who wins?</h2>
            <Link to="/duel">
              <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-[0_0_30px_rgba(109,40,217,0.4)]">
                Start a Duel Now
                <ArrowRight className="ml-2" />
              </Button>
            </Link>
         </div>
      </section>
    </div>
  );
}

