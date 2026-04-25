import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Swords, History, Compass, Trophy, Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/duel', label: 'Duel', icon: Swords },
  { path: '/history', label: 'History', icon: History },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/rate', label: 'Rate', icon: Flame },
  { path: '/leaderboard', label: 'Ranks', icon: Trophy },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top nav — desktop only */}
      {!isLanding && (
        <header className="hidden md:flex sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-black text-white text-sm">V</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">VRSUS</span>
          </Link>

          <nav className="flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.pathname.startsWith(item.path)
                    ? "text-foreground"
                    : "text-neutral-400 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-white/30 transition-all flex-shrink-0"
                >
                  <div className="w-full h-full bg-accent flex items-center justify-center">
                    <span className="text-white font-black text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
                <button onClick={signOut} className="text-sm text-neutral-400 hover:text-foreground transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth">
                <button className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-black text-white text-xs">V</span>
            </div>
            <span className="font-display font-bold tracking-tight">VRSUS</span>
          </Link>
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full overflow-hidden bg-accent flex items-center justify-center border border-white/10"
            >
              <span className="text-white font-black text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </button>
          ) : (
            <Link to="/auth" className="text-sm font-semibold text-foreground bg-surface border border-border px-3 py-1.5 rounded-full">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main content — add bottom padding on mobile for nav bar */}
      <main className={cn("flex-1", !isLanding && "pb-20 md:pb-0")}>
        {children}
      </main>

      {/* Mobile bottom navigation */}
      {!isLanding && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border">
          <div className="grid grid-cols-6 h-16">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors relative",
                  active ? "text-foreground" : "text-neutral-500"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && <div className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full" />}
              </Link>
            );
          })}
          {/* Mobile Profile Tab */}
          <button
            onClick={() => navigate('/profile')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors relative",
              location.pathname.startsWith('/profile') ? "text-foreground" : "text-neutral-500"
            )}
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                <div className="w-full h-full bg-accent flex items-center justify-center">
                  <span className="text-white font-black text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
            </div>
            {location.pathname.startsWith('/profile') && <div className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full" />}
          </button>
          </div>
        </nav>
      )}
    </div>
  );
}
