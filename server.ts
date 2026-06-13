/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

dotenv.config();

let appDirname = '';
try {
  appDirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  appDirname = process.cwd();
}

const app = express();
app.use(express.json());

// Server-side initialization of Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// AI Coaching advice endpoint proxying Gemini API requests safely
app.post('/api/coach', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
    }
    const { prompt, workoutHistory, profile } = req.body;
    
    const systemInstruction = `You are a motivating, elite certified Jump Rope Coach & fitness trainer.
Your name is "Velociloop Coach". You provide custom routines, skill tutorials (double unders, boxer steps, footwork, speed skippings), fat burn routines, and safety/stretching advice.
Always be energetic, practical, and clear. Limit responses to 3-4 highly structured paragraphs or bullet lists with neat markdown.
Avoid generic text. Customize advice based on athlete statistics below if helpful:
- Current Body Weight: ${profile?.weightKg || 75} kg
- Daily Goal target: ${profile?.dailyTarget || 1000} jumps per day
- Recent Workouts logged: ${JSON.stringify(workoutHistory || [])}
Keep instructions highly visual and easy to scan!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt || "Give me a 10 minute beginner skip workout program.",
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Coaching API failed:', error);
    res.status(500).json({ error: error?.message || 'Failed to contact your AI Coach. Try again.' });
  }
});

// Detect serverless environment (like Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

// On serverless, use the writable /tmp directory to read/write accounts database
const ACCOUNTS_FILE = isServerless
  ? path.join('/tmp', 'accounts.json')
  : path.join(appDirname, 'accounts.json');

const readAccounts = () => {
  try {
    // If running in a serverless env like Vercel and the writable storage doesn't exist yet,
    // seed it by copy-cloning the read-only accounts.json from the deployment repository
    if (isServerless && !fs.existsSync(ACCOUNTS_FILE)) {
      const repoDbPath = path.join(appDirname, 'accounts.json');
      if (fs.existsSync(repoDbPath)) {
        fs.writeFileSync(ACCOUNTS_FILE, fs.readFileSync(repoDbPath, 'utf8'), 'utf8');
      } else {
        const repoDbPath2 = path.join(process.cwd(), 'accounts.json');
        if (fs.existsSync(repoDbPath2)) {
          fs.writeFileSync(ACCOUNTS_FILE, fs.readFileSync(repoDbPath2, 'utf8'), 'utf8');
        }
      }
    }

    if (fs.existsSync(ACCOUNTS_FILE)) {
      const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading accounts database:', e);
  }
  return [];
};

const writeAccounts = (accounts: any[]) => {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing accounts database:', e);
  }
};

app.get('/api/leaderboard', (req, res) => {
  const list = readAccounts();
  // Exclude sensitive details from general public view
  const publicList = list.map(({ pin, securityAnswer, workouts, ...p }: any) => p);
  res.json(publicList);
});

app.post('/api/accounts/register', (req, res) => {
  try {
    const { id, username, pin, avatarIndex, securityQuestion, securityAnswer, weightKg, dailyTarget, workouts, theme, streak, totalJumps } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN are required.' });
    }

    let list = readAccounts();
    
    // Check if username already taken
    const otherUser = list.find((a: any) => a && a.username && a.username.toLowerCase() === username.toLowerCase() && a.id !== id);
    if (otherUser) {
      return res.status(400).json({ error: 'Username is already taken by another athlete.' });
    }

    const existingIdx = list.findIndex((a: any) => a && a.id === id);

    const record = {
      id: id || 'ath_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
      username,
      pin,
      avatarIndex: Number(avatarIndex) || 0,
      securityQuestion: securityQuestion || 'first_pet',
      securityAnswer: (securityAnswer || '').toLowerCase(),
      weightKg: Number(weightKg) || 72,
      dailyTarget: Number(dailyTarget) || 1000,
      workouts: Array.isArray(workouts) ? workouts : [],
      theme: theme || 'cosmic-slate',
      streak: Number(streak) || 0,
      totalJumps: Number(totalJumps) || 0,
      lastUpdated: new Date().toISOString()
    };

    if (existingIdx > -1) {
      // Maintain best scores if updating existing profile
      const existing = list[existingIdx];
      record.workouts = Array.isArray(workouts) ? workouts : (existing.workouts || []);
      record.streak = Number(streak) !== undefined ? Number(streak) : (existing.streak || 0);
      record.totalJumps = Number(totalJumps) !== undefined ? Number(totalJumps) : (existing.totalJumps || 0);
      list[existingIdx] = record;
    } else {
      list.push(record);
    }

    writeAccounts(list);
    res.json({ success: true, account: record });
  } catch (e: any) {
    console.error('Registration API error:', e);
    res.status(500).json({ error: `Failed to save athlete account to system database: ${e.message || e}` });
  }
});

app.post('/api/accounts/login', (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN are required.' });
    }

    let list = readAccounts();
    const accountIdx = list.findIndex((a: any) => a && a.username && a.username.toLowerCase() === username.toLowerCase());

    if (accountIdx === -1) {
      return res.status(401).json({ error: 'Invalid username or PIN combination.' });
    }

    const account = list[accountIdx];

    // Safe Claim / Credential Upgrades:
    // If the matched account has no PIN recorded (legacy pre-auth account)
    // we gracefully initialize and lock it with the security PIN they specified!
    if (!account.pin) {
      account.pin = pin;
      account.securityQuestion = 'first_pet';
      account.securityAnswer = 'velociloop';
      list[accountIdx] = account;
      writeAccounts(list);
    } else {
      // Standard check
      if (account.pin !== pin) {
        return res.status(401).json({ error: 'Invalid username or PIN combination.' });
      }
    }

    res.json({ success: true, account });
  } catch (e: any) {
    console.error('Login API error:', e);
    res.status(500).json({ error: `Failed to authenticate athlete account: ${e.message || e}` });
  }
});

app.post('/api/leaderboard/sync', (req, res) => {
  try {
    const { id, username, pin, securityQuestion, securityAnswer, avatarIndex, streak, totalJumps, workouts, weightKg, dailyTarget, theme } = req.body;
    if (!id || !username) {
      return res.status(400).json({ error: 'Missing account identifier or username.' });
    }

    let list = readAccounts();
    const existingIdx = list.findIndex((a: any) => a.id === id);

    if (existingIdx > -1) {
      const existing = list[existingIdx];
      const record = {
        ...existing,
        username,
        pin: pin || existing.pin || '0000',
        securityQuestion: securityQuestion || existing.securityQuestion || 'first_pet',
        securityAnswer: securityAnswer ? securityAnswer.toLowerCase() : (existing.securityAnswer || 'velociloop'),
        avatarIndex: avatarIndex !== undefined ? Number(avatarIndex) : existing.avatarIndex,
        streak: streak !== undefined ? Number(streak) : (existing.streak || 0),
        totalJumps: totalJumps !== undefined ? Number(totalJumps) : (existing.totalJumps || 0),
        workouts: Array.isArray(workouts) ? workouts : (existing.workouts || []),
        weightKg: weightKg !== undefined ? Number(weightKg) : (existing.weightKg || 72),
        dailyTarget: dailyTarget !== undefined ? Number(dailyTarget) : (existing.dailyTarget || 1000),
        theme: theme || existing.theme || 'cosmic-slate',
        lastUpdated: new Date().toISOString()
      };
      list[existingIdx] = record;
      writeAccounts(list);
      res.json({ success: true, updated: record });
    } else {
      const record = {
        id,
        username,
        pin: pin || '0000',
        securityQuestion: securityQuestion || 'first_pet',
        securityAnswer: securityAnswer ? securityAnswer.toLowerCase() : 'velociloop',
        avatarIndex: Number(avatarIndex) || 0,
        streak: Number(streak) || 0,
        totalJumps: Number(totalJumps) || 0,
        weightKg: Number(weightKg) || 72,
        dailyTarget: Number(dailyTarget) || 1000,
        workouts: Array.isArray(workouts) ? workouts : [],
        theme: theme || 'cosmic-slate',
        lastUpdated: new Date().toISOString()
      };
      list.push(record);
      writeAccounts(list);
      res.json({ success: true, updated: record });
    }
  } catch (error: any) {
    console.error('Leaderboard sync failed:', error);
    res.status(500).json({ error: `Failed to synchronize with leaderboard directory: ${error.message || error}` });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(appDirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(appDirname, 'dist', 'index.html'));
  });
} else {
  // Only load Vite in standalone Node local dev mode
  if (!isServerless) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

// Start standalone dev/prod server if not deployed as a serverless function
if (!isServerless) {
  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Jump Rope server listening on port ${port}`);
  });
}

export default app;
