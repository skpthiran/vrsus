import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DuelCard } from '../components/DuelCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { getBatchVoteCounts, castVote } from '../lib/votes';
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

const PAGE_SIZE = 6;

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

  // Champion state
  const [champion, setChampion] = useState<ChampionData | null>(null);
  const [championLoading, setChampionLoading] = useState(true);
  const [challengeMsg, setChallengeMsg] = useState<string | null>(null);

  // Top Scores — duel cards with infinite scroll
  const [topDuels, setTopDuels] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topHasMore, setTopHasMore] = useState(true);
  const [topLoadingMore, setTopLoadingMore] = useState(false);
  const topPageRef = useRef(0);
  const allTopDuelsRef = useRef<TopDuel[]>([]);
  const [votes, setVotes] = useState<Record<string, { a: number; b: number; userPick: 'A' | 'B' | null }>>({});

  // Most Wins / This Week — list entries
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Load champion
  useEffect(() => {
    if (activeTab !== 'champion') return;
    setChampionLoading(true);
    getCurrentChampion().then(data => {
      setChampion(data);
      setChampionLoading(false);
    });
  }, [activeTab]);

  // Load top scores with infinite scroll
  const loadMoreTopScores = useCallback(async () => {
    if (topLoadingMore || !topHasMore) return;
    setTopLoadingMore(true);
    const page = topPageRef.current;
    
    // Artificial delay to show loader
    await new Promise(resolve => setTimeout(resolve, 500));

    const nextBatch = allTopDuelsRef.current.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    
    if (nextBatch.length === 0) {
      setTopHasMore(false);
      setTopLoadingMore(false);
      return;
    }

    const mapped = nextBatch.map((d, i) => ({
      id: d.id,
      previewA: d.previewA,
      previewB: d.previewB,
      scoreA: d.scoreA,
      scoreB: d.scoreB,
      winner: d.winner,
      summary: d.summary,
      mode: 'General',
      isOwn: false,
      createdAt: d.createdAt,
      _rank: (page * PAGE_SIZE) + i + 1,
      _username: d.username,
      _topScore: d.topScore,
    }));

    if (mapped.length < PAGE_SIZE) setTopHasMore(false);
    
    setTopDuels(prev => [...prev, ...mapped]);
    const voteMap = await getBatchVoteCounts(mapped.map(d => d.id));
    setVotes(prev => ({ ...prev, ...voteMap }));
    topPageRef.current += 1;
    setTopLoadingMore(false);
  }, [topLoadingMore, topHasMore]);

  // Initial load for top scores
  useEffect(() => {
    if (activeTab !== 'top_scores') return;
    topPageRef.current = 0;
    setTopDuels([]);
    setTopHasMore(true);
    setTopLoading(true);
    getTopScores(100).then(async all => {
      allTopDuelsRef.current = all;
      const firstBatch = all.slice(0, PAGE_SIZE);
      const first = firstBatch.map((d, i) => ({
        id: d.id,
        previewA: d.previewA,
        previewB: d.previewB,
        scoreA: d.scoreA,
        scoreB: d.scoreB,
        winner: d.winner,
        summary: d.summary,
        mode: 'General',
        isOwn: false,
        createdAt: d.createdAt,
        _rank: i + 1,
        _username: d.username,
        _topScore: d.topScore,
      }));
      
      if (all.length <= PAGE_SIZE) setTopHasMore(false);
      setTopDuels(first);
      topPageRef.current = 1;
      const voteMap = await getBatchVoteCounts(first.map(d => d.id));
      setVotes(voteMap);
      setTopLoading(false);
    });
  }, [activeTab]);

  const topSentinelRef = useInfiniteScroll(loadMoreTopScores, topHasMore);

  // Load list tabs
  useEffect(() => {
    if (activeTab !== 'most_wins' && activeTab !== 'this_week') return;
    setListLoading(true);
    const fn = activeTab === 'most_wins' ? getMostWins : getThisWeek;
    fn(20).then(data => {
      setEntries(data);
      setListLoading(false);
    });
  }, [activeTab]);

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

  const SkeletonCard = () => (
    <div className="aspect-[4/3] rounded-[2rem] bg-surface border border-border animate-pulse flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-white/20 animate-spin" />
    </div>
  );

  return (
    <div className="pb-24 pt-4 px-4 bg-background min-h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-black mb-1">LEADERBOARD</h1>
        <p className="text-neutral-500 font-medium">Who's running the game</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full whitespace-nowrap transition-all font-bold text-sm ${
              activeTab === tab.id
                ? 'bg-accent text-white shadow-[0_4px_12px_rgba(255,255,255,0.15)]'
                : 'bg-surface border border-border text-neutral-400 hover:border-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CHAMPION TAB ── */}
      {activeTab === 'champion' && (
        <div className="space-y-4">
          {championLoading ? (
            <div className="rounded-[2rem] bg-surface border border-border animate-pulse h-96" />
          ) : champion ? (
            <div className="rounded-[2rem] overflow-hidden border border-border bg-surface">
              {/* Hero Photo */}
              <div className="relative h-72 bg-neutral-900">
                {champion.bestPhoto ? (
                  <img
                    src={champion.bestPhoto}
                    className="w-full h-full object-cover object-top"
                    alt="Champion"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/5 font-black text-9xl">👑</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1.5 rounded-full">
                    👑 REIGNING CHAMPION
                  </span>
                </div>
                {champion.defenses > 0 && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-black/60 backdrop-blur-sm text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-400/30">
                      🛡️ {champion.defenses} defenses
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {champion.avatarUrl ? (
                      <img src={champion.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-yellow-400 font-black">
                        {champion.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-white">{champion.username}</h2>
                    <p className="text-neutral-500 text-xs">
                      Champion since {new Date(champion.crownedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: 'Peak Score', value: champion.bestScore, gold: true },
                    { label: 'Total Wins', value: champion.totalWins, gold: false },
                    { label: 'Defenses', value: champion.defenses, gold: false },
                  ].map(stat => (
                    <div key={stat.label} className="bg-background rounded-2xl p-3 text-center border border-border">
                      <div className={`font-black text-2xl ${stat.gold ? 'text-yellow-400' : 'text-white'}`}>
                        {stat.value}
                      </div>
                      <div className="text-neutral-500 text-xs mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {!user && (
                  <button onClick={() => navigate('/auth')}
                    className="w-full bg-surface border border-border text-white font-bold py-3 rounded-2xl text-sm hover:border-white/30 transition-colors">
                    Sign in to Challenge
                  </button>
                )}
                {user && user.id === champion.userId && (
                  <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-3 text-center">
                    <p className="text-yellow-400 font-bold text-sm">👑 You hold the crown. Defend it.</p>
                  </div>
                )}
                {user && user.id !== champion.userId && (
                  <div>
                    <button onClick={handleChallenge}
                      className="w-full bg-accent text-white font-black py-3.5 rounded-2xl hover:opacity-90 transition-opacity">
                      ⚔️ CHALLENGE CHAMPION
                    </button>
                    {challengeMsg && (
                      <p className="text-neutral-500 text-xs text-center mt-2">{challengeMsg}</p>
                    )}
                    <p className="text-neutral-600 text-xs text-center mt-1">Requires 3+ duels</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-surface rounded-[2rem] border border-dashed border-neutral-800">
              <Trophy className="mx-auto text-neutral-700 mb-4" size={48} />
              <p className="text-neutral-500 font-bold">No champion yet</p>
              <p className="text-neutral-600 text-sm mt-1">Win duels to claim the throne</p>
            </div>
          )}
        </div>
      )}

      {/* ── TOP SCORES TAB — DuelCards ── */}
      {activeTab === 'top_scores' && (
        <div className="space-y-8">
          {topLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : topDuels.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-[2rem] border border-dashed border-neutral-800">
              <Trophy className="mx-auto text-neutral-700 mb-4" size={48} />
              <p className="text-neutral-500 font-bold">No scored duels yet</p>
            </div>
          ) : (
            <>
              {topDuels.map((duel, i) => (
                <div key={duel.id} className="relative">
                  {/* Rank badge */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-lg">{getRankIcon(duel._rank)}</span>
                    <span className="text-neutral-500 text-sm font-bold">
                      {duel._username || 'Anonymous'}
                    </span>
                    <span className="ml-auto text-yellow-400 font-black text-sm">
                      {duel._topScore || Math.max(duel.scoreA, duel.scoreB)} pts
                    </span>
                  </div>
                  <DuelCard
                    duel={duel}
                    onCardClick={() => navigate(`/results/${duel.id}`)}
                    showReactions={false}
                    showVoting={true}
                    voteCounts={votes[duel.id]}
                    onVote={async (pick) => {
                      setVotes(prev => ({
                        ...prev,
                        [duel.id]: {
                          ...prev[duel.id],
                          userPick: pick,
                          a: pick === 'A' ? (prev[duel.id]?.a ?? 0) + 1 : (prev[duel.id]?.a ?? 0),
                          b: pick === 'B' ? (prev[duel.id]?.b ?? 0) + 1 : (prev[duel.id]?.b ?? 0),
                        }
                      }));
                      await castVote(duel.id, pick);
                    }}
                  />
                </div>
              ))}
              <div ref={topSentinelRef} className="h-4" />
              {topLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MOST WINS + THIS WEEK ── */}
      {(activeTab === 'most_wins' || activeTab === 'this_week') && (
        <div className="space-y-3">
          {listLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface border border-border animate-pulse" />
            ))
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-[2rem] border border-dashed border-neutral-800">
              <Trophy className="mx-auto text-neutral-700 mb-4" size={48} />
              <p className="text-neutral-500 font-bold">No data yet</p>
              <p className="text-neutral-600 text-sm mt-1">Run some duels to get on the board</p>
            </div>
          ) : entries.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-colors hover:border-white/20 ${
                entry.rank <= 3
                  ? 'bg-surface border-white/15'
                  : 'bg-surface border-border'
              }`}
            >
              <span className="font-display font-black text-2xl text-white/30 w-10 text-center flex-shrink-0">
                {getRankIcon(entry.rank)}
              </span>
              <div className="w-10 h-10 rounded-full bg-white/5 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-neutral-500 font-bold text-sm">
                    {entry.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{entry.username}</p>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {activeTab === 'most_wins'
                    ? `${entry.totalDuels} duels · ${entry.winRate}% win rate`
                    : `${entry.totalDuels} duels this week`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-black text-2xl text-white">{entry.totalWins}</p>
                <p className="text-neutral-600 text-xs">wins</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
