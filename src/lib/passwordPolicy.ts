/** Minimalna długość PIN-u / hasła (worker i admin). SSOT dla API i UI. */
export const PASSWORD_MIN_LENGTH = 6;

/** Trywialne PIN-y odrzucane niezależnie od długości (1234 łapie też min. długość). */
const TRIVIAL_PASSWORDS = new Set(["1234", "123456", "000000", "111111"]);

/**
 * Polityka siły hasła przy tworzeniu / zmianie (nie przy logowaniu).
 * Login nigdy nie zwraca `weak_password`.
 */
export function isPasswordPolicyOk(plain: string, username?: string): boolean {
  if (plain.length < PASSWORD_MIN_LENGTH) return false;
  if (TRIVIAL_PASSWORDS.has(plain)) return false;
  const login = username?.trim().toLowerCase();
  if (login && plain.toLowerCase() === login) return false;
  return true;
}
