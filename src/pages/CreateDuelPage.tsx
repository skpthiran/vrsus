import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, X, Zap, Loader2 } from 'lucide-react';
import { analyzePhotos } from '../lib/api';

import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { saveToHistory } from '../lib/history';
import { DuelRecord } from '../types/history';
import { useAuth } from '../contexts/AuthContext';
import { saveDuelToSupabase } from '../lib/duels';

interface PhotoSlot {
  preview: string | null;
  base64: string | null;
  file: File | null;
}

const initialSlot: PhotoSlot = { preview: null, base64: null, file: null };

export function CreateDuelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slotA, setSlotA] = useState<PhotoSlot>(initialSlot);
  const [slotB, setSlotB] = useState<PhotoSlot>(initialSlot);
  const [mode, setMode] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (slot: 'A' | 'B', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const rawBase64 = base64String.split(',')[1];
      const previewUrl = URL.createObjectURL(file);

      const updateData = {
        preview: previewUrl,
        base64: rawBase64,
        file: file
      };

      if (slot === 'A') {
        if (slotA.preview) URL.revokeObjectURL(slotA.preview);
        setSlotA(updateData);
      } else {
        if (slotB.preview) URL.revokeObjectURL(slotB.preview);
        setSlotB(updateData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (slot: 'A' | 'B') => {
    if (slot === 'A') {
      if (slotA.preview) URL.revokeObjectURL(slotA.preview);
      setSlotA(initialSlot);
    } else {
      if (slotB.preview) URL.revokeObjectURL(slotB.preview);
      setSlotB(initialSlot);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!slotA.file || !slotB.file) throw new Error('Files missing');

      const result = await analyzePhotos(slotA.base64!, slotB.base64!, mode);

      
      // Convert files to full data URLs for history (persistence)
      const toDataURL = (file: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      };

      const dataUrlA = await toDataURL(slotA.file);
      const dataUrlB = await toDataURL(slotB.file);

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
      };

      saveToHistory(record);
      
      if (user) {
        await saveDuelToSupabase(record, user.id);
      }
      
      sessionStorage.setItem('vrsus_result', JSON.stringify(result));
      sessionStorage.setItem('vrsus_previews', JSON.stringify({
        previewA: slotA.preview,
        previewB: slotB.preview
      }));

      navigate('/duel/analyzing');
    } catch (err) {
      console.error(err);
      setError('Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 container mx-auto px-4 max-w-6xl py-12">
       <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">Create a Duel</h1>
          <p className="text-neutral-400 text-lg">Upload 2 photos and let AI decide which one wins.</p>
       </div>

       <div className="relative">
         {/* Grid for Upload */}
         <div className="grid md:grid-cols-2 gap-8 md:gap-16">
            {/* Photo A */}
            <UploadCard 
               label="Photo A" 
               slot={slotA} 
               onRemove={() => handleRemove('A')} 
               onUpload={(file) => handleFileUpload('A', file)} 
               accent="blue"
            />
            {/* Photo B */}
            <UploadCard 
               label="Photo B" 
               slot={slotB} 
               onRemove={() => handleRemove('B')} 
               onUpload={(file) => handleFileUpload('B', file)} 
               accent="violet"
            />
         </div>

         {/* VS Badge Center */}
         <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-background border border-border/50 rounded-full flex-col justify-center items-center z-10 shadow-2xl">
            <span className="font-display font-black text-2xl text-transparent bg-clip-text bg-gradient-to-br from-neutral-200 to-neutral-600">VS</span>
         </div>
       </div>

       <div className="max-w-xl mx-auto mt-16 space-y-8">
          <div className="space-y-4">
             <label className="block text-sm font-semibold tracking-wide uppercase text-neutral-400 text-center">Comparison Context</label>
             <div className="flex flex-wrap justify-center gap-2">
                {[
                  { id: 'general', label: 'General' },
                  { id: 'dating', label: 'Dating Profile' },
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'instagram', label: 'Instagram' },
                ].map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium transition-all",
                      mode === m.id ? "bg-foreground text-background" : "bg-surface text-neutral-400 hover:text-foreground border border-border"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-accent/20 rounded-lg text-accent">
                 <Zap size={20} />
               </div>
               <div>
                  <div className="font-semibold text-sm">Detailed Analysis</div>
                  <div className="text-xs text-neutral-500">Get a full breakdown of lighting, expression, & more.</div>
               </div>
             </div>
             <div className="w-12 h-6 bg-accent rounded-full relative cursor-pointer">
               <div className="absolute right-1 top-1 bottom-1 w-4 bg-white rounded-full shadow"></div>
             </div>
          </div>

          <p className="text-xs text-center text-neutral-500">Only upload photos of consenting adults.</p>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="w-full h-16 text-lg font-bold disabled:opacity-50"
              disabled={!slotA.base64 || !slotB.base64 || loading}
              onClick={handleAnalyze}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Analyzing...
                </span>
              ) : (
                "Analyze Duel"
              )}
            </Button>
            {error && (
              <p className="text-red-500 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>
       </div>
    </div>
  );
}

function UploadCard({ label, slot, onRemove, onUpload, accent }: { label: string, slot: PhotoSlot, onRemove: () => void, onUpload: (file: File) => void, accent: 'blue' | 'violet' }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
       <input 
         type="file" 
         className="hidden" 
         ref={fileInputRef} 
         accept="image/*"
         onChange={(e) => {
           const file = e.target.files?.[0];
           if (file) onUpload(file);
           e.target.value = '';
         }}
       />
       <div className="flex items-center justify-between px-2">
         <span className="font-display font-bold text-lg">{label}</span>
         {slot.preview && (
           <button onClick={onRemove} className="text-xs text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-wider font-semibold">Remove</button>
         )}
       </div>
       <div className={cn(
         "aspect-[3/4] rounded-3xl overflow-hidden relative transition-all duration-300 border-2",
         slot.preview ? (accent === 'blue' ? 'border-transparent shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'border-transparent shadow-[0_0_40px_rgba(139,92,246,0.1)]') : "border-dashed border-border bg-surface hover:bg-surface-hover hover:border-neutral-600 cursor-pointer"
       )}
       onClick={() => !slot.preview && fileInputRef.current?.click()}
       >
          {slot.preview ? (
            <>
               <img src={slot.preview} alt={label} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 pointer-events-none"></div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
               <UploadCloud size={40} className="mb-4 text-neutral-600" />
               <span className="font-semibold text-lg text-foreground mb-1">Click to Upload</span>
               <span className="text-sm">or drag and drop</span>
            </div>
          )}
       </div>
    </div>
  )
}
