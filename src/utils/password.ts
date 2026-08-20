export type PasswordStrength = "weak" | "fair" | "strong";

export interface PasswordCheck {
  strength: PasswordStrength;
  score: number; // 0-4
  passes: boolean; // strong enough to allow signup
}

/** Simple, dependency-free password strength check — no external scoring library needed. */
export function checkPasswordStrength(password: string): PasswordCheck {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strength: PasswordStrength = score <= 2 ? "weak" : score <= 3 ? "fair" : "strong";
  return { strength, score, passes: password.length >= 8 && score >= 3 };
}
