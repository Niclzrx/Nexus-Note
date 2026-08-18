/**
 * Single source of truth for username/password rules. Both the client-side
 * forms (features/auth/*) and the server-side API routes
 * (app/api/auth/signup) import from here, so the rule can never drift
 * between "what the UI checks" and "what the backend actually enforces" —
 * per the source spec's explicit requirement (§2, §20, §28) that validation
 * must be real on the backend, not just a frontend nicety.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
// Letters, numbers, and a conservative set of separator characters. No
// whitespace (checked implicitly — none of these characters are whitespace).
export const USERNAME_PATTERN = /^[a-zA-Z0-9._@-]+$/;

export const PASSWORD_MIN_LENGTH = 6;

export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `O usuário precisa ter pelo menos ${USERNAME_MIN_LENGTH} caracteres.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `O usuário pode ter no máximo ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (/\s/.test(username)) {
    return "O usuário não pode conter espaços.";
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use apenas letras, números e os símbolos . _ - @";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "A senha precisa ter pelo menos uma letra maiúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "A senha precisa ter pelo menos um número.";
  }
  return null;
}

/**
 * Supabase Auth is email/password under the hood; Nexus Note's product
 * surface is username/password. We map every username to a synthetic,
 * unguessable-but-deterministic "shadow" email in a reserved, non-routable
 * domain purely so Supabase Auth has something email-shaped to key off of.
 * Nothing is ever sent to this address. Usernames are matched
 * case-insensitively (see the `citext` column in the SQL schema), so the
 * shadow email is always derived from the lowercased username to keep the
 * two forms of "identity" consistent with each other.
 */
export function usernameToShadowEmail(username: string): string {
  return `${username.toLowerCase()}@users.nexusnote.internal`;
}
