import { getPreference, setPreference } from "../data/localStore";

const MAX_ATTEMPTS_PER_STAGE = 5;
// Stage 0 -> 1 cooldown, then stage 1 -> 2 cooldown. Once stage 2 is also
// exhausted, the account locks permanently (contact support) — there's no
// third cooldown entry because there's nothing after it.
const STAGE_COOLDOWNS_MS = [3 * 60 * 1000, 60 * 60 * 1000];

export interface AttemptState {
  failCount: number;
  stage: number;
  lockoutUntil: number | null;
  lockedForever: boolean;
}

const EMPTY_STATE: AttemptState = { failCount: 0, stage: 0, lockoutUntil: null, lockedForever: false };

/**
 * NOTE: this is tracked entirely client-side (device-local storage, keyed
 * by email). It's a real UX deterrent and matches the exact schedule asked
 * for, but it is not a substitute for server-side brute-force protection —
 * clearing app data or reinstalling resets it. Firebase Auth's own backend
 * already applies independent, non-bypassable rate limiting underneath
 * this (it starts returning auth/too-many-requests on repeated failures
 * regardless of anything tracked here), so that remains the real security
 * backstop; this layer exists purely to give clear, friendly messaging
 * matching a specific schedule rather than Firebase's generic error.
 */
function keyFor(email: string): string {
  return `loginAttempts:${email.trim().toLowerCase()}`;
}

export async function getAttemptState(email: string): Promise<AttemptState> {
  if (!email) return { ...EMPTY_STATE };
  return getPreference<AttemptState>(keyFor(email), { ...EMPTY_STATE });
}

export async function recordFailedAttempt(email: string): Promise<AttemptState> {
  const state = await getAttemptState(email);
  if (state.lockedForever) return state;

  state.failCount += 1;
  if (state.failCount >= MAX_ATTEMPTS_PER_STAGE) {
    if (state.stage >= STAGE_COOLDOWNS_MS.length) {
      state.lockedForever = true;
      state.lockoutUntil = null;
    } else {
      state.lockoutUntil = Date.now() + STAGE_COOLDOWNS_MS[state.stage];
      state.stage += 1;
    }
    state.failCount = 0;
  }

  await setPreference(keyFor(email), state);
  return state;
}

export async function clearAttempts(email: string): Promise<void> {
  if (!email) return;
  await setPreference(keyFor(email), { ...EMPTY_STATE });
}

export function isLockedOut(state: AttemptState): boolean {
  if (state.lockedForever) return true;
  if (state.lockoutUntil && Date.now() < state.lockoutUntil) return true;
  return false;
}

export function remainingLockoutMs(state: AttemptState): number {
  if (!state.lockoutUntil) return 0;
  return Math.max(0, state.lockoutUntil - Date.now());
}

/** Formats a remaining lockout duration as "2:15" (m:ss) for the 3-minute stage. */
export function formatLockoutTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
