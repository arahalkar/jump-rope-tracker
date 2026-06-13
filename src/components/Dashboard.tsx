/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Workout, UserProfile } from '../types';
import { Flame, Trophy, Calendar, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { themes } from '../theme';

interface DashboardProps {
  workouts: Workout[];
  profile: UserProfile;
  onAddManualLog?: (count: number, durationMinutes: number, dateStr: string, notes: string) => void;
}

export default function Dashboard({ workouts, profile, onAddManualLog }: DashboardProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredCalorieIdx, setHoveredCalorieIdx] = useState<number | null>(null);

  // Quick Self-Log State
  const [quickCount, setQuickCount] = useState<number | string>(500);
  const [quickDuration, setQuickDuration] = useState<number | string>(5);
  const [quickNotes, setQuickNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const countNum = Number(quickCount);
    const durNum = Number(quickDuration);
    if (!countNum || countNum <= 0 || !durNum || durNum <= 0) return;
    
    if (onAddManualLog) {
      const todayStr = new Date().toISOString().split('T')[0];
      onAddManualLog(countNum, durNum, todayStr, quickNotes || 'Logged from Dashboard quick-log.');
      setSuccessMsg(true);
      setQuickNotes('');
      setTimeout(() => setSuccessMsg(false), 3000);
    }
  };

  // Get active visual theme
  const activeTheme = themes[profile.theme || 'cosmic-slate'];

  // Map theme colors to SVG stroke/fill colors
  const strokeColors = {
    'cosmic-slate': '#f97316', // orange-500
    'cyber-radiant': '#ec4899', // pink-500
    'nordic-frost': '#0ea5e9',  // sky-500 / teal
    'amber-sunset': '#d97706'   // amber-600
  };
  const activeStroke = strokeColors[profile.theme || 'cosmic-slate'];

  // 1. Calculations
  const totalWorkouts = workouts.length;
  const totalJumps = workouts.reduce((acc, w) => acc + w.count, 0);
  const totalDuration = workouts.reduce((acc, w) => acc + w.duration, 0);
  const totalCalories = Math.round(workouts.reduce((acc, w) => acc + w.calories, 0));

  // Today's total jumps
  const todayStr = new Date().toDateString();
  const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === todayStr);
  const todayJumps = todayWorkouts.reduce((acc, w) => acc + w.count, 0);
  const dailyProgressPercent = Math.min(100, Math.round((todayJumps / profile.dailyTarget) * 100));

  // 2. Streak Calculator
  const getStreaks = (allWorkouts: Workout[]) => {
    if (allWorkouts.length === 0) return { current: 0, longest: 0 };
    
    // Extract unique dates in local timezone
    const uniqueDates = Array.from(
      new Set(allWorkouts.map(w => new Date(w.date).toDateString()))
    ).map(dStr => new Date(dStr));

    // Sort descending (yesterday, today, older...)
    uniqueDates.sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    yesterdayDate.setHours(0, 0, 0, 0);

    const firstDate = uniqueDates[0];
    if (firstDate) {
      firstDate.setHours(0,0,0,0);
      // If the latest workout is within today or yesterday, we can potentially have an active streak
      const hasActiveStreak = firstDate.getTime() === todayDate.getTime() || firstDate.getTime() === yesterdayDate.getTime();

      let checkDate = hasActiveStreak ? firstDate : null;
      let idx = 0;

      if (checkDate) {
        currentStreak = 1;
        tempStreak = 1;
        
        while (idx < uniqueDates.length - 1) {
          const current = new Date(uniqueDates[idx]);
          current.setHours(0,0,0,0);
          
          const next = new Date(uniqueDates[idx + 1]);
          next.setHours(0,0,0,0);

          const diffTime = current.getTime() - next.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
            tempStreak++;
          } else if (diffDays > 1) {
            // Broken streak
            break;
          }
          idx++;
        }
      }
    }

    // Now calculate longest streak
    // Re-sort ascending to find chronological sequences
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

  const { current: currentStreak, longest: longestStreak } = getStreaks(workouts);

  // 3. Weekly Data preparation
  const getWeeklyData = () => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toDateString();
      const count = workouts
        .filter(w => new Date(w.date).toDateString() === dStr)
        .reduce((sum, w) => sum + w.count, 0);
      
      data.push({
        label: d.toLocaleDateString([], { weekday: 'short' }),
        count: count,
        fullDate: d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      });
    }
    return data;
  };

  const weeklyData = getWeeklyData();
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 500);

  // 4. Trend Line Data (Last 5 Workouts)
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-6);

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* Target Progress, Streak & Quick self-logger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Ring Progress Chart */}
        <div className={`lg:col-span-4 ${activeTheme.cardBg} rounded-2xl p-6 flex flex-col items-center justify-between relative overflow-hidden`} id="daily-progress-ring">
          {profile.theme !== 'amber-sunset' && (
            <>
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
            </>
          )}

          <h3 className={`${activeTheme.textSecondary} font-medium text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 self-start w-full`}>
            <Activity className={`w-4 h-4 ${activeTheme.accentText} animate-pulse`} />
            Today's Target Progress
          </h3>

          <div className="relative w-44 h-44 flex items-center justify-center my-2">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Outer Track Circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="7"
                stroke="currentColor"
                className={activeTheme.ringBg}
                fill="transparent"
              />
              {/* Foreground Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="7"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - dailyProgressPercent / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                className={`${activeTheme.ringFg} transition-all duration-1000 ease-out`}
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center text-center">
              <span className={`text-4xl font-extrabold ${activeTheme.textPrimary} tracking-tight`}>{todayJumps}</span>
              <span className={`${activeTheme.textMuted} text-xs font-semibold`}>/ {profile.dailyTarget} Jumps</span>
              {dailyProgressPercent >= 100 ? (
                <span className={`mt-1 ${activeTheme.proBadge} text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-bounce`}>
                  Target Hit!
                </span>
              ) : (
                <span className={`${activeTheme.accentText} text-xs mt-0.5 font-bold`}>{dailyProgressPercent}%</span>
              )}
            </div>
          </div>
          
          <div className="mt-2 text-center">
            <p className={`text-xs ${activeTheme.textSecondary}`}>
              {todayJumps >= profile.dailyTarget
                ? "Incredible job! You exceeded today's jump target."
                : `Jump ${profile.dailyTarget - todayJumps} more times to complete your goal!`}
            </p>
          </div>
        </div>

        {/* Motivational Streak and Quick Insights */}
        <div className={`lg:col-span-5 ${activeTheme.cardBg} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden`} id="streak-insights-panel">
          
          {/* Upper Stats Row */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className={`p-3.5 rounded-xl ${activeTheme.innerBg} flex flex-col justify-between`}>
              <span className={`${activeTheme.textMuted} text-[11px] font-semibold uppercase tracking-wider`}>Total Workouts</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl font-black ${activeTheme.textPrimary}`}>{totalWorkouts}</span>
                <span className={`${activeTheme.textMuted} text-[10px]`}>logged</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl ${activeTheme.innerBg} flex flex-col justify-between`}>
              <span className={`${activeTheme.textMuted} text-[11px] font-semibold uppercase tracking-wider`}>Lifetime Jumps</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl font-black ${activeTheme.textPrimary}`}>{totalJumps.toLocaleString()}</span>
                <span className={`${activeTheme.textMuted} text-[10px]`}>reps</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl ${activeTheme.innerBg} flex flex-col justify-between`}>
              <span className={`${activeTheme.textMuted} text-[11px] font-semibold uppercase tracking-wider`}>Calorie Burn</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl font-black ${activeTheme.accentText}`}>{totalCalories.toLocaleString()}</span>
                <span className={`${activeTheme.textMuted} text-[10px]`}>kcal</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl ${activeTheme.innerBg} flex flex-col justify-between`}>
              <span className={`${activeTheme.textMuted} text-[11px] font-semibold uppercase tracking-wider`}>Total Duration</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl font-black ${activeTheme.textPrimary}`}>{Math.round(totalDuration / 60)}</span>
                <span className={`${activeTheme.textMuted} text-[10px]`}>mins</span>
              </div>
            </div>
          </div>

          {/* Golden Streak and Stats Badge */}
          <div className="grid grid-cols-1 gap-3 mt-4 w-full">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${activeTheme.proBadge}`}>
              <div className={`w-10 h-10 rounded-lg ${activeTheme.accentBg} flex items-center justify-center shadow-lg shrink-0`}>
                <Flame className={`w-5 h-5 text-white ${profile.theme === 'amber-sunset' ? 'text-stone-950' : ''}`} />
              </div>
              <div>
                <div className={`text-[9px] uppercase font-bold tracking-wider ${activeTheme.accentText}`}>Current Streak</div>
                <div className={`text-lg font-black ${activeTheme.textPrimary} flex items-baseline gap-1`}>
                  {currentStreak} <span className={`text-xs font-semibold ${activeTheme.textSecondary}`}>Days</span>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl ${activeTheme.innerBg}`}>
              <div className={`w-10 h-10 rounded-lg ${profile.theme === 'amber-sunset' ? 'bg-stone-200 text-stone-850' : 'bg-zinc-800 text-zinc-300'} flex items-center justify-center shrink-0`}>
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className={`text-[9px] uppercase font-bold tracking-wider ${activeTheme.textSecondary}`}>Personal Best Streak</div>
                <div className={`text-lg font-black ${activeTheme.textPrimary} flex items-baseline gap-1`}>
                  {longestStreak} <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Days</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Self-Log Widget - Direct Manual Logger */}
        {onAddManualLog && (
          <div className={`lg:col-span-3 ${activeTheme.cardBg} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden`} id="quick-log-card">
            {profile.theme !== 'amber-sunset' && (
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
            )}
            
            <div className="w-full">
              <h3 className={`${activeTheme.textPrimary} font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5`}>
                <Zap className={`w-4 h-4 ${activeTheme.accentText}`} />
                Quick Log Skips
              </h3>
              <p className={`text-[11px] ${activeTheme.textMuted} mb-3.5 leading-tight`}>
                Completed a real workout offline? Record your count here!
              </p>
            </div>
            
            <form onSubmit={handleQuickSubmit} className="space-y-4 flex-1 flex flex-col justify-end w-full">
              <div className="space-y-3.5 w-full">
                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider">
                    <span className={activeTheme.textSecondary}>REPS COUNT</span>
                    <button 
                      type="button" 
                      onClick={() => setQuickCount(prev => Number(prev) + 100)} 
                      className={`${activeTheme.accentText} hover:underline font-black text-[9px]`}
                    >
                      +100
                    </button>
                  </div>
                  <input 
                    type="number" 
                    min={1} 
                    required 
                    value={quickCount} 
                    onChange={(e) => setQuickCount(e.target.value)} 
                    className={`w-full ${activeTheme.innerBg} rounded-xl p-2.5 text-center text-sm font-black font-mono ${activeTheme.textPrimary} focus:outline-none focus:ring-1 focus:ring-orange-500`}
                  />
                </div>

                <div>
                  <div className={`flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider ${activeTheme.textSecondary}`}>
                    <span>DURATION (MINS)</span>
                  </div>
                  <input 
                    type="number" 
                    min={1} 
                    required 
                    value={quickDuration} 
                    onChange={(e) => setQuickDuration(e.target.value)} 
                    className={`w-full ${activeTheme.innerBg} rounded-xl p-2.5 text-center text-sm font-black font-mono ${activeTheme.textPrimary} focus:outline-none focus:ring-1 focus:ring-orange-500`}
                  />
                </div>

                <div>
                  <input 
                    type="text" 
                    placeholder="Short note (optional)..." 
                    value={quickNotes} 
                    onChange={(e) => setQuickNotes(e.target.value)} 
                    className={`w-full bg-transparent border-b ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-850'} py-1 text-xs ${activeTheme.textPrimary} placeholder-zinc-500 outline-none`}
                  />
                </div>
              </div>

              <div className="pt-2 w-full mt-4">
                <button 
                  type="submit" 
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    successMsg 
                      ? 'bg-emerald-600 text-white font-black hover:bg-emerald-700' 
                      : activeTheme.btnPrimary
                  } hover:opacity-95 active:scale-[0.98] shadow-md`}
                >
                  {successMsg ? 'Skips Logged! ⚡' : 'Record Jumps offline'}
                </button>
              </div>
            </form>
          </div>
        )}      </div>

    </div>
  );
}
