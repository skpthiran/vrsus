import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Image as ImageIcon, Heart, Share2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export function ProfilePage() {
  return (
    <div className="flex-1 container mx-auto px-4 max-w-5xl py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
        <div className="w-32 h-32 rounded-full border-4 border-surface shadow-[0_0_30px_rgba(109,40,217,0.3)] bg-gradient-to-tr from-accent to-blue-500 flex justify-center items-center overflow-hidden shrink-0">
          <span className="text-4xl font-display font-bold text-white">JD</span>
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
             <div>
                <h1 className="text-3xl font-display font-bold">Jason Doe</h1>
                <p className="text-neutral-400">@jasondoe • Joined Jan 2026</p>
             </div>
             <Link to="/settings">
                <Button variant="secondary" className="gap-2">
                   <Settings size={18} />
                   Edit Profile
                </Button>
             </Link>
          </div>
          
          <p className="max-w-xl text-neutral-300 mb-8">
            Digital creator & aspiring fitness model. Using VRSUS to select the best content for my socials.
          </p>

          <div className="flex gap-8">
             <div className="flex flex-col">
               <span className="font-display font-bold text-2xl">42</span>
               <span className="text-sm text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><ImageIcon size={14}/> Duels</span>
             </div>
             <div className="flex flex-col">
               <span className="font-display font-bold text-2xl">18</span>
               <span className="text-sm text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Share2 size={14}/> Shared</span>
             </div>
             <div className="flex flex-col">
               <span className="font-display font-bold text-2xl">24k</span>
               <span className="text-sm text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Heart size={14}/> Likes</span>
             </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-8">
         <h2 className="text-2xl font-display font-bold mb-6">Recent Activity</h2>
         
         {/* Placeholder empty state / simple list */}
         <div className="bg-surface border border-border rounded-3xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mb-4">
               <ImageIcon size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">No public duels yet</h3>
            <p className="text-neutral-400 mb-6 max-w-sm">When you run a duel and share it, it will appear here on your public profile.</p>
            <Link to="/duel">
               <Button>Create a Duel</Button>
            </Link>
         </div>
      </div>
    </div>
  );
}

