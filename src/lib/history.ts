import { DuelRecord } from '../types/history';

const HISTORY_KEY = 'vrsus_history';

export function saveToHistory(record: DuelRecord): void {
  const existing = getHistory();
  const updated = [record, ...existing].slice(0, 50); // keep max 50 duels
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function getHistory(): DuelRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function deleteFromHistory(id: string): void {
  const updated = getHistory().filter(r => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
