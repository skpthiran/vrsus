import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Swords, History, Compass, User, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/duel', label: 'Duel', icon: Swords },
  { path: '/history', label: 'History', icon: History },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/leaderboard', label: 'Ranks', icon: Trophy },
  { path: '/profile', label: 'Profile', icon: User },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
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
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                  {user.email?.[0].toUpperCase()}
                </div>
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
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
              {user.email?.[0].toUpperCase()}
            </div>
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
          <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-foreground" : "text-neutral-500"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && <div className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full" />}
              </Link>
            );
          })}
          </div>
        </nav>
      )}
    </div>
  );
}
