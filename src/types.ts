/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkoutType = 'quick' | 'interval' | 'target' | 'manual';
export type AppTheme = 'cosmic-slate' | 'cyber-radiant' | 'nordic-frost' | 'amber-sunset';

export interface Workout {
  id: string;
  date: string; // ISO String
  duration: number; // in seconds
  count: number; // jump count
  calories: number; // estimated kcal burned
  type: WorkoutType;
  notes?: string;
}

export interface UserProfile {
  weightKg: number;
  weightUnit?: 'kg' | 'lbs';
  dailyTarget: number;
  beepVolume: number; // 0 to 1
  soundEnabled: boolean;
  theme?: AppTheme;
}

export interface IntervalConfig {
  jumpTime: number; // seconds
  restTime: number; // seconds
  cycles: number;
}
