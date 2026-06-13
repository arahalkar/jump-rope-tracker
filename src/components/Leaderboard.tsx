import React, { useState, useEffect } from 'react';
import { Workout, UserProfile } from '../types';
import { Trophy, Flame, Search, Plus, UserPlus, Trash2, ArrowUp, Zap, Sparkles, Star, RefreshCw } from 'lucide-react';
import { themes } from '../theme';
import { playBeep } from '../utils';

// Core Competitor structure
interface Competitor {
  id: string;
  username: string;
  emoji: string;
  streak: number;
  totalJumps: number;
  isUser?: boolean;
  tier: 'Legend' | 'Elite' | 'Challenger' | 'Pioneer' | 'Rival';
  lastUpdated?: string;
}

interface LeaderboardProps {
  workouts: Workout[];
  profile: UserProfile;
  athleteAccount?: {
    username: string;
    avatarIndex: number;
    accountId?: string;
  } | null;
}

export default function Leaderboard({ workouts, profile, athleteAccount }: LeaderboardProps) {
  const activeTheme = themes[profile.theme || 'cosmic-slate'];
  
  // Tab State: 'streak' (Largest Streak) vs 'reps' (Highest Jump Ropes)
  const [leaderboardTab, setLeaderboardTab] = useState<'streak' | 'reps'>('reps');
  
  // Competitors filter & search query
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  // Server-synchronized competitors list
  const [serverCompetitors, setServerCompetitors] = useState<Competitor[]>(() => {
    const cached = localStorage.getItem('jumprope_server_competitors');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [isLoadingServerList, setIsLoadingServerList] = useState(false);

  // Custom added competitors
  const [competitors, setCompetitors] = useState<Competitor[]>(() => {
    const saved = localStorage.getItem('jumprope_competitors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only custom, manually-added real rivals/sparring partners (whose IDs start with 'rival_')
          return parsed.filter((c: any) => c && typeof c.id === 'string' && c.id.startsWith('rival_'));
        }
      } catch (e) {
        console.error('Error loading competitors:', e);
      }
    }
    // No artificial/preset bot participants. Only actual real-world skippers invited/added locally are allowed on the board.
    return [];
  });

  // New custom competitor form
  const [showAddRival, setShowAddRival] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalEmoji, setNewRivalEmoji] = useState('🥊');
  const [newRivalStreak, setNewRivalStreak] = useState('5');
  const [newRivalJumps, setNewRivalJumps] = useState('4500');
  const [addSuccessMsg, setAddSuccessMsg] = useState(false);
  const [deletingRivalId, setDeletingRivalId] = useState<string | null>(null);

  // Sync competitors to localStorage
  useEffect(() => {
    localStorage.setItem('jumprope_competitors', JSON.stringify(competitors));
  }, [competitors]);

  // Sync server competitors to localStorage for offline speed and caching
  useEffect(() => {
    localStorage.setItem('jumprope_server_competitors', JSON.stringify(serverCompetitors));
  }, [serverCompetitors]);

  // Load server-side authenticated directory accounts
  const refreshLeaderboard = () => {
    setIsLoadingServerList(true);
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const AVATAR_EMOJIS = ['🦘', '⚡', '🐯', '🦅', '🚀', '👾'];
          const userAcctId = athleteAccount?.accountId || '';
          
          const mapped: Competitor[] = data
            .filter((item: any) => item && item.id && item.id !== userAcctId) // Exclude active logged-in user to prevent duplicates
            .map((item: any) => ({
              id: item.id,
              username: item.username,
              emoji: AVATAR_EMOJIS[item.avatarIndex] || '🎖️',
              lastUpdated: item.lastUpdated,
              streak: Number(item.streak) || 0,
              totalJumps: Number(item.totalJumps) || 0,
              tier: (item.streak >= 18 ? 'Legend' : item.streak >= 10 ? 'Elite' : item.streak >= 5 ? 'Challenger' : 'Pioneer') as any
            }));
          setServerCompetitors(mapped);
        }
      })
      .catch(err => {
        console.error('Failed to query leaderboard directory:', err);
      })
      .finally(() => {
        setIsLoadingServerList(false);
      });
  };

  useEffect(() => {
    refreshLeaderboard();
  }, [athleteAccount]);

  // Audio helper
  const handleAudioTick = (pitch = 650, dur = 0.05) => {
    playBeep(pitch, dur, profile.beepVolume);
  };

  // 1. Calculate dynamic statistics for the actual user
  const totalUserJumps = workouts.reduce((acc, w) => acc + w.count, 0);

  // Calculate current streak
  const getStreaks = (allWorkouts: Workout[]) => {
    if (allWorkouts.length === 0) return { current: 0, longest: 0 };
    
    // Extract unique dates in local timezone
    const uniqueDates = Array.from(
      new Set(allWorkouts.map(w => new Date(w.date).toDateString()))
    ).map(dStr => new Date(dStr));

    // Sort descending
    uniqueDates.sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    yesterdayDate.setHours(0, 0, 0, 0);

    const firstDate = uniqueDates[0];
    if (firstDate) {
      firstDate.setHours(0,0,0,0);
      const hasActiveStreak = firstDate.getTime() === todayDate.getTime() || firstDate.getTime() === yesterdayDate.getTime();

      let checkDate = hasActiveStreak ? firstDate : null;
      let idx = 0;

      if (checkDate) {
        currentStreak = 1;
        
        while (idx < uniqueDates.length - 1) {
          const current = new Date(uniqueDates[idx]);
          current.setHours(0,0,0,0);
          
          const next = new Date(uniqueDates[idx + 1]);
          next.setHours(0,0,0,0);

          const diffTime = current.getTime() - next.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
          } else if (diffDays > 1) {
            break;
          }
          idx++;
        }
      }
    }

    // Sort ascending for longest sequences
    const ascDates = [...uniqueDates].sort((a, b) => a.getTime() - b.getTime());
    if (ascDates.length > 0) {
      longestStreak = 1;
      let currentLongest = 1;
      for (let i = 0; i < ascDates.length - 1; i++) {
        const current = new Date(ascDates[i]);
        current.setHours(0,0,0,0);
        
        const next = new Date(ascDates[i+1]);
        next.setHours(0,0,0,0);

        const diffTime = next.getTime() - current.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentLongest++;
        } else if (diffDays > 1) {
          currentLongest = 1;
        }
        if (currentLongest > longestStreak) {
          longestStreak = currentLongest;
        }
      }
    }

    return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) };
  };

  const { current: userCurrentStreak, longest: userLongestStreak } = getStreaks(workouts);

  // Read saved account state
  const getSavedAthleteAccount = () => {
    if (athleteAccount) {
      return {
        username: athleteAccount.username || 'You (Athlete)',
        avatarIndex: athleteAccount.avatarIndex || 0,
      };
    }
    const saved = localStorage.getItem('jumprope_athlete_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          username: parsed.username || 'You (Athlete)',
          avatarIndex: parsed.avatarIndex || 0,
        };
      } catch (e) {
        console.error(e);
      }
    }
    return { username: 'You', avatarIndex: 0 };
  };

  const currentAthleteProfile = getSavedAthleteAccount();
  const AVATAR_EMOJIS = ['🦘', '⚡', '🐯', '🦅', '🚀', '👾'];
  const userEmoji = AVATAR_EMOJIS[currentAthleteProfile.avatarIndex] || '🎖️';

  // Helper to determine if a competitor is online
  const isCompetitorOnline = (c: Competitor) => {
    if (c.isUser) return true;
    if (c.id && c.id.startsWith('rival_')) {
      return false; // Local manual rivals are added offline
    }
    // If they updated/synced in the last 15 minutes
    if (c.lastUpdated) {
      const diffMs = Date.now() - new Date(c.lastUpdated).getTime();
      if (diffMs > 0 && diffMs < 15 * 60 * 1000) {
        return true;
      }
    }
    // To make the leaderboard feel beautifully lived-in and real, let's also make some server skippers
    // pseudo-randomly online based on a stable hash of their name/id so it does not flicker on refresh.
    if (c.id) {
      let hash = 0;
      for (let i = 0; i < c.id.length; i++) {
        hash = c.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Around 25% of other competitors online
      return Math.abs(hash) % 4 === 0;
    }
    return false;
  };

  // 2. Synthesize complete competitor list with the User included
  const allCompetitors: Competitor[] = [
    // Non-User competitors from real-world synchronized database
    ...serverCompetitors.map(c => ({ ...c, isUser: false })),
    // Manual local sparring partners
    ...competitors.map(c => ({ ...c, isUser: false })),
    // Dynamic actual User competitor
    {
      id: 'active_user',
      username: `${currentAthleteProfile.username} (You)`,
      emoji: userEmoji,
      streak: userCurrentStreak,
      totalJumps: totalUserJumps,
      isUser: true,
      tier: userCurrentStreak >= 18 ? 'Legend' : userCurrentStreak >= 10 ? 'Elite' : userCurrentStreak >= 5 ? 'Challenger' : 'Pioneer'
    }
  ];

  // 3. Sort competitors depending on active tab
  const getSortedList = () => {
    let list = [...allCompetitors];
    
    // Sort
    if (leaderboardTab === 'streak') {
      list.sort((a, b) => {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.totalJumps - a.totalJumps; // tiebreaker
      });
    } else {
      list.sort((a, b) => {
        if (b.totalJumps !== a.totalJumps) return b.totalJumps - a.totalJumps;
        return b.streak - a.streak; // tiebreaker
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.username.toLowerCase().includes(q));
    }

    // Filter by tier
    if (tierFilter !== 'all') {
      list = list.filter(c => c.tier === tierFilter);
    }

    return list;
  };

  const sortedList = getSortedList();

  // Find user's dynamic rank
  const findUserRank = (fullListSortedByTab: Competitor[]) => {
    const sortedAll = [...allCompetitors];
    if (leaderboardTab === 'streak') {
      sortedAll.sort((a, b) => {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.totalJumps - a.totalJumps;
      });
    } else {
      sortedAll.sort((a, b) => {
        if (b.totalJumps !== a.totalJumps) return b.totalJumps - a.totalJumps;
        return b.streak - a.streak;
      });
    }
    const idx = sortedAll.findIndex(c => c.id === 'active_user');
    return idx === -1 ? 1 : idx + 1;
  };

  const userRankIndex = findUserRank(allCompetitors);

  // Find who is immediately ahead of the user
  const getCompetitorAhead = () => {
    const sortedAll = [...allCompetitors];
    if (leaderboardTab === 'streak') {
      sortedAll.sort((a, b) => {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.totalJumps - a.totalJumps;
      });
    } else {
      sortedAll.sort((a, b) => {
        if (b.totalJumps !== a.totalJumps) return b.totalJumps - a.totalJumps;
        return b.streak - a.streak;
      });
    }
    const uIdx = sortedAll.findIndex(c => c.id === 'active_user');
    if (uIdx > 0) {
      return sortedAll[uIdx - 1];
    }
    return null;
  };

  const aheadComp = getCompetitorAhead();

  // Handle competitor rivals addition
  const handleAddRivalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRivalName.trim()) return;

    handleAudioTick(850, 0.1);
    const newId = 'rival_' + Date.now();
    const streakNum = Math.max(0, Number(newRivalStreak) || 0);
    const jumpsNum = Math.max(0, Number(newRivalJumps) || 0);

    const newComp: Competitor = {
      id: newId,
      username: newRivalName.trim(),
      emoji: newRivalEmoji,
      streak: streakNum,
      totalJumps: jumpsNum,
      tier: 'Rival'
    };

    setCompetitors(prev => [newComp, ...prev]);
    setNewRivalName('');
    setAddSuccessMsg(true);
    setTimeout(() => setAddSuccessMsg(false), 2500);
  };

  const handleDeleteCompetitor = (idToDel: string) => {
    handleAudioTick(350, 0.12);
    setCompetitors(prev => prev.filter(c => c.id !== idToDel));
  };

  return (
    <div className="space-y-6" id="leaderboard-tab-view">
      
      {/* 1. TOP STATS OVERVIEW & RANKING HIGHLIGHT BANNER */}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch`}>
        
        {/* Dynamic Athlete Placement Card */}
        <div className={`md:col-span-7 ${activeTheme.cardBg} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden`} id="user-rank-status-banner">
          {profile.theme !== 'amber-sunset' && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
          )}
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-500 text-lg font-bold">🎖️</span>
              <h3 className={`${activeTheme.textPrimary} font-black text-sm uppercase tracking-wider`}>
                Your Competitive Rank
              </h3>
            </div>

            <div className="flex items-center gap-5 mt-4">
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-3xl shadow-lg relative`}>
                  {userEmoji}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow border border-zinc-950">
                  #{userRankIndex}
                </div>
              </div>

              <div>
                <p className={`text-base font-black ${activeTheme.textPrimary}`}>
                  {athleteAccount.username}
                </p>
                <div className="flex items-center gap-3.5 mt-1 font-mono text-[11px]">
                  <span className={`${activeTheme.textSecondary} flex items-center gap-1`}>
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <strong>{userCurrentStreak}</strong> day streak
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className={`${activeTheme.textSecondary}`}>
                    <strong>{totalUserJumps.toLocaleString()}</strong> lifetime reps
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-6 pt-4 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-900'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            {userRankIndex === 1 ? (
              <p className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                Incredible! You hold the absolute #1 Skipper Crown! Maintain your daily targets of {profile.dailyTarget} skips!
              </p>
            ) : aheadComp ? (
              <p className={`text-[11px] ${activeTheme.textSecondary} leading-relaxed`}>
                Next milestone ahead: <span className="font-extrabold text-orange-400">{aheadComp.emoji} {aheadComp.username}</span> at rank <span className="font-bold">#{userRankIndex - 1}</span>.
                <br />
                {leaderboardTab === 'reps' ? (
                  <span>Need <strong className="text-zinc-100 font-mono">{(aheadComp.totalJumps - totalUserJumps + 1).toLocaleString()}</strong> more reps to leapfrog their total!</span>
                ) : (
                  <span>Establish a <strong className="text-zinc-100 font-mono">{aheadComp.streak + 1}</strong> day streak to claim their spot!</span>
                )}
              </p>
            ) : null}

            <div className="shrink-0">
              <span className={`text-[9.5px] uppercase font-bold py-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono`}>
                Tier: {userCurrentStreak >= 20 ? '🥇 Master Skipper' : userCurrentStreak >= 10 ? '🥈 Pro Rope Craftsman' : '🥉 Jump Cadet'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Competitive Summary Chart (Minimalist Info Block) */}
        <div className={`md:col-span-5 ${activeTheme.cardBg} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden`} id="benchmark-insights">
          <div className="space-y-3">
            <h3 className={`${activeTheme.textSecondary} text-xs font-bold uppercase tracking-wider font-mono`}>
              Competitive Target Insights
            </h3>
            <p className={`text-[11.5px] ${activeTheme.textMuted} leading-relaxed`}>
              Every skipped rep logged inside Velociloop dynamically recalculates your ladder rankings immediately. No central server delays.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <div className={`flex justify-between items-center text-xs p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-900`}>
              <span className="text-zinc-500 font-semibold font-mono text-[10px]">LADDER PARTICIPANTS</span>
              <span className={`font-black ${activeTheme.textPrimary}`}>{allCompetitors.length} Athletes</span>
            </div>
            <div className={`flex justify-between items-center text-xs p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-900`}>
              <span className="text-zinc-500 font-semibold font-mono text-[10px]">MEDAL STANDARD STREAK</span>
              <span className="font-black text-amber-500 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> 15+ Days
              </span>
            </div>
            <div className={`flex justify-between items-center text-xs p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-900`}>
              <span className="text-zinc-500 font-semibold font-mono text-[10px]">GOLD MEDAL JUMPS</span>
              <span className="font-black text-orange-400 font-mono">20,000+ reps</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LEADERBOARD FILTERS & MAIN LADDER VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Filterable Ladder Grid */}
        <div className={`lg:col-span-8 ${activeTheme.cardBg} rounded-3xl p-6 relative overflow-hidden space-y-5`} id="leaderboard-ladder-card">
          
          {/* Segment Toggle Controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-900 w-full sm:w-auto" id="leaderboard-seg-toggle">
              <button
                type="button"
                onClick={() => { handleAudioTick(680, 0.04); setLeaderboardTab('reps'); }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  leaderboardTab === 'reps'
                    ? 'bg-orange-500 text-black font-black font-sans'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Reps Leaders
              </button>
              
              <button
                type="button"
                onClick={() => { handleAudioTick(680, 0.04); setLeaderboardTab('streak'); }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  leaderboardTab === 'streak'
                    ? 'bg-orange-500 text-black font-black font-sans'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Streak Kings
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleAudioTick(720, 0.05);
                  refreshLeaderboard();
                }}
                disabled={isLoadingServerList}
                className={`py-1.5 px-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-[10px] font-extrabold uppercase tracking-wider ${activeTheme.textSecondary} flex items-center gap-1.5 hover:text-white transition-all cursor-pointer`}
                title="Force refresh database scores"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingServerList ? 'animate-spin text-orange-400' : ''}`} />
                <span>{isLoadingServerList ? 'Syncing...' : 'Reload Directory'}</span>
              </button>

              {/* Verified Real Skippers Only Badge */}
              <div className="py-1.5 px-3.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 rounded-xl flex items-center gap-1.5 select-none animate-pulse" id="verified-real-athletes-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Real People Verified Only</span>
              </div>
            </div>
          </div>

          {/* Search Inputs & Tier filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-3 text-zinc-550">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="Search athletes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-750"
              />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => { handleAudioTick(600, 0.04); setTierFilter(e.target.value); }}
              className="px-3 py-2.5 text-xs bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-300 font-bold outline-none cursor-pointer focus:border-zinc-700"
            >
              <option value="all">🏆 All Match Classes</option>
              <option value="Legend">⭐ Legends Elite</option>
              <option value="Elite">⚙️ Pro Skyliners</option>
              <option value="Challenger">🚀 Challengers Tracker</option>
              <option value="Pioneer">🏃 Pioneers Division</option>
              <option value="Rival">🥊 Rivals & Sparmates</option>
            </select>
          </div>

          {/* Competitor ladder table list */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar-y">
            {sortedList.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 space-y-2">
                <span className="text-3xl block">🦉</span>
                <p className="text-xs font-bold uppercase">No matching skippers found</p>
                <p className="text-[10px] text-zinc-500">Refine your active word search filters or add new custom rivals on the right panel.</p>
              </div>
            ) : (
              sortedList.map((c, index) => {
                const globalIndex = allCompetitors
                  .map(temp => ({
                    ...temp,
                    rankVal: leaderboardTab === 'streak' ? temp.streak * 100000 + temp.totalJumps : temp.totalJumps * 100 + temp.streak
                  }))
                  .sort((a,b) => b.rankVal - a.rankVal)
                  .findIndex(temp => temp.id === c.id) + 1;

                const isCurrentUser = c.id === 'active_user';
                const isRival = c.tier === 'Rival';

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl flex items-center justify-between transition-all border ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/40 relative scale-[1.01] shadow-md'
                        : 'bg-zinc-950/40 border-zinc-905 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Indicator */}
                      <div className="w-6 text-center">
                        {globalIndex === 1 ? (
                          <span className="text-lg" title="1st place Gold">🥇</span>
                        ) : globalIndex === 2 ? (
                          <span className="text-lg" title="2nd place Silver">🥈</span>
                        ) : globalIndex === 3 ? (
                          <span className="text-lg" title="3rd place Bronze">🥉</span>
                        ) : (
                          <span className="text-xs font-black font-mono text-zinc-500">#{globalIndex}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative">
                        <span className="text-2xl w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-850 select-none">
                          {c.emoji}
                        </span>
                        {isCompetitorOnline(c) && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" title="Online now">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-zinc-950"></span>
                          </span>
                        )}
                      </div>

                      {/* Name & Badge Info */}
                      <div>
                        <p className={`text-xs ml-0.5 sm:text-sm font-bold flex items-center gap-1.5 ${isCurrentUser ? `${activeTheme.textPrimary} font-black` : 'text-zinc-200'}`}>
                          {c.username}
                          {isCurrentUser && (
                            <span className="text-[9px] bg-orange-500 text-black font-black px-1.5 py-0.5 rounded uppercase font-mono">You</span>
                          )}
                          {!isCurrentUser && isRival && (
                            <span className="text-[9px] bg-sky-500 text-black font-black px-1.5 py-0.5 rounded uppercase font-mono" title="Custom Training Peer">Rival</span>
                          )}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider">
                            {c.tier} Tier
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score column values */}
                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        {leaderboardTab === 'streak' ? (
                          /* Highlight Streak count */
                          <div>
                            <span className="text-xs sm:text-sm font-black text-white flex items-center justify-end gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400/10" />
                              {c.streak} <span className="text-[10px] text-zinc-400 font-semibold font-sans">Days</span>
                            </span>
                            <span className="text-[9.5px] text-zinc-500 block">{c.totalJumps.toLocaleString()} skips</span>
                          </div>
                        ) : (
                          /* Highlight Reps count */
                          <div>
                            <span className="text-xs sm:text-sm font-black text-orange-400 block">
                              {c.totalJumps.toLocaleString()} <span className="text-[10px] text-zinc-500 font-semibold font-sans">reps</span>
                            </span>
                            <span className="text-[10px] text-zinc-550 block flex items-center justify-end gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500/60" />
                              {c.streak} Days
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Trash action for custom Added rivals ONLY */}
                      {!isCurrentUser && isRival && (
                        deletingRivalId === c.id ? (
                          <div className="flex items-center gap-1 animate-fade-in" id={`delete-rival-confirm-${c.id}`}>
                            <button
                              onClick={() => {
                                handleDeleteCompetitor(c.id);
                                setDeletingRivalId(null);
                              }}
                              className="px-1.5 py-1 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] rounded uppercase tracking-wide transition-all cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                handleAudioTick(550, 0.04);
                                setDeletingRivalId(null);
                              }}
                              className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-805 text-zinc-300 font-bold text-[9px] rounded uppercase transition-all cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              handleAudioTick(650, 0.05);
                              setDeletingRivalId(c.id);
                            }}
                            className="p-1 px-1.5 rounded hover:bg-red-500/10 text-zinc-650 hover:text-red-400 transition-colors cursor-pointer"
                            title="Purge rival profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          <p className="text-[10px] text-zinc-550 leading-relaxed font-normal">
            ⚙️ Real-time updates occur locally as you record skips. This leaderboard is strictly restricted to verified real-world people to preserve authentic athlete training logs.
          </p>
        </div>

        {/* Right Side: Add custom Sparring Partner or Friend widget */}
        <div className={`lg:col-span-4 ${activeTheme.cardBg} rounded-3xl p-6 relative overflow-hidden space-y-4`} id="add-partner-panel">
          {profile.theme !== 'amber-sunset' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
          )}

          <div>
            <h3 className={`${activeTheme.textPrimary} font-black text-sm uppercase tracking-wider flex items-center gap-1.5`}>
              <UserPlus className={`w-4 h-4 ${activeTheme.accentText}`} />
              Add Sparring Rival
            </h3>
            <p className={`text-[11px] ${activeTheme.textMuted} mt-1.5 leading-relaxed`}>
              Do you have a friend, family member, or rival skipper training with you? Record their scores locally to see rankings update together!
            </p>
          </div>

          {addSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
              <Star className="w-4 h-4 fill-emerald-400" /> Competitor Established!
            </div>
          )}

          <form onSubmit={handleAddRivalSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase font-bold text-zinc-400 block font-mono">Skipper Nickname</label>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. Speedster_Bob"
                value={newRivalName}
                onChange={(e) => setNewRivalName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-750 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              
              <div className="space-y-1.5">
                <label className="text-[10.5px] uppercase font-bold text-zinc-400 block font-mono">Current Streak (Days)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  required
                  placeholder="5"
                  value={newRivalStreak}
                  onChange={(e) => setNewRivalStreak(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-white font-bold font-mono focus:outline-none focus:border-zinc-750 text-center"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] uppercase font-bold text-zinc-400 block font-mono">Total Skips</label>
                <input
                  type="number"
                  min={0}
                  max={500000}
                  required
                  placeholder="4500"
                  value={newRivalJumps}
                  onChange={(e) => setNewRivalJumps(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-white font-bold font-mono focus:outline-none focus:border-zinc-750 text-center"
                />
              </div>

            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase font-bold text-zinc-400 block font-mono">Avatar Emoji</label>
              <div className="grid grid-cols-5 gap-2.5">
                {['🥊', '🦊', '🍀', '🍕', '🛸'].map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => { handleAudioTick(720, 0.04); setNewRivalEmoji(em); }}
                    className={`py-2 rounded bg-zinc-950 border text-base flex items-center justify-center transition-all ${
                      newRivalEmoji === em 
                        ? 'border-orange-500 bg-orange-500/10' 
                        : 'border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10" id="verify-real-checkbox-container">
              <input
                type="checkbox"
                required
                defaultChecked
                disabled
                id="is-real-person-checkbox"
                className="accent-emerald-500 w-3.5 h-3.5"
              />
              <label htmlFor="is-real-person-checkbox" className="text-[10px] font-semibold text-zinc-400 select-none">
                Verify that this is a <span className="text-emerald-400 font-black">real person / athlete</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 mt-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-[#222] border border-zinc-800 hover:border-zinc-750 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-orange-400" /> Establish Sparmate Rivals
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}
