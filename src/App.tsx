/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Workout, UserProfile, IntervalConfig, WorkoutType, AppTheme } from './types';
import { 
  getInitialWorkouts, 
  calculateCalories, 
  formatDuration, 
  formatDate, 
  playBeep 
} from './utils';
import Dashboard from './components/Dashboard';
import { LoginScreen, RegistrationScreen } from './components/AthleteAuth';
import Leaderboard from './components/Leaderboard';
import Achievements from './components/Achievements';
import { themes } from './theme';
import { 
  Flame, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  MessageSquare, 
  BookOpen, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  TrendingUp,
  History,
  Info,
  User,
  Lock,
  ShieldCheck,
  KeyRound,
  Unlock,
  LogOut,
  Trophy,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AVATARS = [
  { emoji: '🦘', label: 'Hop Kangaroo', description: 'Tireless speed and bounce' },
  { emoji: '⚡', label: 'Lightning Bolt', description: 'Ultra-fast double-unders' },
  { emoji: '🐯', label: 'Pacemaker Tiger', description: 'Steady, rhythmic power' },
  { emoji: '🦅', label: 'Slick Eagle', description: 'Flawless rope craft' },
  { emoji: '🚀', label: 'Rocket Skipper', description: 'Aerodynamic barrier breaker' },
  { emoji: '👾', label: 'Chiptune Gamer', description: 'Precise retro rhythmic beat' }
];

function calculateCurrentStreak(allWorkouts: Workout[]): number {
  if (allWorkouts.length === 0) return 0;
  
  const uniqueDates = Array.from(
    new Set(allWorkouts.map(w => {
      return new Date(w.date).toDateString();
    }))
  ).map(dStr => new Date(dStr));

  uniqueDates.sort((a, b) => b.getTime() - a.getTime());

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  yesterdayDate.setHours(0, 0, 0, 0);

  const firstDate = uniqueDates[0];
  if (!firstDate) return 0;
  firstDate.setHours(0, 0, 0, 0);

  const hasActiveStreak = firstDate.getTime() === todayDate.getTime() || firstDate.getTime() === yesterdayDate.getTime();
  if (!hasActiveStreak) return 0;

  let currentStreak = 1;
  let idx = 0;
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
  return currentStreak;
}

export default function App() {
  // Pre-load the active account from local storage to isolate/partition the initial workouts and profile keys
  const initialActiveAccount = (() => {
    const saved = localStorage.getItem('jumprope_athlete_account');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  })();

  const lastSyncedRef = useRef<{ accountId: string; workoutsJson: string }>({
    accountId: initialActiveAccount?.accountId || '',
    workoutsJson: ''
  });

  // 1. Core Persistent State
  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    const accId = initialActiveAccount?.accountId;
    if (accId) {
      const saved = localStorage.getItem(`jumprope_workouts_${accId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
      return [];
    } else {
      const saved = localStorage.getItem('jumprope_workouts');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
      return getInitialWorkouts();
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const accId = initialActiveAccount?.accountId;
    if (accId) {
      const saved = localStorage.getItem(`jumprope_profile_${accId}`);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          if (parsed && !parsed.theme) parsed.theme = 'cosmic-slate';
          return parsed;
        } catch (e) { console.error(e); }
      }
      return {
        weightKg: 72,
        dailyTarget: 1000,
        beepVolume: 0.5,
        soundEnabled: true,
        theme: 'cosmic-slate'
      };
    } else {
      const saved = localStorage.getItem('jumprope_profile');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          if (!parsed.theme) parsed.theme = 'cosmic-slate';
          return parsed;
        } catch (e) { console.error(e); }
      }
      return {
        weightKg: 72,
        dailyTarget: 1000,
        beepVolume: 0.5,
        soundEnabled: true,
        theme: 'cosmic-slate'
      };
    }
  });

  // Account Authentication States (Requires secure PIN unlock when first opening app)
  const [athleteAccount, setAthleteAccount] = useState<{
    username: string;
    pin: string;
    avatarIndex: number;
    securityQuestion: string;
    securityAnswer: string;
    accountId?: string;
  } | null>(() => {
    const saved = localStorage.getItem('jumprope_athlete_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.accountId) {
          parsed.accountId = 'ath_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
          localStorage.setItem('jumprope_athlete_account', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Default to false on first page load/refresh (forces login challenge)
  const [isCurrentlyLoggedIn, setIsCurrentlyLoggedIn] = useState(false);
  const [isRegisteringOverride, setIsRegisteringOverride] = useState(false);
  const [authMode, setAuthMode] = useState<'gateway' | 'login' | 'signup'>('gateway');

  // Security PIN editing input states
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // Inline Dialog/Confirm States
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showFormatConfirm, setShowFormatConfirm] = useState(false);
  const [formatResetInput, setFormatResetInput] = useState('');

  // Sync to localStorage
  useEffect(() => {
    if (athleteAccount?.accountId) {
      localStorage.setItem(`jumprope_workouts_${athleteAccount.accountId}`, JSON.stringify(workouts));
    }
    localStorage.setItem('jumprope_workouts', JSON.stringify(workouts));
  }, [workouts, athleteAccount?.accountId]);

  useEffect(() => {
    if (athleteAccount?.accountId) {
      localStorage.setItem(`jumprope_profile_${athleteAccount.accountId}`, JSON.stringify(profile));
    }
    localStorage.setItem('jumprope_profile', JSON.stringify(profile));
  }, [profile, athleteAccount?.accountId]);

  useEffect(() => {
    if (athleteAccount) {
      localStorage.setItem('jumprope_athlete_account', JSON.stringify(athleteAccount));
    } else {
      localStorage.removeItem('jumprope_athlete_account');
    }
  }, [athleteAccount]);

  // Keep the current active athlete synced inside a local multi-user accounts pool for instant offline login & Vercel bypass
  useEffect(() => {
    if (athleteAccount && athleteAccount.accountId) {
      try {
        const saved = localStorage.getItem('jumprope_local_accounts_pool');
        let pool: any[] = [];
        if (saved) {
          pool = JSON.parse(saved);
        }
        if (!Array.isArray(pool)) pool = [];

        const index = pool.findIndex((a: any) => a && (a.accountId === athleteAccount.accountId || a.id === athleteAccount.accountId || a.username.toLowerCase() === athleteAccount.username.toLowerCase()));
        
        const updatedRecord = {
          accountId: athleteAccount.accountId,
          id: athleteAccount.accountId,
          username: athleteAccount.username,
          pin: athleteAccount.pin,
          avatarIndex: athleteAccount.avatarIndex,
          securityQuestion: athleteAccount.securityQuestion,
          securityAnswer: athleteAccount.securityAnswer,
          workouts: workouts,
          weightKg: profile.weightKg,
          dailyTarget: profile.dailyTarget,
          theme: profile.theme || 'cosmic-slate'
        };

        if (index > -1) {
          pool[index] = { ...pool[index], ...updatedRecord };
        } else {
          pool.push(updatedRecord);
        }
        localStorage.setItem('jumprope_local_accounts_pool', JSON.stringify(pool));
      } catch (e) {
        console.error('Local pool sync error:', e);
      }
    }
  }, [athleteAccount, workouts, profile]);

  // Synchronize athlete stats with server-side leaderboard registry
  useEffect(() => {
    if (isCurrentlyLoggedIn && athleteAccount && athleteAccount.accountId) {
      const currentStreak = calculateCurrentStreak(workouts);
      const totalJumps = workouts.reduce((acc, w) => acc + w.count, 0);
      const workoutsJson = JSON.stringify(workouts);

      // Guard against redundant/race sync during account switches
      if (athleteAccount.accountId === lastSyncedRef.current.accountId && 
          workoutsJson === lastSyncedRef.current.workoutsJson) {
        return;
      }

      // Proactively update ref to block intermediate changes during flight
      lastSyncedRef.current = {
        accountId: athleteAccount.accountId,
        workoutsJson
      };

      fetch('/api/leaderboard/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: athleteAccount.accountId,
          username: athleteAccount.username,
          pin: athleteAccount.pin,
          securityQuestion: athleteAccount.securityQuestion,
          securityAnswer: athleteAccount.securityAnswer,
          avatarIndex: athleteAccount.avatarIndex,
          streak: currentStreak,
          totalJumps: totalJumps,
          workouts: workouts,
          weightKg: profile.weightKg,
          dailyTarget: profile.dailyTarget,
          theme: profile.theme
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log('Multiplayer profile synced:', data);
      })
      .catch(err => {
        console.error('Leaderboard sync error:', err);
      });
    }
  }, [isCurrentlyLoggedIn, athleteAccount, workouts, profile.weightKg, profile.dailyTarget, profile.theme]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trainer' | 'history' | 'coach' | 'leaderboard' | 'settings' | 'achievements'>('dashboard');

  const activeTheme = themes[profile.theme || 'cosmic-slate'];

  // 2. Active Session / Workout State
  const [activeMode, setActiveMode] = useState<WorkoutType>('quick');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countMethod, setCountMethod] = useState<'self-log' | 'metronome' | 'tapper'>('self-log');
  const [isLoggingPostWorkout, setIsLoggingPostWorkout] = useState(false);
  const [postWorkoutCount, setPostWorkoutCount] = useState(0);
  const [postWorkoutNotes, setPostWorkoutNotes] = useState('');
  
  // Timer calculations
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [jumpCount, setJumpCount] = useState(0);
  
  // Metronome Autopilot State
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(120);

  // Interval state
  const [intervalConfig, setIntervalConfig] = useState<IntervalConfig>({
    jumpTime: 30,
    restTime: 15,
    cycles: 5
  });
  const [currentCycle, setCurrentCycle] = useState(1);
  const [intervalPhase, setIntervalPhase] = useState<'jump' | 'rest'>('jump');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(30);

  // Target config
  const [targetType, setTargetType] = useState<'count' | 'duration'>('count');
  const [targetValue, setTargetValue] = useState(500); // 500 jumps or 300 seconds (5 min)

  // Manual Log form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCount, setManualCount] = useState<number>(500);
  const [manualDurationMin, setManualDurationMin] = useState<number>(5);
  const [manualType, setManualType] = useState<WorkoutType>('manual');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);

  // AI Coach state
  const [coachPrompt, setCoachPrompt] = useState('');
  const [coachResponse, setCoachResponse] = useState<string>('');
  const [coachHistory, setCoachHistory] = useState<Array<{role: 'user' | 'model', text: string}>>([
    { role: 'model', text: `Greetings! I am Velociloop Coach, your personal AI Jump Rope Specialist. 

I can generate custom workouts, guide you in advanced rope tricks, or help program a weightloss strategy. Select a preset below, or type your wellness questions directly!` }
  ]);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Refs for tracking timer loops
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 3. sound triggered helper
  const triggerAudioTick = (pitch = 600, duration = 0.05) => {
    if (profile.soundEnabled) {
      playBeep(pitch, duration, profile.beepVolume);
    }
  };

  // Keyboard navigation spacebar tap for jump counts when trainer is working!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar to count jumps during manual sessions
      if (e.code === 'Space' && isSessionActive && !isPaused && !metronomeEnabled) {
        e.preventDefault();
        setJumpCount(prev => {
          const next = prev + 1;
          // Play tick or soft high-hat click on every jump
          triggerAudioTick(750, 0.03);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, isPaused, metronomeEnabled, profile]);

  // 4. Core Timers Loop
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      // Second tick counter
      timerIntervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          const next = prev + 1;

          // If mode is Target Time
          if (activeMode === 'target' && targetType === 'duration') {
            if (next >= targetValue) {
              handleFinishSession();
              return next;
            }
          }
          return next;
        });

        // Interval Mode sub-scheduler
        if (activeMode === 'interval') {
          setPhaseSecondsLeft(prev => {
            if (prev <= 1) {
              // Transition phase!
              if (intervalPhase === 'jump') {
                // Moving to Rest!
                triggerAudioTick(350, 0.2); // lower warning beep
                setIntervalPhase('rest');
                return intervalConfig.restTime;
              } else {
                // Moving to Jump, advance cycle
                const nextCycle = currentCycle + 1;
                if (nextCycle > intervalConfig.cycles) {
                  // Finish workout!
                  setTimeout(() => handleFinishSession(), 50);
                  return 0;
                } else {
                  triggerAudioTick(800, 0.2); // high start beep
                  setCurrentCycle(nextCycle);
                  setIntervalPhase('jump');
                  return intervalConfig.jumpTime;
                }
              }
            }
            // Count down audio alert for last 3 seconds
            if (prev <= 4) {
              triggerAudioTick(500, 0.05);
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isSessionActive, isPaused, activeMode, intervalPhase, currentCycle, intervalConfig, targetType, targetValue]);

  // Metronome Ticking Trigger
  useEffect(() => {
    if (isSessionActive && !isPaused && metronomeEnabled) {
      const msPerBeat = 60000 / metronomeBpm;
      
      metronomeIntervalRef.current = setInterval(() => {
        setJumpCount(prev => {
          const next = prev + 1;
          triggerAudioTick(680, 0.04);

          // If mode is target count
          if (activeMode === 'target' && targetType === 'count') {
            if (next >= targetValue) {
              handleFinishSession();
            }
          }
          return next;
        });
      }, msPerBeat);
    } else {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    }

    return () => {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    };
  }, [isSessionActive, isPaused, metronomeEnabled, metronomeBpm, activeMode, targetType, targetValue]);

  // 5. Game Session Handlers
  const handleStartSession = () => {
    triggerAudioTick(880, 0.15); // Start success beep
    setTotalSeconds(0);
    setJumpCount(0);
    setIsSessionActive(true);
    setIsPaused(false);
    setIsLoggingPostWorkout(false);

    if (countMethod === 'metronome') {
      setMetronomeEnabled(true);
    } else {
      setMetronomeEnabled(false);
    }

    if (activeMode === 'interval') {
      setCurrentCycle(1);
      setIntervalPhase('jump');
      setPhaseSecondsLeft(intervalConfig.jumpTime);
    }
  };

  const handlePauseToggle = () => {
    triggerAudioTick(600, 0.08);
    setIsPaused(!isPaused);
  };

  const handleFinishSession = () => {
    // End session beep
    triggerAudioTick(980, 0.25);
    setIsPaused(true);

    // Fallback/prediction for self-logging mode
    let defaultCount = jumpCount;
    if (defaultCount === 0 && totalSeconds > 0) {
      // Standard target calculation (e.g. 120 jumps per minute)
      defaultCount = Math.round((totalSeconds / 60) * 120);
    }
    if (defaultCount <= 0) defaultCount = 100;

    setPostWorkoutCount(defaultCount);
    setPostWorkoutNotes('');
    setIsLoggingPostWorkout(true);
  };

  const handleCommitPostWorkout = () => {
    triggerAudioTick(1200, 0.35); // dual tone reward

    const caloriesBurned = calculateCalories(totalSeconds, postWorkoutCount, profile.weightKg);
    const newWorkout: Workout = {
      id: 'session-' + Date.now(),
      date: new Date().toISOString(),
      duration: Math.max(1, totalSeconds),
      count: postWorkoutCount,
      calories: caloriesBurned,
      type: activeMode,
      notes: postWorkoutNotes.trim() || (
        activeMode === 'interval' 
          ? `Interval session completed successfully: ${intervalConfig.cycles} rounds.`
          : activeMode === 'target'
            ? `Target workout achieved: ${targetValue} goal.`
            : `Quick stopwatch session.`
      )
    };

    setWorkouts(prev => [newWorkout, ...prev]);
    setIsSessionActive(false);
    setIsPaused(false);
    setMetronomeEnabled(false);
    setIsLoggingPostWorkout(false);

    // Switch to history or keep on active tab with banner
    setActiveTab('dashboard');
  };

  const handleDiscardSession = () => {
    setIsSessionActive(false);
    setIsPaused(false);
    setMetronomeEnabled(false);
  };

  // Add Manual Record Offline
  const handleAddManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const durationSeconds = manualDurationMin * 60;
    const caloriesBurned = calculateCalories(durationSeconds, manualCount, profile.weightKg);
    
    // Construct local timestamp at selected day but current time
    const todayNow = new Date();
    const selectedDateParts = manualDate.split('-');
    const newDate = new Date(
      Number(selectedDateParts[0]),
      Number(selectedDateParts[1]) - 1,
      Number(selectedDateParts[2]),
      todayNow.getHours(),
      todayNow.getMinutes()
    );

    const manualLog: Workout = {
      id: 'manual-' + Date.now(),
      date: newDate.toISOString(),
      duration: durationSeconds,
      count: manualCount,
      calories: caloriesBurned,
      type: manualType,
      notes: manualNotes.trim() || 'Logged manually.'
    };

    setWorkouts(prev => [manualLog, ...prev]);
    setShowManualForm(false);
    setManualNotes('');
    triggerAudioTick(900, 0.1);
  };

  const handleQuickAddManualLog = (count: number, durationMinutes: number, dateStr: string, notes: string) => {
    const durationSeconds = durationMinutes * 60;
    const caloriesBurned = calculateCalories(durationSeconds, count, profile.weightKg);
    
    const todayNow = new Date();
    const selectedDateParts = dateStr.split('-');
    const newDate = new Date(
      Number(selectedDateParts[0]),
      Number(selectedDateParts[1]) - 1,
      Number(selectedDateParts[2]),
      todayNow.getHours(),
      todayNow.getMinutes()
    );

    const manualLog: Workout = {
      id: 'manual-' + Date.now(),
      date: newDate.toISOString(),
      duration: durationSeconds,
      count: count,
      calories: caloriesBurned,
      type: 'manual',
      notes: notes.trim() || 'Logged manually via Quick Log.'
    };

    setWorkouts(prev => [manualLog, ...prev]);
    triggerAudioTick(950, 0.12);
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  // 6. Gemini Coach Interaction API
  const handleSendMessage = async (customPrompt?: string) => {
    const messageToSend = customPrompt || coachPrompt;
    if (!messageToSend.trim()) return;

    const userMsg = { role: 'user' as const, text: messageToSend };
    setCoachHistory(prev => [...prev, userMsg]);
    setCoachPrompt('');
    setIsCoachLoading(true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageToSend,
          workoutHistory: workouts.slice(0, 10), // Send last 10 workouts for context
          profile
        })
      });

      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error('Unexpected format received.');
        }
      } catch (err) {
        throw new Error('Your AI Coach is taking a short breather. Please try asking again.');
      }

      if (response.ok && data?.text) {
        setCoachHistory(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        throw new Error(data?.error || 'Invalid coaching advice feedback contents.');
      }
    } catch (e: any) {
      console.error(e);
      setCoachHistory(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: `⚠️ **Coaching Connection Error:** ${e.message || "Failed to reach Velociloop Coach. Please ensure GEMINI_API_KEY is configured in Settings > Secrets."}` 
        }
      ]);
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleClearHistory = () => {
    setWorkouts([]);
    localStorage.removeItem('jumprope_workouts');
    triggerAudioTick(200, 0.3);
  };

  // Suggested Coach presets
  const coachPresets = [
    { label: "⚡ Double Under Guide", prompt: "Explain how to practice double unders. What is the standard technique progression?" },
    { label: "🏃 Perfect Boxer Step", prompt: "Give me step-by-step instructions to learn the Boxer Step skip. Why is it useful?" },
    { label: "🔥 Fat Loss Skipping Routine", prompt: "Build me a high-intensity interval training tabata routine designed specifically for optimal fat-burning with a high-intensity jump rope session." },
    { label: "🤸 Stretch & Warmup Routine", prompt: "Recommend an ideal 5-minute pre-skipping dynamic warmup sequence to save my knees and calf muscles." }
  ];

  // 1. If account is registered, but session is not unlocked yet, show PIN Lock device lock screen
  if (athleteAccount && !isCurrentlyLoggedIn && !isRegisteringOverride) {
    return (
      <div className={`min-h-screen ${activeTheme.rootBg} flex items-center justify-center font-sans`}>
        <LoginScreen 
          athleteAccount={athleteAccount}
          onUnlock={() => setIsCurrentlyLoggedIn(true)}
          onLoginAnotherAccount={(acct, syncedWorkouts, weightKg, dailyTarget, theme) => {
            // Update lastSyncedRef immediately to block any intermediate sync trigger
            lastSyncedRef.current = {
              accountId: acct.accountId,
              workoutsJson: JSON.stringify(syncedWorkouts)
            };
            setAthleteAccount({
              username: acct.username,
              pin: acct.pin,
              avatarIndex: acct.avatarIndex,
              securityQuestion: acct.securityQuestion,
              securityAnswer: acct.securityAnswer,
              accountId: acct.accountId
            });
            setWorkouts(syncedWorkouts);
            setProfile(p => ({
              ...p,
              weightKg,
              dailyTarget,
              theme: theme as any || 'cosmic-slate'
            }));
            setIsCurrentlyLoggedIn(true);
            setAuthMode('gateway');
          }}
          activeTheme={activeTheme}
          beepVolume={profile.beepVolume}
          onMakeNewAccount={() => {
            setIsRegisteringOverride(true);
          }}
        />
      </div>
    );
  }

  // 1.1 Override Registration: If they have an account but chose to register a new one
  if (isRegisteringOverride) {
    return (
      <div className={`min-h-screen ${activeTheme.rootBg} flex items-center justify-center font-sans`}>
        <RegistrationScreen 
          onRegister={(acct, weightKg, dailyTarget) => {
            const accountId = 'ath_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
            lastSyncedRef.current = {
              accountId: accountId,
              workoutsJson: JSON.stringify([])
            };
            setWorkouts([]);
            const acctWithId = {
              ...acct,
              accountId: accountId
            };
            setAthleteAccount(acctWithId);
            setProfile(p => ({ ...p, weightKg, dailyTarget }));
            setIsCurrentlyLoggedIn(true);
            setIsRegisteringOverride(false);
            setAuthMode('gateway');

            // Synchronize registration with system backend database
            fetch('/api/accounts/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: accountId,
                username: acct.username,
                pin: acct.pin,
                avatarIndex: acct.avatarIndex,
                securityQuestion: acct.securityQuestion,
                securityAnswer: acct.securityAnswer,
                weightKg,
                dailyTarget,
                workouts: [],
                theme: profile.theme || 'cosmic-slate',
                streak: 0,
                totalJumps: 0
              })
            })
            .then(res => res.json())
            .then(data => {
              console.log('Synchronized new account registration:', data);
            })
            .catch(err => {
              console.error('Account background registration sync failed:', err);
            });
          }}
          activeTheme={activeTheme}
          beepVolume={profile.beepVolume}
          initialEmail="arahalkar@gmail.com"
          showCancel={true}
          onCancel={() => {
            setIsRegisteringOverride(false);
          }}
        />
      </div>
    );
  }

  // 2. Gateway Option Screen: Show when completely logged out (no athleteAccount active)
  if (!athleteAccount && authMode === 'gateway') {
    return (
      <div className={`min-h-screen ${activeTheme.rootBg} flex items-center justify-center font-sans relative overflow-hidden px-4`}>
        {/* Ambient Gradient Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-orange-600/5 blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none animate-bounce duration-[10s]"></div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`w-full max-w-md ${activeTheme.cardBg} rounded-3xl p-8 sm:p-10 shadow-2xl relative border border-zinc-800/80 z-10 flex flex-col justify-between`}
        >
          {/* Top Header branding */}
          <div className="w-full flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 font-mono select-none tracking-widest pb-4 border-b border-zinc-900">
            <span className="flex items-center gap-1">🎖️ Athlete Gate</span>
            <span>Velociloop v2.6</span>
          </div>

          {/* App Branding & Logo */}
          <div className="text-center my-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-3xl shadow-xl select-none animate-pulse">
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-widest text-white uppercase text-center font-sans bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                VELOCILOOP
              </h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                High-Performance Skip Tracker & Coach
              </p>
            </div>
          </div>

          {/* Prompt description */}
          <p className="text-xs text-zinc-400 text-center leading-relaxed font-normal mb-8">
            Welcome to your digital jump rope training ecosystem. Select an option below to initiate your skipping log.
          </p>

          {/* Gateway Buttons Grid */}
          <div className="space-y-4">
            {/* option 1: Log In */}
            <button
              onClick={() => {
                playBeep(750, 0.05, profile.beepVolume);
                setAuthMode('login');
              }}
              className="w-full p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-700 flex items-center gap-4 transition-all text-left group active:scale-[0.99] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-black text-xl transition-transform group-hover:scale-105">
                🔑
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-zinc-100 block group-hover:text-orange-400 transition-colors">
                  Log In to Athlete Profile
                </span>
                <span className="text-[10px] text-zinc-500 block leading-normal mt-0.5 font-normal">
                  Enter username & PIN to load existing skippings.
                </span>
              </div>
            </button>

            {/* option 2: Sign Up */}
            <button
              onClick={() => {
                playBeep(850, 0.05, profile.beepVolume);
                setAuthMode('signup');
              }}
              className="w-full p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-700 flex items-center gap-4 transition-all text-left group active:scale-[0.99] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xl transition-transform group-hover:scale-105">
                ✨
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-zinc-100 block group-hover:text-amber-400 transition-colors">
                  Sign Up & Register
                </span>
                <span className="text-[10px] text-zinc-500 block leading-normal mt-0.5 font-normal">
                  Create a new device rank identity and configure goals.
                </span>
              </div>
            </button>
          </div>

          <div className="text-center pt-8 border-t border-zinc-900 mt-8">
            <span className="text-[9px] text-zinc-650 font-bold uppercase tracking-wider font-mono">
              Offline Cache Engine Enabled
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Login Flow Screen when gateway triggers it
  if (!athleteAccount && authMode === 'login') {
    return (
      <div className={`min-h-screen ${activeTheme.rootBg} flex items-center justify-center font-sans`}>
        <LoginScreen 
          athleteAccount={{
            username: '',
            pin: '',
            avatarIndex: 0,
            securityQuestion: 'first_pet',
            securityAnswer: 'velociloop'
          }}
          startInSwitchView={true}
          onBackToGateway={() => {
            playBeep(650, 0.05, profile.beepVolume);
            setAuthMode('gateway');
          }}
          onUnlock={() => setIsCurrentlyLoggedIn(true)}
          onLoginAnotherAccount={(acct, syncedWorkouts, weightKg, dailyTarget, theme) => {
            // Update lastSyncedRef immediately to block any intermediate sync trigger
            lastSyncedRef.current = {
              accountId: acct.accountId,
              workoutsJson: JSON.stringify(syncedWorkouts)
            };
            setAthleteAccount({
              username: acct.username,
              pin: acct.pin,
              avatarIndex: acct.avatarIndex,
              securityQuestion: acct.securityQuestion,
              securityAnswer: acct.securityAnswer,
              accountId: acct.accountId
            });
            setWorkouts(syncedWorkouts);
            setProfile(p => ({
              ...p,
              weightKg,
              dailyTarget,
              theme: theme as any || 'cosmic-slate'
            }));
            setIsCurrentlyLoggedIn(true);
            setAuthMode('gateway');
          }}
          activeTheme={activeTheme}
          beepVolume={profile.beepVolume}
        />
      </div>
    );
  }

  // 4. Registration Flow Screen when gateway triggers it
  if (!athleteAccount && authMode === 'signup') {
    return (
      <div className={`min-h-screen ${activeTheme.rootBg} flex items-center justify-center font-sans`}>
        <RegistrationScreen 
          onRegister={(acct, weightKg, dailyTarget) => {
            const accountId = 'ath_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
            lastSyncedRef.current = {
              accountId: accountId,
              workoutsJson: JSON.stringify([])
            };
            setWorkouts([]);
            const acctWithId = {
              ...acct,
              accountId: accountId
            };
            setAthleteAccount(acctWithId);
            setProfile(p => ({ ...p, weightKg, dailyTarget }));
            setIsCurrentlyLoggedIn(true);
            setAuthMode('gateway');

            // Synchronize registration with system backend database
            fetch('/api/accounts/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: accountId,
                username: acct.username,
                pin: acct.pin,
                avatarIndex: acct.avatarIndex,
                securityQuestion: acct.securityQuestion,
                securityAnswer: acct.securityAnswer,
                weightKg,
                dailyTarget,
                workouts: [],
                theme: profile.theme || 'cosmic-slate',
                streak: 0,
                totalJumps: 0
              })
            })
            .then(res => res.json())
            .then(data => {
              console.log('Synchronized new account registration overview:', data);
            })
            .catch(err => {
              console.error('Account background registration sync failed:', err);
            });
          }}
          activeTheme={activeTheme}
          beepVolume={profile.beepVolume}
          initialEmail="arahalkar@gmail.com"
          showCancel={true}
          onCancel={() => {
            playBeep(650, 0.05, profile.beepVolume);
            setAuthMode('gateway');
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${activeTheme.rootBg} flex flex-col font-sans transition-colors duration-300 selection:bg-orange-500 selection:text-white`}>
      
      {/* Premium Glassmorphic Header */}
      <header className={`sticky top-0 z-40 ${activeTheme.headerBg} backdrop-blur-md min-h-[64px] px-4 sm:px-6 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr ${activeTheme.gradientFromTo} shadow-md`}>
            <TrendingUp className={`w-5.5 h-5.5 ${profile.theme === 'amber-sunset' ? 'text-white' : 'text-black'} font-black stroke-[3]`} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-black tracking-tight ${activeTheme.headerText} flex items-center gap-1.5 leading-none`}>
              Velociloop <span className={`text-xs ${activeTheme.proBadge} px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}>PRO</span>
            </h1>
            <p className={`text-[10px] ${activeTheme.textSecondary} font-mono tracking-widest uppercase`}>Jump Rope Coach & Track</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Volume Toggle */}
          <button 
            onClick={() => {
              setProfile(p => ({ ...p, soundEnabled: !p.soundEnabled }));
              playBeep(850, 0.05, profile.soundEnabled ? 0 : 0.4);
            }}
            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold ${
              profile.soundEnabled 
                ? activeTheme.btnSecondary 
                : `bg-transparent opacity-40 border-transparent ${activeTheme.textMuted}`
            }`}
            title={profile.soundEnabled ? "Mute audio beeps" : "Unmute audio beeps"}
            id="global-volume-toggle"
          >
            {profile.soundEnabled ? <Volume2 className={`w-4 h-4 ${activeTheme.accentText}`} /> : <VolumeX className={`w-4 h-4 ${activeTheme.textMuted}`} />}
            <span className="hidden sm:inline">{profile.soundEnabled ? 'Sounds' : 'No Sound'}</span>
          </button>

          {/* Secure App Lock Button */}
          {athleteAccount && (
            <button
              onClick={() => {
                triggerAudioTick(450, 0.1);
                setIsCurrentlyLoggedIn(false);
              }}
              className={`p-2 rounded-xl border border-zinc-800 transition-all flex items-center gap-2 text-xs font-semibold ${activeTheme.btnSecondary} hover:bg-zinc-800`}
              title="Lock active athlete session"
              id="global-session-lock"
            >
              <Lock className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline">Lock App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24">
        
        {/* Dynamic active workout bar (Only shows if session is running but active tab is NOT 'trainer') */}
        {isSessionActive && activeTab !== 'trainer' && (
          <div className={`mb-6 p-4 bg-gradient-to-r ${activeTheme.gradientFromTo} rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${profile.theme === 'amber-sunset' ? 'text-stone-950' : 'text-black'} font-extrabold shadow-lg`}>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping"></span>
              <p className="text-sm">
                Active Workout: <span className="font-extrabold uppercase">{activeMode}</span> (Jumps: {jumpCount} | {formatDuration(totalSeconds)})
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('trainer')}
                className={`px-3 py-1 bg-black/80 hover:bg-black text-[11.5px] font-black uppercase rounded-lg ${profile.theme === 'amber-sunset' ? 'text-amber-500' : 'text-orange-400'}`}
              >
                Open Session
              </button>
              <button 
                onClick={handleFinishSession}
                className="px-3 py-1 bg-white/95 hover:bg-white text-black text-[11.5px] font-black uppercase rounded-lg"
              >
                Finish Task
              </button>
            </div>
          </div>
        )}

        {/* Layout Navigation Grid */}
        <div className="flex flex-col gap-6">
          
          {/* Main Visual Tabs Selector */}
          <div className={`flex items-center gap-1.5 p-1 ${activeTheme.tabContainerBg} rounded-2xl overflow-x-auto no-scrollbar scroll-smooth`}>
            <button
              onClick={() => { triggerAudioTick(650, 0.04); setActiveTab('dashboard'); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? activeTheme.tabActive 
                  : activeTheme.tabInactive
              }`}
              id="tab-dashboard"
            >
              <TrendingUp className={`w-4 h-4 ${activeTheme.accentText}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { triggerAudioTick(650, 0.04); setActiveTab('history'); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'history' 
                  ? activeTheme.tabActive 
                  : activeTheme.tabInactive
              }`}
              id="tab-history"
            >
              <History className={`w-4 h-4 ${activeTheme.accentText}`} />
              <span>Workout Logs</span>
            </button>

            <button
              onClick={() => { triggerAudioTick(650, 0.04); setActiveTab('leaderboard'); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'leaderboard' 
                  ? activeTheme.tabActive 
                  : activeTheme.tabInactive
              }`}
              id="tab-leaderboard"
            >
              <Trophy className={`w-4 h-4 ${activeTheme.accentText}`} />
              <span>Leaderboards</span>
            </button>

            <button
              onClick={() => { triggerAudioTick(650, 0.04); setActiveTab('achievements'); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'achievements' 
                  ? activeTheme.tabActive 
                  : activeTheme.tabInactive
              }`}
              id="tab-achievements"
            >
              <Award className={`w-4 h-4 ${activeTheme.accentText}`} />
              <span>Achievements</span>
            </button>

            <button
              onClick={() => { triggerAudioTick(650, 0.04); setActiveTab('settings'); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'settings' 
                  ? activeTheme.tabActive 
                  : activeTheme.tabInactive
              }`}
              id="tab-settings"
            >
              <SettingsIcon className={`w-4 h-4 ${activeTheme.accentText}`} />
              <span>Settings</span>
            </button>
          </div>

          {/* ACTIVE TAB DISPLAY AREA */}
          <div className="min-h-[500px]">
            
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <Dashboard workouts={workouts} profile={profile} onAddManualLog={handleQuickAddManualLog} />
            )}

            {/* TAB: LIVE TRAINER ENGINES */}
            {activeTab === 'trainer' && (
              <div className="space-y-6" id="trainer-display">
                
                {isLoggingPostWorkout ? (
                  /* POST WORKOUT SELF LOG REVIEW SCREEN */
                  <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center max-w-lg mx-auto" id="post-workout-review">
                    {profile.theme !== 'amber-sunset' && (
                      <>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                      </>
                    )}

                    <div className="text-center space-y-2 mb-6 w-full">
                      <span className="text-[10px] uppercase font-black px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-mono">
                        Self-Log Review
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white mt-3">
                        Workout Complete! 🎉
                      </h3>
                      <p className="text-xs text-zinc-400">
                        You completed <span className="font-extrabold text-orange-400 font-mono text-xs">{formatDuration(totalSeconds)}</span> of active skipping. Record your reps below:
                      </p>
                    </div>

                    <div className="w-full bg-zinc-900/40 border border-zinc-805 p-6 rounded-2xl space-y-5 shadow-xl">
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs font-semibold uppercase font-mono">
                          <label className="text-zinc-400">YOUR COMPLETED JUMPS</label>
                          <span className="text-orange-400 font-mono font-bold text-xs">{postWorkoutCount} jumps</span>
                        </div>
                        <input 
                          type="number"
                          required
                          min={1}
                          value={postWorkoutCount}
                          onChange={(e) => setPostWorkoutCount(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center text-lg font-black font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <div className="flex justify-between gap-2 mt-2">
                          {[100, 250, 500, 1000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPostWorkoutCount(val)}
                              className="flex-1 py-1.5 px-1 text-[11px] font-bold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-black hover:border-transparent transition-all cursor-pointer"
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase text-zinc-400 block mb-1 font-mono">
                          Workout Notes / Mood
                        </label>
                        <input 
                          type="text"
                          placeholder="My double-unders felt excellent! Legs are nice and warm."
                          value={postWorkoutNotes}
                          onChange={(e) => setPostWorkoutNotes(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono border-t border-zinc-800">
                        <span>EST. BURN RATE</span>
                        <span className="text-orange-400 font-bold text-sm">
                          ~{calculateCalories(totalSeconds, postWorkoutCount, profile.weightKg)} kcal
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-6 w-full">
                      <button
                        onClick={() => setIsLoggingPostWorkout(false)}
                        className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-bold transition-all text-xs uppercase cursor-pointer"
                      >
                        Go Back
                      </button>

                      <button
                        onClick={handleCommitPostWorkout}
                        className="flex-1 py-3 px-6 rounded-xl font-black bg-gradient-to-r from-orange-600 to-orange-500 text-black hover:opacity-95 transition-all text-xs uppercase shadow-lg shadow-orange-500/10 cursor-pointer"
                      >
                        Log Workout
                      </button>
                    </div>

                  </div>
                ) : !isSessionActive ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Configure form */}
                    <div className="md:col-span-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                      <h3 className="text-zinc-200 font-bold text-sm uppercase tracking-wider">Trainer Setup</h3>
                      
                      {/* Session Type */}
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-xs font-semibold uppercase">Workout Goal Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['quick', 'interval', 'target'] as WorkoutType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => { triggerAudioTick(600, 0.04); setActiveMode(t); }}
                              className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                                activeMode === t 
                                  ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' 
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {t === 'quick' ? 'Casual' : t === 'interval' ? 'Intervals' : 'Target'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Config conditional view details */}
                      {activeMode === 'interval' && (
                        <div className="space-y-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                          <span className="text-orange-400 font-mono text-xs font-bold uppercase">Interval Timers Setup</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block mb-1">JUMP TIME (SEC)</label>
                              <input 
                                type="number" 
                                min={5} 
                                value={intervalConfig.jumpTime} 
                                onChange={(e) => setIntervalConfig(c => ({...c, jumpTime: Number(e.target.value)}))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-100 text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 font-semibold block mb-1">REST TIME (SEC)</label>
                              <input 
                                type="number" 
                                min={5} 
                                value={intervalConfig.restTime} 
                                onChange={(e) => setIntervalConfig(c => ({...c, restTime: Number(e.target.value)}))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-100 text-center"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">ROUNDS / CYCLES</label>
                            <input 
                              type="number" 
                              min={1} 
                              value={intervalConfig.cycles} 
                              onChange={(e) => setIntervalConfig(c => ({...c, cycles: Number(e.target.value)}))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-100 text-center"
                            />
                          </div>
                        </div>
                      )}

                      {activeMode === 'target' && (
                        <div className="space-y-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                          <span className="text-orange-400 font-mono text-xs font-bold uppercase">Target Goal Criteria</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => { setTargetType('count'); setTargetValue(500); }}
                              className={`py-1.5 px-2 rounded-lg text-[10px] uppercase font-bold transition-all ${
                                targetType === 'count' ? 'bg-zinc-800 text-zinc-100' : 'bg-transparent text-zinc-500'
                              }`}
                            >
                              Jump Count
                            </button>
                            <button
                              onClick={() => { setTargetType('duration'); setTargetValue(300); }}
                              className={`py-1.5 px-2 rounded-lg text-[10px] uppercase font-bold transition-all ${
                                targetType === 'duration' ? 'bg-zinc-800 text-zinc-100' : 'bg-transparent text-zinc-500'
                              }`}
                            >
                              Duration
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              {targetType === 'count' ? 'TARGET JUMP REPS' : 'TARGET SECONDS'}
                            </label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min={10} 
                                step={10}
                                value={targetValue} 
                                onChange={(e) => setTargetValue(Number(e.target.value))}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-100 text-center"
                              />
                              <span className="text-xs font-bold text-zinc-400">
                                {targetType === 'count' ? 'jumps' : 'secs'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Counting Method Selection Block */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                        <label className="text-zinc-500 text-sm font-semibold uppercase block pb-1">Counting Method</label>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerAudioTick(600, 0.04);
                              setCountMethod('self-log');
                              setMetronomeEnabled(false);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                              countMethod === 'self-log'
                                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-base leading-none">⏱️</span>
                            <div>
                              <span className="font-extrabold text-[12px] block text-zinc-200">Self-Log Stopwatch (Default)</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Focus on jumping rope. Key in your real completed counts when finished.</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerAudioTick(600, 0.04);
                              setCountMethod('metronome');
                              setMetronomeEnabled(true);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                              countMethod === 'metronome'
                                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-base leading-none">🔔</span>
                            <div>
                              <span className="font-extrabold text-[12px] block text-zinc-200">Audio Metronome Autopilot</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Sounds ticks periodically and estimates jumps automatically from your target pace.</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerAudioTick(600, 0.04);
                              setCountMethod('tapper');
                              setMetronomeEnabled(false);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                              countMethod === 'tapper'
                                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-base leading-none">🎹</span>
                            <div>
                              <span className="font-extrabold text-[12px] block text-zinc-200">Interactive Jumps Tapper</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Press Spacebar or tap the screen button on every jump landing.</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Metronome Setup Pace Slider */}
                      {countMethod === 'metronome' && (
                        <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-2">
                          <div className="flex justify-between text-[10px] text-zinc-550 font-semibold uppercase tracking-wider">
                            <span>METRONOME PACE</span>
                            <span className="text-orange-400 font-bold font-mono">{metronomeBpm} JPI (Jumps/Min)</span>
                          </div>
                          <input 
                            type="range" 
                            min={65} 
                            max={215} 
                            step={5}
                            value={metronomeBpm} 
                            onChange={(e) => setMetronomeBpm(Number(e.target.value))}
                            className="w-full accent-orange-500 cursor-pointer text-orange-500"
                          />
                        </div>
                      )}

                      <button
                        onClick={handleStartSession}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-black py-4 rounded-xl font-black text-sm tracking-widest uppercase hover:opacity-90 shadow-lg shadow-orange-500/10 transition-all cursor-pointer active:scale-[0.99]"
                        id="start-workout-button"
                      >
                        Start Active Skipping Session
                      </button>
                    </div>

                    {/* Right: Informational tips panel/How it works */}
                    <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Interactive Tapper coaching</span>
                        <h2 className="text-xl font-black text-white leading-tight">Ready to Skip rope like a champion?</h2>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Whether practicing high-speed routines, tabata cardio burn, or target-driven endurance, Velociloop counts every single sync. 
                          Once started, you can:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col justify-between">
                            <span className="text-orange-400 font-bold text-xs font-mono">🎹 Standard Metronome</span>
                            <p className="text-[10px] text-zinc-400 mt-1">Configure your preferred rhythm pace. App automatically triggers real audio beeps and logs jump count calculations.</p>
                          </div>
                          <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col justify-between">
                            <span className="text-orange-400 font-bold text-xs font-mono">⌨️ Spacebar Or Tapping</span>
                            <p className="text-[10px] text-zinc-400 mt-1">Set down your phone or keyboard, and hit the **Spacebar** key or tap the screen circle on every landing to record counts with sound cues.</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-500/80" />
                          Calorie estimation relies on your weight profiles. Update in **Settings**.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  
                  /* ACTIVE TRAINER RUNNING PANEL */
                  <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center max-w-4xl mx-auto" id="active-session-workout">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Mode label & Status indicators */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full mb-6">
                      <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`}></span>
                      <span className="text-[10px] uppercase font-black text-zinc-300 tracking-wider">
                        {isPaused ? 'Paused' : 'Workout Live'} : {activeMode} Mode
                      </span>
                    </div>

                    {/* Interval Config Subtitle */}
                    {activeMode === 'interval' && (
                      <div className="text-center mb-4">
                        <span className="text-xs uppercase font-extrabold text-orange-400 tracking-widest block">
                          ROUND {currentCycle} of {intervalConfig.cycles}
                        </span>
                        <h4 className={`text-xl font-black uppercase tracking-tight mt-1 ${intervalPhase === 'jump' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {intervalPhase === 'jump' ? '⚡ JUMPING TIME' : '⏳ REST PHASE'}
                        </h4>
                      </div>
                    )}

                    {/* Target count bar */}
                    {activeMode === 'target' && (
                      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 mb-6 text-center text-xs">
                        <div className="flex justify-between items-center text-zinc-400 mb-1.5 font-bold">
                          <span>Target Progress</span>
                          <span className="text-orange-400 font-extrabold">
                            {targetType === 'count' ? `${jumpCount} / ${targetValue} jumps` : `${totalSeconds} / ${targetValue} secs`}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <div 
                            style={{ 
                              width: `${Math.min(100, Math.round(( (targetType === 'count' ? jumpCount : totalSeconds) / targetValue) * 100))}%` 
                            }}
                            className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-300"
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* TWO PRIMARY STATS DISPLAY HEADINGS */}
                    <div className="grid grid-cols-2 gap-8 sm:gap-14 text-center my-6 max-w-md w-full">
                      <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Time Elapsed</span>
                        <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                          {activeMode === 'interval' ? formatDuration(phaseSecondsLeft) : formatDuration(totalSeconds)}
                        </span>
                        {activeMode === 'interval' && (
                          <span className="text-[10px] text-zinc-500 mt-1">Total: {formatDuration(totalSeconds)}</span>
                        )}
                      </div>

                      <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Jumps Logged</span>
                        <span className="text-4xl sm:text-5xl font-black text-orange-400 font-mono tracking-tight animate-scale">
                          {jumpCount}
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-1">
                          Pace: {totalSeconds > 0 ? Math.round((jumpCount / (totalSeconds / 60))) : 0} JPM
                        </span>
                      </div>
                    </div>

                    {/* Live calorie ticker estimation */}
                    <div className="text-center text-xs text-zinc-500 font-mono mb-8 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Burns Estimated: </span>
                      <span className="text-zinc-200 font-extrabold">{calculateCalories(totalSeconds, jumpCount, profile.weightKg)} kcal</span>
                    </div>

                    {/* CORE CONTEXTUAL TRACKING STATS / WIDGET CONTAINER */}
                    {countMethod === 'self-log' ? (
                      /* DEEP FOCUS OFFLINE / MANUAL STOPWATCH METHOD */
                      <div className="p-6 bg-orange-500/5 border border-orange-500/15 rounded-2xl text-center max-w-sm mb-8 space-y-3.5 flex flex-col items-center shadow-lg" id="focus-selflog-view">
                        <div className="w-12 h-12 rounded-full border border-orange-500/20 bg-orange-500/5 flex items-center justify-center text-lg animate-pulse" id="selflog-icon">
                          ⏱️
                        </div>
                        <span className="text-[10px] font-bold text-orange-400 block tracking-widest uppercase font-mono">Deep Focus Stopwatch Active</span>
                        <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                          Eyes forward, posture tall, and skip undisturbed! Count your completed jumps in your head.
                        </p>
                        <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider font-mono">
                          Click Finish to type total reps!
                        </span>
                      </div>
                    ) : countMethod === 'metronome' ? (
                      /* METRONOME AUTOPILOT VISUAL STATUS CARD */
                      <div className="p-4 bg-orange-600/10 border border-orange-500/30 rounded-2xl text-center max-w-xs mb-8 space-y-2 animate-pulse" id="metronome-running-view">
                        <span className="text-[10px] font-black uppercase text-orange-400 block tracking-widest">METRONOME RUNNING</span>
                        <span className="text-sm font-bold text-zinc-200">{metronomeBpm} BPM ({(60000 / metronomeBpm / 1000).toFixed(2)}s interval)</span>
                        <p className="text-[10px] text-zinc-500 font-mono">The coach metronome is automatically playing coordinate sound beeps and accumulating target jump reps.</p>
                      </div>
                    ) : (
                      /* BIG INTERACTIVE TAPPER CIRCLE */
                      <div className="space-y-2 text-center mb-8" id="interactive-tapper-view">
                        <button
                          onClick={() => {
                            if (!isPaused) {
                              setJumpCount(c => c + 1);
                              triggerAudioTick(750, 0.03);
                            }
                          }}
                          disabled={isPaused}
                          className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-zinc-900 border-4 border-orange-500 hover:border-orange-400 active:bg-orange-500/10 flex flex-col items-center justify-center p-4 shadow-2xl shadow-orange-500/5 transition-all text-white select-none focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none">Tap Jumps Here</span>
                          <span className="text-xs text-zinc-400 mt-1.5 block">or press</span>
                          <span className="mt-2.5 bg-orange-500/20 text-orange-400 text-[11px] font-bold px-3 py-1 border border-orange-500/30 uppercase rounded-xl tracking-wider font-mono">
                            Spacebar
                          </span>
                        </button>
                      </div>
                    )}

                    {/* PRIMARY ACTION BUTTON CONTROLS ROW */}
                    <div className="flex items-center gap-4 flex-wrap justify-center w-full max-w-md">
                      <button
                        onClick={handlePauseToggle}
                        className={`py-3 px-6 rounded-xl font-bold flex items-center gap-2 border transition-all text-sm uppercase tracking-wide ${
                          isPaused 
                            ? 'bg-zinc-100 border-zinc-200 text-black hover:bg-zinc-200' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                        {isPaused ? 'Resume Session' : 'Pause'}
                      </button>

                      <button
                        onClick={handleFinishSession}
                        className="py-3 px-8 rounded-xl font-black bg-gradient-to-r from-orange-600 to-orange-500 text-black hover:opacity-90 shadow-md shadow-orange-500/10 transition-opacity text-sm uppercase tracking-wider"
                      >
                        Finish & Save Log
                      </button>

                      {!showDiscardConfirm ? (
                        <button
                          onClick={() => { triggerAudioTick(300, 0.2); setShowDiscardConfirm(true); }}
                          className="py-3 px-4 rounded-xl font-bold text-xs text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all uppercase tracking-wider cursor-pointer"
                        >
                          Discard
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-red-950/25 border border-red-900/35 p-1.5 rounded-xl animate-fade-in" id="discard-confirm-panel">
                          <span className="text-[10px] text-red-400 font-extrabold px-2 select-none uppercase tracking-wider font-mono">Discard Workout?</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDiscardSession();
                              setShowDiscardConfirm(false);
                            }}
                            className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] rounded-lg tracking-wider uppercase cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={() => { triggerAudioTick(500, 0.05); setShowDiscardConfirm(false); }}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] rounded-lg uppercase cursor-pointer"
                          >
                            Keep
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* TAB: JUMP ROPE LOGS HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6" id="history-display">
                
                {/* Upper History Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-zinc-200 font-bold text-sm uppercase tracking-wider">Historical Skips Log</h3>
                    <p className="text-xs text-zinc-500">View and edit notes for previous jump rope workout logs.</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { 
                        triggerAudioTick(750, 0.05); 
                        const newToday = new Date().toISOString().split('T')[0];
                        setManualDate(newToday);
                        setShowManualForm(!showManualForm); 
                      }}
                      className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center gap-2 uppercase tracking-wider"
                      id="manual-log-toggle"
                    >
                      <Plus className="w-4 h-4 text-orange-500" />
                      Add Manual Log
                    </button>

                    {!showClearConfirm ? (
                      <button
                        onClick={() => { triggerAudioTick(350, 0.1); setShowClearConfirm(true); }}
                        disabled={workouts.length === 0}
                        className="px-4 py-2.5 bg-zinc-950 border border-red-950/40 text-red-500/80 hover:bg-red-950/20 rounded-xl font-bold text-xs flex items-center gap-2 uppercase tracking-wide transition-all disabled:opacity-40 cursor-pointer"
                        id="clear-workouts-trigger"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        Clear Logs
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-red-950/25 border border-red-900/35 p-1 rounded-xl animate-fade-in" id="clear-workouts-confirm-panel">
                        <span className="text-[9.5px] text-red-400 font-extrabold px-1.5 select-none uppercase tracking-wider font-mono">Purge all logs?</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleClearHistory();
                            setShowClearConfirm(false);
                          }}
                          className="px-2.5 py-1.5 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] rounded-lg tracking-wider uppercase cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerAudioTick(500, 0.05); setShowClearConfirm(false); }}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] rounded-lg uppercase cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* MANUAL LOG DRAWER/FORM ACCORDION */}
                {showManualForm && (
                  <form onSubmit={handleAddManualLog} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4 max-w-2xl animate-fade-in" id="manual-log-form">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <span className="text-xs uppercase font-black text-orange-400 tracking-wider">Manual Skips logger</span>
                      <button 
                        type="button" 
                        onClick={() => setShowManualForm(false)}
                        className="text-zinc-500 hover:text-zinc-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold block mb-1">RECORDING DATE</label>
                        <input 
                          type="date"
                          required
                          disabled
                          value={manualDate}
                          className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2 text-sm text-zinc-500 cursor-not-allowed font-mono"
                          title="Locked to day of recording"
                        />
                        <span className="text-[9px] text-zinc-650 block mt-1">Locked to the day of recording.</span>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold block mb-1">JUMP COUNT</label>
                        <input 
                          type="number"
                          required
                          min={1}
                          value={manualCount}
                          onChange={(e) => setManualCount(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold block mb-1">DURATION (MINUTES)</label>
                        <input 
                          type="number"
                          required
                          min={1}
                          value={manualDurationMin}
                          onChange={(e) => setManualDurationMin(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold block mb-1">TYPE OF SESSION</label>
                        <select
                          value={manualType}
                          onChange={(e) => setManualType(e.target.value as WorkoutType)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200"
                        >
                          <option value="quick">Quick Workout</option>
                          <option value="interval">Interval Routine</option>
                          <option value="target">Goal Target Progress</option>
                          <option value="manual">Other Manual Entry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-semibold block mb-1">SESSION NOTES / INSIGHTS (OPTIONAL)</label>
                      <input 
                        type="text"
                        placeholder="Felt solid, rope was tangling a bit. Practice pace..."
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="bg-orange-500 text-black font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:opacity-95 shadow shadow-orange-500/10 transition-opacity"
                      >
                        Add Log entry
                      </button>
                    </div>
                  </form>
                )}

                {/* HISTORICAL WORKOUT LIST */}
                {workouts.length === 0 ? (
                  <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl p-10 text-center">
                    <p className="text-zinc-500 text-sm">No workout records found. Let's record your first energetic session! ⚡</p>
                  </div>
                ) : (
                  <div className="space-y-3" id="workouts-list">
                    {workouts.map((w) => {
                      const speedJpm = Math.round(w.count / (w.duration / 60));
                      return (
                        <div 
                          key={w.id} 
                          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-zinc-900"
                        >
                          <div className="flex items-start gap-4">
                            {/* Workout Type Colored Badge */}
                            <div className={`p-3 rounded-xl border flex items-center justify-center ${
                              w.type === 'interval' 
                                ? 'bg-indigo-950/40 border-indigo-500/20 text-indigo-400' 
                                : w.type === 'target'
                                  ? 'bg-amber-950/40 border-amber-500/20 text-amber-400'
                                  : 'bg-orange-950/40 border-orange-500/20 text-orange-400'
                            }`}>
                              <Flame className="w-5 h-5 fill-current" />
                            </div>

                            {/* Details header */}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs bg-zinc-850 text-zinc-300 font-bold px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-wider">
                                  {w.type === 'quick' ? 'Casual' : w.type}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-mono">{formatDate(w.date)}</span>
                              </div>
                              
                              <p className="text-xs text-zinc-400 mt-1.5 font-medium">
                                notes: <span className="text-zinc-300 font-normal italic">"{w.notes || 'No added notes.'}"</span>
                              </p>
                            </div>
                          </div>

                          {/* Stats Metrics Right Info Panel */}
                          <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                            
                            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-right">
                              <div>
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase leading-none mb-1">Skips</span>
                                <span className="text-sm font-black text-zinc-200 font-mono">{w.count}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase leading-none mb-1">Time</span>
                                <span className="text-sm font-black text-zinc-200 font-mono">{formatDuration(w.duration)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 font-bold block uppercase leading-none mb-1">Energy</span>
                                <span className="text-sm font-black text-orange-400 font-mono">{w.calories} kcal</span>
                              </div>
                            </div>

                            {/* Delete single log button with inline confirm state */}
                            {deletingWorkoutId === w.id ? (
                              <div className="flex items-center gap-1 animate-fade-in" id={`delete-single-workout-confirm-${w.id}`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteWorkout(w.id);
                                    setDeletingWorkoutId(null);
                                  }}
                                  className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white font-black text-[10.5px] rounded uppercase cursor-pointer"
                                >
                                  Del
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerAudioTick(550, 0.04);
                                    setDeletingWorkoutId(null);
                                  }}
                                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-[10.5px] rounded uppercase cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  triggerAudioTick(650, 0.05);
                                  setDeletingWorkoutId(w.id);
                                }}
                                className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/10 cursor-pointer"
                                title="Delete log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* TAB: AI COACH VELOCILOOP CHAT */}
            {activeTab === 'coach' && (
              <div className="space-y-6" id="coach-display">
                
                {/* Upper description / Disclaimer */}
                <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-zinc-200 text-sm font-bold flex items-center gap-2">
                        Velociloop Coach
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">ONLINE</span>
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Your server-side AI Coach generates advanced skipping combinations, stretching, or workouts personalized with your stats.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono">Powered by Gemini 3.5</span>
                </div>

                {/* Quick Prompts Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-900/20 p-3 rounded-2xl border border-zinc-900">
                  {coachPresets.map((p, idx) => (
                    <button
                      key={idx}
                      disabled={isCoachLoading}
                      onClick={() => handleSendMessage(p.prompt)}
                      className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-orange-500/40 text-left hover:bg-zinc-950 transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <h5 className="text-xs font-black text-white group-hover:text-orange-400 transition-colors">{p.label}</h5>
                      <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">Click to generate routines detailing progression steps.</p>
                    </button>
                  ))}
                </div>

                {/* Chat feed box container */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col h-[500px] overflow-hidden" id="coach-chat-window">
                  
                  {/* Message displays body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-normal text-sm no-scrollbar">
                    {coachHistory.map((item, index) => (
                      <div 
                        key={index} 
                        className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div className={`max-w-[85%] rounded-2xl p-4 leading-relaxed prose prose-invert ${
                          item.role === 'user'
                            ? 'bg-zinc-800 border border-zinc-700/60 text-zinc-100 rounded-tr-none'
                            : 'bg-zinc-950/80 border border-zinc-850 text-zinc-200 rounded-tl-none font-normal'
                        }`}>
                          
                          {/* Render paragraph chunks neatly as inline format helper */}
                          <div className="whitespace-pre-wrap text-xs sm:text-sm inline-block w-full">
                            {item.text}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Loader */}
                    {isCoachLoading && (
                      <div className="flex justify-start animate-pulse">
                        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl rounded-tl-none p-4 text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
                          <span>Velociloop Coach is drafting your routine...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input form submit area */}
                  <div className="p-4 border-t border-zinc-805 bg-zinc-950/50 flex gap-2">
                    <input 
                      type="text"
                      placeholder="Ask gym schedules, double-under secrets, dynamic stretching hacks..."
                      value={coachPrompt}
                      onChange={(e) => setCoachPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isCoachLoading}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isCoachLoading || !coachPrompt.trim()}
                      className="bg-orange-500 text-black px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-40 hover:opacity-95"
                    >
                      Send Message
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: LEADERBOARDS */}
            {activeTab === 'leaderboard' && (
              <Leaderboard workouts={workouts} profile={profile} athleteAccount={athleteAccount} />
            )}

            {/* TAB: ACHIEVEMENTS */}
            {activeTab === 'achievements' && (
              <Achievements workouts={workouts} profile={profile} activeTheme={activeTheme} />
            )}

            {/* TAB: SETTINGS & PROFILE PREFERENCES */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-3xl mx-auto" id="settings-display">
                
                <div className={`${activeTheme.cardBg} rounded-2xl p-6 space-y-6`}>
                  
                  <div>
                    <h3 className={`${activeTheme.textPrimary} font-bold text-sm uppercase tracking-wider`}>Profile & Preferences</h3>
                    <p className={`text-xs ${activeTheme.textSecondary}`}>Configure parameters used to calculate active caloric burn rate structures.</p>
                  </div>

                  {/* Athlete Avatar Configuration */}
                  {athleteAccount && (
                    <div className={`space-y-3 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`}>
                      <label className={`text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider block font-mono`}>
                        ATHLETE AVATAR
                      </label>
                      <p className={`text-xs ${activeTheme.textMuted}`}>
                        Select your digital skipper identity displaying across the profile and leaderboard ranks.
                      </p>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
                        {AVATARS.map((av, idx) => {
                          const isSelected = athleteAccount.avatarIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setAthleteAccount(prev => prev ? { ...prev, avatarIndex: idx } : null);
                                triggerAudioTick(700 + idx * 30, 0.05);
                              }}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all relative ${
                                isSelected 
                                  ? 'border-orange-500 bg-orange-500/10 scale-105 shadow-md shadow-orange-500/5' 
                                  : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                              }`}
                              title={av.label}
                            >
                              <span className="text-2xl select-none mb-1">{av.emoji}</span>
                              <span className="text-[9px] font-bold text-center text-zinc-400 truncate w-full">{av.label.split(' ')[0]}</span>
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-black font-black">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Current selection: <span className="font-extrabold text-orange-400">{AVATARS[athleteAccount.avatarIndex]?.label || 'Standard'}</span> — {AVATARS[athleteAccount.avatarIndex]?.description || ''}.
                      </p>
                    </div>
                  )}

                  {/* Athlete PIN Configuration */}
                  {athleteAccount && (
                    <div className={`space-y-4 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`} id="athlete-pin-config">
                      <label className={`text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider block font-mono`}>
                        ⚙️ CHANGE ATHLETE SECURITY PIN
                      </label>
                      <p className={`text-xs ${activeTheme.textMuted}`}>
                        Update your 4-digit passcode required to unlock your session upon application entry.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {/* Current PIN */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold text-zinc-400 block font-mono">Current 4-Digit PIN</label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="● ● ● ●"
                            value={currentPinInput}
                            onChange={(e) => {
                              setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                              setPinChangeError('');
                              setPinChangeSuccess('');
                            }}
                            className={`w-full p-2.5 rounded-xl ${activeTheme.innerBg} ${activeTheme.textPrimary} text-xs font-black font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-orange-500`}
                          />
                        </div>

                        {/* New PIN */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold text-zinc-400 block font-mono">New 4-Digit PIN</label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="● ● ● ●"
                            value={newPinInput}
                            onChange={(e) => {
                              setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                              setPinChangeError('');
                              setPinChangeSuccess('');
                            }}
                            className={`w-full p-2.5 rounded-xl ${activeTheme.innerBg} ${activeTheme.textPrimary} text-xs font-black font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-orange-500`}
                          />
                        </div>

                        {/* Verify New PIN */}
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-bold text-zinc-400 block font-mono">Verify New PIN</label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="● ● ● ●"
                            value={confirmNewPinInput}
                            onChange={(e) => {
                              setConfirmNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                              setPinChangeError('');
                              setPinChangeSuccess('');
                            }}
                            className={`w-full p-2.5 rounded-xl ${activeTheme.innerBg} ${activeTheme.textPrimary} text-xs font-black font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-orange-500`}
                          />
                        </div>
                      </div>

                      {pinChangeError && (
                        <p className="text-[11px] text-red-500 font-bold tracking-tight animate-pulse">
                          ⚠️ {pinChangeError}
                        </p>
                      )}

                      {pinChangeSuccess && (
                        <p className="text-[11px] text-emerald-500 font-extrabold tracking-tight">
                          ✓ {pinChangeSuccess}
                        </p>
                      )}

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentPinInput !== athleteAccount.pin) {
                              triggerAudioTick(300, 0.2);
                              setPinChangeError('The current PIN entered is incorrect.');
                              return;
                            }
                            if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
                              triggerAudioTick(300, 0.2);
                              setPinChangeError('Your new security PIN must be exactly 4 digits.');
                              return;
                            }
                            if (newPinInput !== confirmNewPinInput) {
                              triggerAudioTick(300, 0.2);
                              setPinChangeError('The new PIN verification digits do not match.');
                              return;
                            }

                            // Success update
                            const updatedAcct = { ...athleteAccount, pin: newPinInput };
                            setAthleteAccount(updatedAcct);
                            localStorage.setItem('jumprope_athlete_account', JSON.stringify(updatedAcct));
                            triggerAudioTick(1100, 0.3);
                            setPinChangeSuccess('Athlete security PIN upgraded successfully!');
                            setCurrentPinInput('');
                            setNewPinInput('');
                            setConfirmNewPinInput('');
                          }}
                          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-orange-500 text-black hover:opacity-95 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 focus:ring-1 focus:ring-offset-1"
                        >
                          Upgrade PIN Passcode
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Weight Configuration */}
                  <div className={`space-y-3.5 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`} id="athlete-weight-selection-panel">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <label className={`text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider block font-mono`}>
                        ⚖️ ATHLETE BODY WEIGHT
                      </label>

                      {/* KG vs LBS toggle selector */}
                      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 w-fit" id="weight-unit-selection-bar">
                        <button
                          type="button"
                          onClick={() => {
                            triggerAudioTick(600, 0.05);
                            setProfile(p => ({ ...p, weightUnit: 'kg' }));
                          }}
                          className={`px-3.5 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            (profile.weightUnit || 'kg') === 'kg'
                              ? 'bg-zinc-850 text-white border border-zinc-800 shadow'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Kilograms (kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerAudioTick(650, 0.05);
                            setProfile(p => ({ ...p, weightUnit: 'lbs' }));
                          }}
                          className={`px-3.5 py-1 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            (profile.weightUnit || 'kg') === 'lbs'
                              ? 'bg-zinc-850 text-white border border-zinc-800 shadow'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Pounds (lbs)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input 
                          type="number"
                          min={(profile.weightUnit || 'kg') === 'lbs' ? 66 : 30}
                          max={(profile.weightUnit || 'kg') === 'lbs' ? 550 : 250}
                          value={
                            (profile.weightUnit || 'kg') === 'lbs'
                              ? Math.round(profile.weightKg * 2.20462)
                              : profile.weightKg
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if ((profile.weightUnit || 'kg') === 'lbs') {
                              // Convert lbs input to kg under the hood
                              const computedKg = Math.round((val / 2.20462) * 10) / 10;
                              setProfile(p => ({ ...p, weightKg: computedKg }));
                            } else {
                              setProfile(p => ({ ...p, weightKg: val }));
                            }
                          }}
                          className={`${activeTheme.innerBg} rounded-xl p-3 ${activeTheme.textPrimary} w-32 font-bold font-mono text-center focus:ring-1 focus:ring-orange-505 focus:outline-none`}
                          id="weight-numeric-input"
                        />
                        <span className="absolute right-3.5 top-3.5 text-[10.5px] font-black uppercase font-mono text-zinc-500 pointer-events-none">
                          {profile.weightUnit || 'kg'}
                        </span>
                      </div>
                      <span className={`${activeTheme.textMuted} text-xs leading-tight col-span-2 max-w-sm`}>
                        Used in MET calorie burn calculations. Moderately standard speeds estimate ~11.8 METs.
                      </span>
                    </div>
                  </div>

                  {/* Daily Target Reps Option */}
                  <div className={`space-y-2 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`}>
                    <label className={`text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider block`}>DAILY TARGET SKIP REPS</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                        value={profile.dailyTarget}
                        onChange={(e) => setProfile(p => ({ ...p, dailyTarget: Number(e.target.value) }))}
                        className={`${activeTheme.innerBg} rounded-xl p-3 ${activeTheme.textPrimary} w-32 font-bold font-mono`}
                      />
                      <span className={`${activeTheme.textMuted} text-xs col-span-2 leading-tight`}>
                        Configures progress bounds represented on your ring dashboard.
                      </span>
                    </div>
                  </div>

                  {/* Master Volume Slider */}
                  <div className={`space-y-3 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`}>
                    <div className={`flex justify-between items-center text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider`}>
                      <span>BEEP MASTER VOLUME</span>
                      <span className={activeTheme.accentText}>{Math.round(profile.beepVolume * 100)} %</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={profile.beepVolume}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setProfile(p => ({ ...p, beepVolume: val }));
                          playBeep(650, 0.05, val);
                        }}
                        className={`flex-1 cursor-pointer hover:opacity-90 ${
                          profile.theme === 'cyber-radiant' 
                            ? 'accent-fuchsia-500' 
                            : profile.theme === 'nordic-frost' 
                              ? 'accent-emerald-500' 
                              : profile.theme === 'amber-sunset' 
                                ? 'accent-amber-600' 
                                : 'accent-orange-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Visual Theme Configuration Block */}
                  <div className={`space-y-3 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'} pt-4`}>
                    <label className={`text-xs font-bold ${activeTheme.textSecondary} uppercase tracking-wider block`}>APPLICATION VISUAL SCHEMA / DESIGN</label>
                    <p className={`text-xs ${activeTheme.textMuted} mb-3`}>
                      Switch the color layout, typography pairings, stats meters, and interactive visual charts throughout your account.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                      {(Object.keys(themes) as AppTheme[]).map((themeKey) => {
                        const themeOption = themes[themeKey];
                        const isSelected = (profile.theme || 'cosmic-slate') === themeKey;
                        return (
                          <button
                            key={themeKey}
                            onClick={() => {
                              setProfile(p => ({ ...p, theme: themeKey }));
                              playBeep(750, 0.08, profile.beepVolume);
                            }}
                            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isSelected 
                                ? `${themeOption.cardBg} border shadow-lg ring-2 ${
                                    themeKey === 'amber-sunset' 
                                      ? 'border-amber-605 ring-amber-600 ring-offset-2 ring-offset-[#fafaf6]' 
                                      : 'border-fuchsia-500/80 ring-current ring-offset-2 ring-offset-black'
                                  }` 
                                : `${themeOption.innerBg} opacity-70 hover:opacity-100`
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`font-black text-xs ${themeOption.textPrimary}`}>{themeOption.name}</span>
                                {isSelected && (
                                  <span className={`text-[9px] ${themeOption.proBadge} px-2 py-0.5 rounded-full uppercase font-black tracking-widest`}>
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] ${themeOption.textSecondary} mt-1.5 leading-relaxed`}>
                                {themeOption.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-3">
                              <span className={`w-3.5 h-3.5 rounded-full ${themeOption.accentBg} border border-neutral-500/10`} title="Accent Main"></span>
                              <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${themeOption.gradientFromTo} border border-neutral-500/10`} title="Glow spectrum"></span>
                              <span className={`text-[9px] font-mono ${themeOption.textMuted} uppercase tracking-widest ml-1`}>{themeKey.replace('-', ' ')}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Premium sound test diagnostics */}
                  <div className={`p-3.5 ${activeTheme.innerBg} rounded-xl flex items-center justify-between gap-4`}>
                    <div className="text-xs">
                      <span className={`font-bold ${activeTheme.textSecondary} block mb-0.5`}>Diagnose Audio Context</span>
                      <span className={activeTheme.textMuted}>Confirm if you can hear active clicks and interval alert sound structures during exercises.</span>
                    </div>
                    <button
                      onClick={() => playBeep(850, 0.1, profile.beepVolume)}
                      className={`${activeTheme.btnSecondary} px-3 py-1.5 rounded-lg active:scale-95 transition-all text-[11px] font-bold uppercase tracking-wider`}
                    >
                      Test Audio beep
                    </button>
                  </div>

                  {/* Account Security & Reset Panel */}
                  <div className={`p-4 bg-red-650/5 border border-red-500/15 rounded-xl space-y-4 pt-4 mt-4 border-t ${profile.theme === 'amber-sunset' ? 'border-stone-300' : 'border-zinc-800/60'}`}>
                    <div>
                      <span className="text-[10px] font-black uppercase text-red-500 block tracking-wider font-mono">
                        ⚙️ Danger Zone & Account Access Management
                      </span>
                      <p className={`text-xs ${activeTheme.textMuted} mt-1`}>
                        Locally lock active profile sessions, trigger secure logouts, or format athlete system credentials recursively.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                    <div className="flex flex-col gap-3.5" id="danger-actions-wrapper">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            triggerAudioTick(450, 0.1);
                            setIsCurrentlyLoggedIn(false);
                          }}
                          className="px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-xs font-bold text-zinc-300 uppercase tracking-wider transition-colors active:scale-95 cursor-pointer font-mono"
                        >
                          Lock App Now
                        </button>

                        {!showLogoutConfirm ? (
                          <button
                            onClick={() => {
                              triggerAudioTick(400, 0.1);
                              setShowLogoutConfirm(true);
                              setShowFormatConfirm(false);
                            }}
                            className="px-3.5 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 cursor-pointer font-mono"
                          >
                            Log Out Athlete
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 p-1.5 rounded-xl animate-fade-in">
                            <span className="text-[10.5px] text-red-400 font-extrabold px-1 select-none font-mono tracking-tight">LOGOUT ACCOUNT?</span>
                            <button
                              type="button"
                              onClick={() => {
                                triggerAudioTick(350, 0.15);
                                setAthleteAccount(null);
                                setAuthMode('gateway');
                                setIsCurrentlyLoggedIn(false);
                                setWorkouts(getInitialWorkouts());
                                setProfile({
                                  weightKg: 72,
                                  dailyTarget: 1000,
                                  beepVolume: 0.5,
                                  soundEnabled: true,
                                  theme: 'cosmic-slate'
                                });
                                setShowLogoutConfirm(false);
                              }}
                              className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white font-black text-[10.5px] rounded-lg tracking-wider uppercase cursor-pointer"
                            >
                              Logout
                            </button>
                            <button
                              type="button"
                              onClick={() => { triggerAudioTick(500, 0.05); setShowLogoutConfirm(false); }}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-805 text-zinc-350 font-semibold text-[10.5px] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {!showFormatConfirm && !showLogoutConfirm && (
                          <button
                            onClick={() => {
                              triggerAudioTick(350, 0.15);
                              setShowFormatConfirm(true);
                              setFormatResetInput('');
                            }}
                            className="px-3.5 py-2.5 rounded-lg bg-red-650 text-white hover:bg-red-700 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer font-mono"
                          >
                            Format Account
                          </button>
                        )}
                      </div>

                      {/* Expandable Factory Reset confirmation sub-panel */}
                      {showFormatConfirm && (
                        <div className="p-4 rounded-xl bg-red-955/20 border border-red-900/35 space-y-3.5 max-w-md animate-fade-in" id="format-factory-confirm-block">
                          <span className="text-xs font-black uppercase text-red-400 tracking-wide block font-mono">
                            ⚠️ DANGER: COMPLETE PROFILE WIPEOUT
                          </span>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            This will securely erase your athlete login credentials, PIN passcode, and wipe all training history records permanently. This action is <strong>irreversible</strong>.
                          </p>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-400 font-semibold block font-mono">
                              TYPE <strong className="text-red-400">"RESET"</strong> TO VERIFY ACTION:
                            </label>
                            <input
                              type="text"
                              value={formatResetInput}
                              onChange={(e) => setFormatResetInput(e.target.value)}
                              placeholder='RESET'
                              className="w-full p-2 rounded-lg bg-zinc-950 border border-red-905 focus:outline-none focus:border-red-650 text-white font-mono text-center font-black uppercase text-xs tracking-widest placeholder-zinc-700"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={formatResetInput.trim() !== 'RESET'}
                              onClick={() => {
                                triggerAudioTick(200, 0.4);
                                setFormatResetInput('');
                                setAthleteAccount(null);
                                setAuthMode('gateway');
                                setIsCurrentlyLoggedIn(false);
                                setWorkouts([]);
                                localStorage.clear();
                                setShowFormatConfirm(false);
                              }}
                              className="px-4 py-2 bg-red-650 font-black text-white rounded-lg text-xs tracking-wider uppercase transition-all disabled:opacity-30 disabled:pointer-events-none hover:bg-red-700 cursor-pointer"
                            >
                              Format Everything
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerAudioTick(500, 0.05);
                                setShowFormatConfirm(false);
                                setFormatResetInput('');
                              }}
                              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 font-bold rounded-lg text-xs uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* Humble Footer */}
      <footer className={`mt-auto border-t ${
        profile.theme === 'amber-sunset' 
          ? 'border-stone-200 bg-[#f4f4ee] text-stone-600' 
          : 'border-zinc-900 bg-zinc-950 text-zinc-500'
      } p-6 text-center text-xs font-mono`}>
        <p>© 2026 Velociloop. Real-time Rhythmic Coaching & Tracking.</p>
        <p className="mt-1 opacity-60">Maintain your daily jump streaks and break lifetime barriers.</p>
      </footer>

    </div>
  );
}
