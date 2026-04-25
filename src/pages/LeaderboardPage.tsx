import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getCurrentChampion,
  getTopScores,
  getMostWins,
  getThisWeek,
  challengeChampion,
  ChampionData,
  LeaderboardEntry,
} from '../lib/leaderboard';

const tabs = [
  { id: 'champion', label: '👑 Champion' },
  { id: 'top_scores', label: '🏆 Top Scores' },
  { id: 'most_wins', label: '📊 Most Wins' },
  { id: 'this_week', label: '🔥 This Week' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('champion');
  const [champion, setChampion] = useState<ChampionData | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeStatus, setChallengeStatus] = useState<string | null>(null);

  const loadTab = useCallback(async (tab: string) => {
    setLoading(true);
    setEntries([]);
    try {
      if (tab === 'champion') {
        const data = await getCurrentChampion();
        setChampion(data);
      } else if (tab === 'top_scores') {
        const data = await getTopScores();
        setEntries(data);
      } else if (tab === 'most_wins') {
        const data = await getMostWins();
        setEntries(data);
      } else if (tab === 'this_week') {
        const data = await getThisWeek();
        setEntries(data);
      }
    } catch (err) {
      console.error('[Leaderboard] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleChallenge = async () => {
    if (!user || !champion) return;
    setChallengeStatus('Checking eligibility...');
    const result = await challengeChampion(champion.userId, user.id);
    if (!result.canChallenge) {
      setChallengeStatus(result.reason || 'Cannot challenge right now.');
      return;
    }
    // Navigate to analyze page with challenge mode
    navigate('/duel', { 
      state: { 
        challengeMode: true, 
        championUserId: champion.userId,
        championBestDuelId: result.championBestDuelId,
        championPhoto: champion.bestPhoto,
      } 
    });
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-yellow-400 font-black text-xl';
    if (rank === 2) return 'text-gray-300 font-bold text-lg';
    if (rank === 3) return 'text-amber-600 font-bold text-lg';
    return 'text-white/40 font-medium';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <h1 className="font-display font-black text-3xl text-white tracking-tight">
          LEADERBOARD
        </h1>
        <p className="text-white/40 text-sm mt-1">Who's running the game</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Champion Tab */}
          {activeTab === 'champion' && (
            <div className="px-4">
              {champion ? (
                <div className="space-y-4">
                  {/* Champion Card */}
                  <div className="relative rounded-2xl overflow-hidden border border-yellow-400/30 bg-gradient-to-b from-yellow-400/10 to-black">
                    {champion.bestPhoto && (
                      <div className="relative h-80">
                        <img
                          src={champion.bestPhoto}
                          className="w-full h-full object-cover object-top"
                          alt="Champion"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute top-4 left-4 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full">
                          👑 REIGNING CHAMPION
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="font-display font-black text-2xl text-white">
                            {champion.username}
                          </h2>
                          <p className="text-white/50 text-sm mt-0.5">
                            Crowned {new Date(champion.crownedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-black text-3xl">
                            {champion.bestScore}
                          </div>
                          <div className="text-white/40 text-xs">best score</div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <div className="text-white font-black text-xl">{champion.totalWins}</div>
                          <div className="text-white/40 text-xs mt-0.5">total wins</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <div className="text-yellow-400 font-black text-xl">{champion.defenses}</div>
                          <div className="text-white/40 text-xs mt-0.5">defenses</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <div className="text-white font-black text-xl">{champion.bestScore}</div>
                          <div className="text-white/40 text-xs mt-0.5">peak score</div>
                        </div>
                      </div>

                      {/* Challenge Button */}
                      {user && user.id !== champion.userId && (
                        <div className="mt-4">
                          <button
                            onClick={handleChallenge}
                            className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl text-sm hover:bg-yellow-300 transition-colors"
                          >
                            ⚔️ CHALLENGE CHAMPION
                          </button>
                          {challengeStatus && (
                            <p className="text-white/50 text-xs text-center mt-2">{challengeStatus}</p>
                          )}
                          <p className="text-white/30 text-xs text-center mt-1">
                            Requires 3+ duels to challenge
                          </p>
                        </div>
                      )}
                      {user && user.id === champion.userId && (
                        <div className="mt-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 text-center">
                          <p className="text-yellow-400 font-bold text-sm">
                            👑 You are the champion. Defend your title.
                          </p>
                        </div>
                      )}
                      {!user && (
                        <button
                          onClick={() => navigate('/auth')}
                          className="w-full mt-4 bg-white/10 text-white font-bold py-3 rounded-xl text-sm hover:bg-white/20 transition-colors"
                        >
                          Sign in to Challenge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-white/40">
                  <div className="text-4xl mb-3">👑</div>
                  <p className="font-bold">No champion yet</p>
                  <p className="text-sm mt-1">Win duels to claim the throne</p>
                </div>
              )}
            </div>
          )}

          {/* List Tabs */}
          {activeTab !== 'champion' && (
            <div className="px-4 space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-20 text-white/40">
                  <p className="font-bold">No data yet</p>
                  <p className="text-sm mt-1">Run some duels to get on the board</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      entry.rank <= 3
                        ? 'bg-white/5 border-white/20'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-10 text-center flex-shrink-0 ${getRankStyle(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-white/40 font-bold text-sm">
                          {entry.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name + Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{entry.username}</div>
                      <div className="text-white/40 text-xs mt-0.5">
                        {activeTab === 'top_scores' && `Best score: ${entry.bestScore}`}
                        {activeTab === 'most_wins' && `${entry.totalDuels} duels · ${entry.winRate}% win rate`}
                        {activeTab === 'this_week' && `${entry.totalDuels} duels this week`}
                      </div>
                    </div>

                    {/* Main Stat */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-xl text-yellow-400">
                        {activeTab === 'top_scores' && entry.bestScore}
                        {activeTab === 'most_wins' && entry.totalWins}
                        {activeTab === 'this_week' && entry.totalWins}
                      </div>
                      <div className="text-white/30 text-xs">
                        {activeTab === 'top_scores' && 'pts'}
                        {activeTab === 'most_wins' && 'wins'}
                        {activeTab === 'this_week' && 'wins'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
