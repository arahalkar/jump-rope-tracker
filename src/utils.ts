/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Workout } from './types';

// Calculate calories based on duration, jump count, and body weight using standard METs.
// Jump roping at moderate to fast speeds has a MET of ~11.5 - 12.5.
// Calories = MET * 3.5 * weightKg / 200 * (duration_minutes)
export function calculateCalories(durationSeconds: number, count: number, weightKg: number): number {
  if (durationSeconds <= 0 || count <= 0) return 0;
  
  const minutes = durationSeconds / 60;
  const jumpsPerMinute = count / minutes;
  
  let met = 8.8; // Moderate slow (<100 jumps/min)
  if (jumpsPerMinute >= 100 && jumpsPerMinute < 120) {
    met = 11.8; // Standard pace
  } else if (jumpsPerMinute >= 120) {
    met = 12.5; // High intensity
  }
  
  const kcalResult = met * 3.5 * weightKg / 200 * minutes;
  return Math.round(kcalResult * 10) / 10;
}

// Format duration into hh:mm:ss or mm:ss
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

// Format date into human readable forms
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Otherwise standard short date format
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + 
    ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Beep sounds using Web Audio API for rhythmic coaching or interval transitions
let audioCtx: AudioContext | null = null;
export function playBeep(frequency: number, durationSeconds: number, volume: number) {
  if (volume <= 0) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Ensure Context is resumed (browsers block autoplay)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Smooth volume fade-out to prevent popping artifacts
    gainNode.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationSeconds);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + durationSeconds);
  } catch (e) {
    console.warn('AudioContext failed to trigger beep:', e);
  }
}

// Generate premium mock jump roping logs so the statistics page immediately comes alive in 2026!
export function getInitialWorkouts(): Workout[] {
  return [
    {
      id: 'mock-1',
      date: '2026-06-07T08:15:00.000Z',
      duration: 360,
      count: 720,
      calories: 78.4,
      type: 'quick',
      notes: "Morning warm-up session. Felt high energy today!"
    },
    {
      id: 'mock-2',
      date: '2026-06-08T17:30:00.000Z',
      duration: 900,
      count: 1800,
      calories: 202.5,
      type: 'target',
      notes: "Target session of 1800 jumps completed successfully!"
    },
    {
      id: 'mock-3',
      date: '2026-06-09T09:00:00.000Z',
      duration: 600,
      count: 1100,
      calories: 120.3,
      type: 'quick',
      notes: "Quick sweat session before study time."
    },
    {
      id: 'mock-4',
      date: '2026-06-10T18:45:00.000Z',
      duration: 1200,
      count: 2400,
      calories: 270.2,
      type: 'interval',
      notes: "Tabata styled high-burn intervals. Extremely tired!"
    },
    {
      id: 'mock-5',
      date: '2026-06-11T12:00:00.000Z',
      duration: 500,
      count: 1000,
      calories: 109.8,
      type: 'target',
      notes: "Hit exactly 1000 jumps to maintain my daily streak."
    }
  ];
}
