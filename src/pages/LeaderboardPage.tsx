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
  TopDuel,
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
  const [topDuels, setTopDuels] = useState<TopDuel[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeMsg, setChallengeMsg] = useState<string | null>(null);

  const loadTab = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'champion') {
        setChampion(await getCurrentChampion());
      } else if (tab === 'top_scores') {
        setTopDuels(await getTopScores(10));
      } else if (tab === 'most_wins') {
        setEntries(await getMostWins(10));
      } else if (tab === 'this_week') {
        setEntries(await getThisWeek(10));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  const handleChallenge = async () => {
    if (!user || !champion) return;
    setChallengeMsg('Checking eligibility...');
    const result = await challengeChampion(champion.userId, user.id);
    if (!result.canChallenge) {
      setChallengeMsg(result.reason || 'Cannot challenge.');
      return;
    }
    navigate('/analyze', {
      state: {
        challengeMode: true,
        championUserId: champion.userId,
        championBestDuelId: result.championBestDuelId,
        championPhoto: champion.bestPhoto,
      },
    });
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
      <div className="px-4 pt-8 pb-2">
        <h1 className="font-display font-black text-3xl tracking-tight">LEADERBOARD</h1>
        <p className="text-white/40 text-sm mt-1">Who's running the game</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white/50 hover:bg-white/15'
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
          {/* ── CHAMPION TAB ── */}
          {activeTab === 'champion' && (
            <div className="px-4">
              {champion ? (
                <div className="rounded-2xl overflow-hidden border border-yellow-400/40 bg-neutral-950">
                  {/* Desktop: side by side. Mobile: stacked */}
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative md:w-80 h-72 md:h-auto bg-neutral-900 flex-shrink-0">
                      {champion.bestPhoto ? (
                        <img
                          src={champion.bestPhoto}
                          className="w-full h-full object-cover object-top"
                          alt="Champion"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/10 font-black text-8xl">👑</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-950" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1.5 rounded-full">
                          👑 REIGNING CHAMPION
                        </span>
                      </div>
                      {champion.defenses > 0 && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-black/60 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-400/30">
                            🛡️ {champion.defenses} defenses
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-6 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {champion.avatarUrl ? (
                            <img src={champion.avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-yellow-400 font-black text-lg">
                              {champion.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h2 className="font-black text-2xl md:text-3xl text-white">{champion.username}</h2>
                          <p className="text-white/40 text-sm">
                            Champion since {new Date(champion.crownedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { label: 'Peak Score', value: champion.bestScore, gold: true },
                          { label: 'Total Wins', value: champion.totalWins, gold: false },
                          { label: 'Defenses', value: champion.defenses, gold: false },
                        ].map(stat => (
                          <div key={stat.label} className="bg-white/5 rounded-xl p-4 text-center">
                            <div className={`font-black text-3xl ${stat.gold ? 'text-yellow-400' : 'text-white'}`}>
                              {stat.value}
                            </div>
                            <div className="text-white/30 text-xs mt-1">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      {!user && (
                        <button onClick={() => navigate('/auth')}
                          className="w-full bg-white/10 text-white font-bold py-3 rounded-xl text-sm hover:bg-white/15 transition-colors">
                          Sign in to Challenge
                        </button>
                      )}
                      {user && user.id === champion.userId && (
                        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 text-center">
                          <p className="text-yellow-400 font-bold">👑 You hold the crown. Defend it.</p>
                        </div>
                      )}
                      {user && user.id !== champion.userId && (
                        <div>
                          <button onClick={handleChallenge}
                            className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-colors">
                            ⚔️ CHALLENGE CHAMPION
                          </button>
                          {challengeMsg && (
                            <p className="text-white/40 text-xs text-center mt-2">{challengeMsg}</p>
                          )}
                          <p className="text-white/20 text-xs text-center mt-1">Requires 3+ duels</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 text-white/30">
                  <div className="text-5xl mb-3">👑</div>
                  <p className="font-bold text-white/50">No champion yet</p>
                  <p className="text-sm mt-1">Win duels to claim the throne</p>
                </div>
              )}
            </div>
          )}

          {/* ── TOP SCORES TAB — Duel Cards ── */}
          {activeTab === 'top_scores' && (
            <div className="px-4 space-y-4">
              {topDuels.length === 0 ? (
                <div className="text-center py-24 text-white/30">
                  <p className="font-bold text-white/50">No scored duels yet</p>
                </div>
              ) : topDuels.map((duel, i) => (
                <div key={duel.id} className="rounded-2xl overflow-hidden border border-white/10 bg-neutral-950">
                  {/* Rank Badge */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getRankIcon(i + 1)}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          {duel.avatarUrl ? (
                            <img src={duel.avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-white/40 text-xs font-bold">
                              {duel.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-white/60 text-sm font-semibold">{duel.username}</span>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-black text-lg">{duel.topScore} pts</span>
                  </div>

                  {/* Photo Side by Side */}
                  <div className="grid grid-cols-2 gap-0.5 mx-4 rounded-xl overflow-hidden">
                    <div className="relative aspect-[3/4] bg-neutral-900">
                      {duel.previewA ? (
                        <img src={duel.previewA} className="w-full h-full object-cover" alt="A" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/10 font-black text-4xl">A</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className={`font-black text-xl ${duel.winner === 'A' ? 'text-yellow-400' : 'text-white/40'}`}>
                          {duel.scoreA}
                          {duel.winner === 'A' && <span className="text-xs ml-1">👑</span>}
                        </div>
                      </div>
                    </div>
                    <div className="relative aspect-[3/4] bg-neutral-900">
                      {duel.previewB ? (
                        <img src={duel.previewB} className="w-full h-full object-cover" alt="B" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/10 font-black text-4xl">B</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className={`font-black text-xl ${duel.winner === 'B' ? 'text-yellow-400' : 'text-white/40'}`}>
                          {duel.scoreB}
                          {duel.winner === 'B' && <span className="text-xs ml-1">👑</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {duel.summary && (
                    <p className="px-4 py-3 text-white/40 text-xs italic">"{duel.summary}"</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MOST WINS + THIS WEEK TABS ── */}
          {(activeTab === 'most_wins' || activeTab === 'this_week') && (
            <div className="px-4 space-y-2">
              {entries.length === 0 ? (
                <div className="text-center py-24 text-white/30">
                  <p className="font-bold text-white/50">No data yet</p>
                  <p className="text-sm mt-1">Run some duels to get on the board</p>
                </div>
              ) : entries.map((entry) => (
                <div key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    entry.rank <= 3 ? 'border-white/15 bg-white/5' : 'border-white/5 bg-white/[0.02]'
                  }`}>
                  <div className="w-8 text-center flex-shrink-0 font-black text-base">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-white/40 font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{entry.username}</div>
                    <div className="text-white/30 text-xs mt-0.5">
                      {activeTab === 'most_wins'
                        ? `${entry.totalDuels} duels · ${entry.winRate}% win rate`
                        : `${entry.totalDuels} duels this week`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-2xl text-yellow-400">{entry.totalWins}</div>
                    <div className="text-white/30 text-xs">wins</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
