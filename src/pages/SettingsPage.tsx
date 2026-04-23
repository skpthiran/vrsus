import React from 'react';
import { Shield, Bell, Lock, User, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export function SettingsPage() {
  return (
    <div className="flex-1 container mx-auto px-4 max-w-4xl py-12 flex flex-col md:flex-row gap-12">
      
      <div className="w-full md:w-64 shrink-0 space-y-2">
         <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-4 px-3">Settings</h2>
         {[
           { icon: <User size={18} />, label: 'Account' },
           { icon: <Shield size={18} />, label: 'Privacy & Safety' },
           { icon: <Bell size={18} />, label: 'Notifications' },
           { icon: <Lock size={18} />, label: 'Security' },
         ].map((item, i) => (
           <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${i === 1 ? 'bg-surface text-foreground' : 'text-neutral-400 hover:text-foreground hover:bg-surface/50'}`}>
              {item.icon}
              {item.label}
           </button>
         ))}
      </div>

      <div className="flex-1 space-y-12">
         <div>
            <h1 className="text-3xl font-display font-bold mb-2">Privacy & Safety</h1>
            <p className="text-neutral-400 pb-6 border-b border-border">Manage how your photos and data are used on VRSUS.</p>
         </div>

         <div className="space-y-8">
            <ToggleOption 
               title="Allow duels to appear in Explore" 
               desc="If checked, your shared duels may be featured on the public Explore page." 
               defaultChecked={true}
            />
            <ToggleOption 
               title="Auto-delete uploaded photos after analysis" 
               desc="We delete photos after 30 days by default. Toggle this to delete immediately after the results are viewed." 
               defaultChecked={false}
            />
            <ToggleOption 
               title="Anonymize faces in public duels" 
               desc="Automatically detect and blur faces if a duel is shared publicly." 
               defaultChecked={false}
            />
         </div>

         <div className="pt-8 border-t border-border">
            <h3 className="text-xl font-display font-bold mb-4">Safety Guidelines</h3>
            <div className="bg-surface p-6 rounded-2xl border border-border space-y-4 text-sm text-neutral-300">
               <p>• Only upload photos of consenting adults (18+).</p>
               <p>• Do not use VRSUS to humiliate, harass, or bully others.</p>
               <p>• We actively monitor reports and will ban users violating these terms.</p>
               <Button variant="outline" className="mt-4">Read Full Policy</Button>
            </div>
         </div>

         <div className="pt-12">
            <button className="flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors">
               <Trash2 size={18} />
               Delete Account & All Data
            </button>
         </div>
      </div>

    </div>
  );
}

function ToggleOption({ title, desc, defaultChecked }: { title: string, desc: string, defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
         <div className="font-semibold text-foreground mb-1">{title}</div>
         <div className="text-sm text-neutral-400 max-w-md">{desc}</div>
      </div>
      <button 
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface border border-border'}`}
      >
        <div className={`absolute top-1 bottom-1 w-4 h-4 rounded-full transition-all ${checked ? 'bg-white right-1' : 'bg-neutral-500 left-1'}`}></div>
      </button>
    </div>
  )
}

