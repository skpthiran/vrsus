import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL for votes table:
 * 
 * CREATE TABLE IF NOT EXISTS votes (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   duel_id uuid REFERENCES duels(id) ON DELETE CASCADE,
 *   user_id text, -- null for guests, auth uid for logged in
 *   session_id text, -- random id stored in localStorage for guests
 *   pick text CHECK (pick IN ('A', 'B')),
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(duel_id, session_id)
 * );
 * CREATE POLICY "Anyone can vote" ON votes FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Anyone can read votes" ON votes FOR SELECT USING (true);
 * ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
 */

/**
 * SQL to update duels table for Challenge Winner feature:
 * 
 * ALTER TABLE duels ADD COLUMN IF NOT EXISTS challenge_of uuid REFERENCES duels(id);
 * ALTER TABLE duels ADD COLUMN IF NOT EXISTS defenses integer DEFAULT 0;
 */
