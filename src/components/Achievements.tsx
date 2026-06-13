/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Workout, UserProfile } from '../types';
import { VisualTheme } from '../theme';
import { 
  Award, 
  Zap, 
  Clock, 
  Flame, 
  Shield, 
  Calendar, 
  Sparkles, 
  Activity, 
  Trophy, 
  Lock, 
  CheckCircle2, 
  Search,
  BookOpen,
  TrendingUp,
  FlameKindling
} from 'lucide-react';

interface AchievementsProps {
  workouts: Workout[];
  profile: UserProfile;
  activeTheme: VisualTheme;
}

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  check: (workouts: Workout[]) => boolean;
  getProgress: (workouts: Workout[]) => { current: number; target: number; percentage: number };
  details: string;
  tips: string;
}

// Accurate helper function to calculate the maximum consecutive days streak
function getMaxStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  // Extract unique active dates in YYYY-MM-DD format, sorted chronologically
  const activeDates = Array.from(new Set(workouts.map(w => w.date.split('T')[0]))).sort();
  if (activeDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < activeDates.length; i++) {
    const prevDate = new Date(activeDates[i - 1]);
    const currDate = new Date(activeDates[i]);
    
    // Use UTC date boundaries to guarantee precise 24-hour absolute interval days calculations
    const prevTime = Date.UTC(prevDate.getUTCFullYear(), prevDate.getUTCMonth(), prevDate.getUTCDate());
    const currTime = Date.UTC(currDate.getUTCFullYear(), currDate.getUTCMonth(), currDate.getUTCDate());
    
    const diffTime = currTime - prevTime;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  return maxStreak;
}

export default function Achievements({ workouts, profile, activeTheme }: AchievementsProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  // List of elegant dynamic achievements
  const achievementsList: AchievementDefinition[] = [
    {
      id: 'first_leap',
      title: 'First Leap',
      description: 'Record your very first jump rope workout session.',
      icon: Award,
      check: (w) => w.length >= 1,
      getProgress: (w) => {
        const current = w.length >= 1 ? 1 : 0;
        return { current, target: 1, percentage: current * 100 };
      },
      details: 'You have officially initiated your cardiovascular pacing records! Breaking the ice is always the hardest step.',
      tips: 'A single turn of the rope lays the foundation. Always focus on a soft, two-foot landing with slightly bent knees to protect joints.'
    },
    {
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Record at least 100 jumps in any single training session.',
      icon: Zap,
      check: (w) => w.some(item => item.count >= 100),
      getProgress: (w) => {
        const maxSingle = w.length > 0 ? Math.max(...w.map(item => item.count)) : 0;
        return { 
          current: maxSingle, 
          target: 100, 
          percentage: Math.min((maxSingle / 100) * 100, 100) 
        };
      },
      details: 'High-frequency skipping places major neuro-muscular demands on wrist articulation and foot mechanics.',
      tips: 'Ensure your speed comes from small wrist-circles rather than your forearms or elbows. Keep your hands situated just forward of your hips.'
    },
    {
      id: 'double_under',
      title: 'Double Under Apprentice',
      description: 'Reach a comprehensive total volume of 5 completed workouts.',
      icon: Trophy,
      check: (w) => w.length >= 5,
      getProgress: (w) => {
        return { 
          current: w.length, 
          target: 5, 
          percentage: Math.min((w.length / 5) * 100, 100) 
        };
      },
      details: 'Skipping consistency trains muscle memory, promoting deep endurance and respiratory adaptation.',
      tips: 'Regularity beats intensity. Establish a routine of three 15-minute skipping sessions per week rather than occasional long runs.'
    },
    {
      id: 'calorie_slayer',
      title: 'Calorie Slayer',
      description: 'Burn a cumulative lifetime total of 500 kcal.',
      icon: Flame,
      check: (w) => w.reduce((sum, item) => sum + item.calories, 0) >= 500,
      getProgress: (w) => {
        const totalCals = Math.floor(w.reduce((sum, item) => sum + item.calories, 0));
        return { 
          current: totalCals, 
          target: 500, 
          percentage: Math.min((totalCals / 500) * 100, 100) 
        };
      },
      details: 'A massive caloric burn which is equivalent to full physical power generation over complex training intervals.',
      tips: 'Caloric output increases as you add interval shifts. Integrate 30 seconds of high-rate steps followed by 15 seconds of relaxed recovery.'
    },
    {
      id: 'endurance_skipper',
      title: 'Endurance Skipper',
      description: 'Complete any individual workout lasting 10 minutes (600s) or more.',
      icon: Clock,
      check: (w) => w.some(item => item.duration >= 600),
      getProgress: (w) => {
        const maxDuration = w.length > 0 ? Math.max(...w.map(item => item.duration)) : 0;
        return { 
          current: maxDuration, 
          target: 600, 
          percentage: Math.min((maxDuration / 600) * 100, 100) 
        };
      },
      details: 'Sustainable structural pacing requires entering aerobic steady-states without losing rhythmic coordination.',
      tips: 'Relax your shoulders and look straight ahead, not down at your feet. Breathe rhythmically through your nose to keep heart rate in zone 2/3.'
    },
    {
      id: 'elite_centurion',
      title: 'Elite Centurion',
      description: 'Complete over 1,000 jumps in any single workout session.',
      icon: Sparkles,
      check: (w) => w.some(item => item.count >= 1000),
      getProgress: (w) => {
        const maxSingle = w.length > 0 ? Math.max(...w.map(item => item.count)) : 0;
        return { 
          current: maxSingle, 
          target: 1000, 
          percentage: Math.min((maxSingle / 1000) * 100, 100) 
        };
      },
      details: 'This puts you in the top tier of regional skip training logs, requiring high stamina and deep foot-core endurance.',
      tips: 'Minimize your vertical clearance; you only need to jump 1-2 inches off the floor. Higher jumps drain energy much quicker.'
    },
    {
      id: 'consistent_athlete',
      title: 'Consistent Athlete',
      description: 'Record workouts on at least 3 distinct calendar days.',
      icon: Calendar,
      check: (w) => {
        const days = new Set(w.map(item => item.date.split('T')[0]));
        return days.size >= 3;
      },
      getProgress: (w) => {
        const days = new Set(w.map(item => item.date.split('T')[0]));
        return { 
          current: days.size, 
          target: 3, 
          percentage: Math.min((days.size / 3) * 100, 100) 
        };
      },
      details: 'Neurophysical retention is optimal when physical stress stimulates cardiovascular pathways on a regular, multi-day track.',
      tips: 'Ensure proper muscle rest and hydration between these recorded days. Leg recovery is critical for tendon reinforcement.'
    },
    {
      id: 'interval_enthusiast',
      title: 'Interval Enthusiast',
      description: 'Complete at least one high-intensity Interval Training workout.',
      icon: Activity,
      check: (w) => w.some(item => item.type === 'interval'),
      getProgress: (w) => {
        const intervalCompleted = w.some(item => item.type === 'interval') ? 1 : 0;
        return { 
          current: intervalCompleted, 
          target: 1, 
          percentage: intervalCompleted * 100 
        };
      },
      details: 'Interval steps are highly effective for expanding VO2 max and teaching quick recovery mechanisms.',
      tips: 'In interval phases, keep rest periods strictly passive or use relaxed deep breathing to reset active heartbeats.'
    },
    {
      id: 'seven_day_streak',
      title: '7-Day Rhythmic Streak',
      description: 'Log workouts on at least 7 consecutive calendar days.',
      icon: FlameKindling,
      check: (w) => getMaxStreak(w) >= 7,
      getProgress: (w) => {
        const streak = getMaxStreak(w);
        return { 
          current: streak, 
          target: 7, 
          percentage: Math.min((streak / 7) * 100, 100) 
        };
      },
      details: 'Structuring an unbroken weekly rhythm signals a high level of neuroplastic and muscular adaptation.',
      tips: 'Listen to your body. On active recovery days, keep the intensity low, focusing with low impact, simple slow-pace skip sessions.'
    },
    {
      id: 'thirty_day_streak',
      title: '30-Day Dedication',
      description: 'Maintain a continuous training streak of 30 days without interruption.',
      icon: TrendingUp,
      check: (w) => getMaxStreak(w) >= 30,
      getProgress: (w) => {
        const streak = getMaxStreak(w);
        return { 
          current: streak, 
          target: 30, 
          percentage: Math.min((streak / 30) * 100, 100) 
        };
      },
      details: '30 consecutive days of jump rope creates strong cardiac vascular foundations and long-running habit retention.',
      tips: 'Ensure proper stretching of calf muscles and Achilles tendons before and after every workout to avoid tension buildup.'
    },
    {
      id: 'hundred_day_streak',
      title: '100-Day Century Quest',
      description: 'Conquer a stellar milestone of 100 continuous, consecutive days of skipping.',
      icon: Trophy,
      check: (w) => getMaxStreak(w) >= 100,
      getProgress: (w) => {
        const streak = getMaxStreak(w);
        return { 
          current: streak, 
          target: 100, 
          percentage: Math.min((streak / 100) * 100, 100) 
        };
      },
      details: 'Reaching a 100-day consecutive record places you in the absolute master tier of professional sports endurance.',
      tips: 'Make sure you are skipping on soft, impact-absorbing surfaces like gym mats, grass, or wooden floors to preserve your joints over long horizons.'
    },
    {
      id: 'year_streak',
      title: 'Solar Orbit Champion (365 Days)',
      description: 'Achieve the ultimate consecutive training cycle spanning a full year (365 days) of continuous skipping.',
      icon: Sparkles,
      check: (w) => getMaxStreak(w) >= 365,
      getProgress: (w) => {
        const streak = getMaxStreak(w);
        return { 
          current: streak, 
          target: 365, 
          percentage: Math.min((streak / 365) * 100, 100) 
        };
      },
      details: '365 continuous days represents a full astronomical orbital cycle of continuous physical training and steel discipline.',
      tips: 'At this advanced level, alternate between heavy training ropes, speed cables, and freestyle skipping to balanced muscle group stimulus.'
    }
  ];

  // Calculate dynamic metrics
  const totalCompleted = achievementsList.filter(ach => ach.check(workouts)).length;
  const ratio = totalCompleted / achievementsList.length;

  // Title rank based on achievements unlocked
  let rankLabel = 'Rookie Skipper';
  let rankIcon = Shield;
  let rankColorText = 'text-zinc-500';

  if (totalCompleted >= 11) {
    rankLabel = 'Undefeated Skipper God';
    rankIcon = Trophy;
    rankColorText = 'text-orange-400 font-extrabold';
  } else if (totalCompleted >= 8) {
    rankLabel = 'Master Athlete';
    rankIcon = Sparkles;
    rankColorText = 'text-emerald-400 font-extrabold';
  } else if (totalCompleted >= 4) {
    rankLabel = 'Skilled Prodigy';
    rankIcon = Zap;
    rankColorText = 'text-cyan-400 font-bold';
  } else if (totalCompleted >= 1) {
    rankLabel = 'Active Challenger';
    rankIcon = Award;
    rankColorText = 'text-amber-500 font-semibold';
  }

  // Filtered and searched Achievements list
  const filteredAchievements = achievementsList.filter(ach => {
    const isUnlocked = ach.check(workouts);
    const matchesSearch = ach.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ach.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className={`space-y-6 ${activeTheme.rootBg === 'bg-black text-zinc-100' ? 'text-zinc-100' : ''}`} id="achievements-section-wrapper">
      
      {/* Achievements Hero Rank Overview */}
      <div className={`p-6 rounded-3xl ${activeTheme.cardBg} transition-all relative overflow-hidden`} id="achievements-hero-rank">
        {/* Glow effect matching active theme */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-orange-505/10 via-amber-505/5 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className={`py-1 px-3 text-[9.5px] uppercase font-mono font-bold rounded-xl tracking-widest ${activeTheme.proBadge}`}>
                Skipper Badges
              </span>
              <span className="text-zinc-550 text-xs font-mono">Dynamic Verification</span>
            </div>
            
            <h1 className="text-2xl font-black sm:text-3xl tracking-tight leading-none uppercase">
              Athlete Achievement Ranks
            </h1>
            <p className={`text-xs ${activeTheme.textSecondary} max-w-xl leading-relaxed`}>
              Track unlocked rewards built strictly from actual training logs. No arbitrary triggers or presets — only authentic rope-jumping achievements.
            </p>
          </div>

          {/* Rank Card badge */}
          <div className={`p-4 rounded-2xl ${activeTheme.innerBg} border ${activeTheme.accentBorder || 'border-zinc-800'} flex items-center gap-3.5 w-full md:w-auto max-w-xs`}>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${activeTheme.gradientFromTo} text-black`}>
              {React.createElement(rankIcon, { className: "w-6 h-6 stroke-[2.5]" })}
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest block">CURRENT RANK</span>
              <span className={`text-sm uppercase tracking-wide ${rankColorText} block`}>{rankLabel}</span>
              <span className="text-[10px] text-zinc-400 font-mono italic block">
                {totalCompleted} of {achievementsList.length} achievements ({Math.round(ratio * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-850/45 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className={activeTheme.textSecondary}>Systemic Unlock Rate</span>
            <span className="font-extrabold font-mono text-orange-400">{Math.round(ratio * 100)}% ({totalCompleted} / {achievementsList.length})</span>
          </div>
          <div className="h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div 
              style={{ width: `${ratio * 100}%` }}
              className={`h-full bg-gradient-to-r ${activeTheme.gradientFromTo} transition-all duration-700 ease-out`}
            />
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between" id="achievements-nav-controls">
        
        {/* Sub filter tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 w-full sm:w-auto">
          <button
            onClick={() => { setFilter('all'); }}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider whitespace-nowrap cursor-pointer ${
              filter === 'all' 
                ? 'bg-zinc-850 text-white shadow' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({achievementsList.length})
          </button>
          <button
            onClick={() => { setFilter('unlocked'); }}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider whitespace-nowrap cursor-pointer ${
              filter === 'unlocked' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Unlocked ({totalCompleted})
          </button>
          <button
            onClick={() => { setFilter('locked'); }}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider whitespace-nowrap cursor-pointer ${
              filter === 'locked' 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15 shadow' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Locked ({achievementsList.length - totalCompleted})
          </button>
        </div>

        {/* Live Search Inputs */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-900 focus:border-zinc-800 text-white placeholder-zinc-500 focus:outline-none"
            placeholder="Search specific milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Achievement Cards */}
      {filteredAchievements.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl ${activeTheme.cardBg} border-dashed border-2 border-zinc-850 flex flex-col items-center justify-center gap-3`} id="achievements-empty-state">
          <Lock className="w-10 h-10 text-zinc-650" />
          <h3 className="text-sm font-black uppercase text-zinc-400 font-mono">No achievements match filters</h3>
          <p className="text-xs text-zinc-550 max-w-sm">
            Try resetting your search query or log more jump rope sessions on the Live Trainer or Dashboard tab!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="achievements-cards-grid">
          {filteredAchievements.map((ach) => {
            const isUnlocked = ach.check(workouts);
            const progress = ach.getProgress(workouts);
            const isSelected = selectedAchievement === ach.id;
            
            return (
              <div 
                key={ach.id}
                onClick={() => {
                  setSelectedAchievement(isSelected ? null : ach.id);
                }}
                className={`p-5 rounded-2xl transition-all cursor-pointer border relative select-none flex flex-col justify-between group ${
                  isUnlocked 
                    ? `${activeTheme.cardBg} hover:scale-[1.015] border-zinc-850 shadow-md ${isSelected ? 'ring-1 ring-orange-500/40 border-orange-500/20 shadow-orange-500/5' : ''}` 
                    : `bg-zinc-950/40 border-zinc-900/60 opacity-75 ${isSelected ? 'border-zinc-700 opacity-90' : ''}`
                }`}
                id={`achievement-card-${ach.id}`}
              >
                {/* Visual Unlocked Ribbon tag */}
                {isUnlocked && (
                  <span className="absolute top-4 right-4 text-emerald-400 flex items-center gap-1 text-[9.5px] uppercase font-mono font-black" id={`checkmark-${ach.id}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10 stroke-2" />
                    <span>Active</span>
                  </span>
                )}
                {!isUnlocked && (
                  <span className="absolute top-4 right-4 text-zinc-550 flex items-center gap-1 text-[9.5px] uppercase font-mono font-extrabold">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                )}

                <div className="space-y-4">
                  
                  {/* Icon & Title block */}
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-xl transition-transform group-hover:scale-105 ${
                      isUnlocked 
                        ? `bg-orange-500/10 ${activeTheme.accentText} border ${activeTheme.accentBorder}` 
                        : 'bg-zinc-905 border border-zinc-800 text-zinc-600'
                    }`}>
                      {React.createElement(ach.icon, { className: "w-5 h-5 stroke-[2]" })}
                    </div>
                    <div>
                      <h3 className={`text-sm font-black tracking-tight ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                        {ach.title}
                      </h3>
                      <p className="text-[10.5px] text-zinc-500 uppercase tracking-wider font-mono font-bold">
                        {isUnlocked ? 'unlocked' : 'in progress'}
                      </p>
                    </div>
                  </div>

                  {/* Description text */}
                  <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">
                    {ach.description}
                  </p>

                  {/* Progress Gauge */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500 uppercase font-semibold">Tuning Level</span>
                      <span className={`font-bold ${isUnlocked ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {progress.current.toLocaleString()} / {progress.target.toLocaleString()} ({Math.round(progress.percentage)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/60">
                      <div 
                        style={{ width: `${progress.percentage}%` }}
                        className={`h-full transition-all duration-500 ${
                          isUnlocked 
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-orange-500 to-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Action/Tip label */}
                  <div className="pt-1 flex items-center justify-between text-[10.5px] font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    <span className="flex items-center gap-1 select-none">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{isSelected ? 'Collapse athletic insights' : 'Tap for training guidelines'}</span>
                    </span>
                    <span className="text-[12px] font-thin transform transition-transform group-hover:translate-x-0.5">{isSelected ? '▼' : '▶'}</span>
                  </div>

                  {/* Expanded athletic science tips block */}
                  {isSelected && (
                    <div className="pt-3.5 border-t border-zinc-805 space-y-2.5 animate-fade-in" id={`expanded-tips-${ach.id}`}>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-black text-orange-400 uppercase tracking-widest block">BIOMECHANICAL SUMMARY</span>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                          {ach.details}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-900 space-y-1">
                        <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest block flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>COACH ADVICE / TIPS</span>
                        </span>
                        <p className="text-[11px] text-zinc-400 leading-normal font-normal">
                          {ach.tips}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standard Athletic Advice disclaimer */}
      <div className={`p-4 rounded-xl ${activeTheme.innerBg} border border-zinc-900/50 flex items-start gap-3`} id="achievements-disclaimer">
        <Shield className="w-4 h-4 text-emerald-400/80 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block font-mono">Verified Skipper Credentials</span>
          <p className="text-[10.5px] text-zinc-500 leading-relaxed font-normal">
            ⚙️ Performance indices are evaluated locally within your active profile container block. Achievements stimulate optimal cardiac efficiency, but require structured stretching and core rest patterns. Always stay hydrated!
          </p>
        </div>
      </div>

    </div>
  );
}
