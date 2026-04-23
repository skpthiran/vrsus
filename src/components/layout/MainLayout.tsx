import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Hexagon } from 'lucide-react'; // Example abstract logo

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent/30 selection:text-white">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="bg-foreground text-background p-1.5 rounded-lg">
              <Hexagon size={20} className="fill-current" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight uppercase">VRSUS</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <Link to="/duel" className={cn("hover:text-foreground transition-colors", location.pathname.includes('/duel') && "text-foreground")}>Duel</Link>
            <Link to="/history" className={cn("hover:text-foreground transition-colors", location.pathname === '/history' && "text-foreground")}>History</Link>
            <Link to="/explore" className={cn("hover:text-foreground transition-colors", location.pathname === '/explore' && "text-foreground")}>Explore</Link>
            {!isLanding && <Link to="/profile" className={cn("hover:text-foreground transition-colors", location.pathname === '/profile' && "text-foreground")}>Profile</Link>}
          </nav>
          
          <div className="flex items-center gap-4">
            {isLanding ? (
              <>
                <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-foreground hidden sm:block">Sign In</Link>
                <Link to="/duel" className="bg-foreground text-background px-5 py-2 rounded-full text-sm font-medium hover:bg-neutral-200 transition-colors">Try Now</Link>
              </>
            ) : (
             <Link to="/profile">
               <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent to-blue-500 flex items-center justify-center border border-border shadow-[0_0_15px_rgba(109,40,217,0.3)]">
                  <span className="text-xs font-bold text-white">JD</span>
               </div>
             </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {isLanding && (
        <footer className="border-t border-border/50 py-12 bg-surface/30">
           <div className="container mx-auto px-4 md:px-8 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-2 opacity-50">
                <Hexagon size={16} className="fill-current" />
                <span className="font-display font-bold text-sm tracking-widest uppercase">VRSUS</span>
             </div>
             <p className="text-xs text-neutral-500 uppercase tracking-widest font-medium">© 2026 VRSUS. Not a judgment of human worth.</p>
           </div>
        </footer>
      )}
    </div>
  );
}
