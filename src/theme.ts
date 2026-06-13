/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppTheme } from './types';

export interface VisualTheme {
  id: AppTheme;
  name: string;
  description: string;
  rootBg: string;
  headerBg: string;
  headerText: string;
  cardBg: string;
  innerBg: string;
  tabContainerBg: string;
  tabActive: string;
  tabInactive: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  gradientFromTo: string;
  proBadge: string;
  btnPrimary: string;
  btnSecondary: string;
  ringBg: string;
  ringFg: string;
  shadowSm: string;
  chartBarActive: string;
  chartBarInactive: string;
}

export const themes: Record<AppTheme, VisualTheme> = {
  'cosmic-slate': {
    id: 'cosmic-slate',
    name: 'Cosmic Slate',
    description: 'The elegant original dark theme with energetic orange/amber accents.',
    rootBg: 'bg-black text-zinc-100',
    headerBg: 'bg-zinc-950/80 border-b border-zinc-800/80',
    headerText: 'text-white',
    cardBg: 'bg-zinc-900/60 border border-zinc-800/80',
    innerBg: 'bg-zinc-950/50 border border-zinc-800/60',
    tabContainerBg: 'bg-zinc-900/80 border border-zinc-800/80',
    tabActive: 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60',
    tabInactive: 'text-zinc-400 hover:text-zinc-200',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-500',
    accentBg: 'bg-orange-500',
    accentText: 'text-orange-400',
    accentBorder: 'border-orange-500/30',
    gradientFromTo: 'from-orange-600 to-amber-500',
    proBadge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    btnPrimary: 'bg-gradient-to-r from-orange-600 to-amber-500 text-black',
    btnSecondary: 'bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800',
    ringBg: 'text-zinc-800',
    ringFg: 'text-orange-500',
    shadowSm: 'shadow shadow-orange-500/10',
    chartBarActive: 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-lg shadow-orange-500/20',
    chartBarInactive: 'bg-zinc-800 hover:bg-zinc-700'
  },
  'cyber-radiant': {
    id: 'cyber-radiant',
    name: 'Cyber Radiant',
    description: 'A vibrant retro-future dark arcade theme with hot pink and neon cyan.',
    rootBg: 'bg-[#060112] text-fuchsia-50',
    headerBg: 'bg-[#0f0525]/90 border-b border-fuchsia-950/80',
    headerText: 'text-fuchsia-100',
    cardBg: 'bg-[#12062b]/70 border border-fuchsia-950/60 shadow-md shadow-fuchsia-950/15',
    innerBg: 'bg-[#1c083e]/50 border border-fuchsia-900/40',
    tabContainerBg: 'bg-[#110526]/90 border border-fuchsia-950/85',
    tabActive: 'bg-fuchsia-950/40 text-fuchsia-200 shadow-sm border border-fuchsia-800/40',
    tabInactive: 'text-fuchsia-400 hover:text-fuchsia-200',
    textPrimary: 'text-fuchsia-50',
    textSecondary: 'text-violet-300',
    textMuted: 'text-violet-400/80',
    accentBg: 'bg-fuchsia-600',
    accentText: 'text-fuchsia-400',
    accentBorder: 'border-fuchsia-500/30',
    gradientFromTo: 'from-fuchsia-600 to-cyan-400',
    proBadge: 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30',
    btnPrimary: 'bg-gradient-to-r from-fuchsia-600 to-cyan-400 text-black',
    btnSecondary: 'bg-[#1c083dd5] border border-fuchsia-900/60 text-fuchsia-200 hover:bg-[#250d4f]',
    ringBg: 'text-[#1c0b39]',
    ringFg: 'text-fuchsia-500',
    shadowSm: 'shadow shadow-fuchsia-500/10',
    chartBarActive: 'bg-gradient-to-t from-fuchsia-600 to-cyan-400 shadow-lg shadow-fuchsia-500/25',
    chartBarInactive: 'bg-[#1c083e] hover:bg-[#2e125c]'
  },
  'nordic-frost': {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'A clean, icy dark deep-marine theme with cool teal and emerald green accents.',
    rootBg: 'bg-[#060f14] text-slate-100',
    headerBg: 'bg-[#09151c]/90 border-b border-teal-950/80',
    headerText: 'text-teal-50',
    cardBg: 'bg-[#0d212b]/80 border border-slate-800/70 shadow-md shadow-[#040a0e]/50',
    innerBg: 'bg-[#071319]/80 border border-teal-950/50',
    tabContainerBg: 'bg-[#0b1b23]/90 border border-teal-950/80',
    tabActive: 'bg-[#132c39] text-teal-100 shadow-sm border border-teal-800/40',
    tabInactive: 'text-slate-400 hover:text-teal-200',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/30',
    gradientFromTo: 'from-teal-500 to-emerald-400',
    proBadge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    btnPrimary: 'bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950',
    btnSecondary: 'bg-[#0d212b] border border-slate-700/60 text-slate-200 hover:bg-[#132c39]',
    ringBg: 'text-[#071319]',
    ringFg: 'text-teal-400',
    shadowSm: 'shadow shadow-teal-500/10',
    chartBarActive: 'bg-gradient-to-t from-teal-500 to-emerald-400 shadow-lg shadow-teal-500/20',
    chartBarInactive: 'bg-[#183544] hover:bg-[#1e4254]'
  },
  'amber-sunset': {
    id: 'amber-sunset',
    name: 'Amber Sunset (Warm Light)',
    description: 'A luxurious cream-colored light editorial theme with rich charcoal text and warm clay highlights.',
    rootBg: 'bg-[#fafaf6] text-stone-900',
    headerBg: 'bg-[#f4f4ee]/90 border-b border-stone-200/80',
    headerText: 'text-stone-950 font-bold',
    cardBg: 'bg-[#f4f4ee] border border-stone-200 shadow-md shadow-stone-100/50',
    innerBg: 'bg-stone-50 border border-stone-200',
    tabContainerBg: 'bg-[#efefe8] border border-stone-200',
    tabActive: 'bg-white text-stone-950 shadow-sm border border-stone-300',
    tabInactive: 'text-stone-600 hover:text-stone-900',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-600',
    textMuted: 'text-stone-500',
    accentBg: 'bg-amber-600',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-600/30',
    gradientFromTo: 'from-amber-600 to-amber-500',
    proBadge: 'bg-amber-600/10 text-amber-700 border border-amber-600/20',
    btnPrimary: 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950',
    btnSecondary: 'bg-stone-100 border border-stone-300 text-stone-800 hover:bg-stone-200',
    ringBg: 'text-stone-200',
    ringFg: 'text-amber-600',
    shadowSm: 'shadow shadow-amber-600/10',
    chartBarActive: 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/20',
    chartBarInactive: 'bg-stone-200 hover:bg-[#e4e4db]'
  }
};
