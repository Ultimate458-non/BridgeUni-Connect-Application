// Shared by the browser and the server: people sign up with an email OR a South African phone number.

export type IdentifierKind = "email" | "phone";
export type Identifier = { kind: IdentifierKind; value: string };

export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalises what the user typed so "071 234 5678", "+27 71 234 5678" and "27712345678"
 * are the same account. Returns null if it is neither a valid email nor a valid SA mobile number.
 */
export function parseIdentifier(input: string): Identifier | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    return EMAIL_RE.test(email) && email.length <= 254 ? { kind: "email", value: email } : null;
  }
  const digits = raw.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  let national: string | null = null;
  if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\+?27\d{9}$/.test(digits)) national = digits.replace(/^\+?27/, "");
  // SA mobile numbers start with 6, 7 or 8 after the leading 0.
  if (!national || !/^[678]/.test(national)) return null;
  return { kind: "phone", value: `+27${national}` };
}

export function identifierError(input: string): string | null {
  if (!input.trim()) return "Enter your email or phone number.";
  if (parseIdentifier(input)) return null;
  return input.includes("@")
    ? "That email doesn't look right. Check for typos."
    : "Enter a South African cell number like 071 234 5678, or an email.";
}

/** The passwords attackers try first. Lower-case; compared after lower-casing. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssword", "p@ssw0rd",
  "12345678", "123456789", "1234567890", "0123456789", "87654321", "11111111", "00000000",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "iloveyou", "iloveyou1", "abcd1234",
  "abc12345", "letmein1", "welcome1", "welcome123", "sunshine", "princess", "football",
  "baseball", "superman", "trustno1", "monkey123", "dragon123", "admin123", "changeme",
  "bridgeuni", "bridgeuni1", "bridgeuni123", "mangaung", "bloemfontein", "southafrica",
]);

/**
 * Password rules shared by the sign-up form and the server. Pass the email / phone they signed
 * up with so we can stop "my number is my password".
 */
export function passwordError(password: string, identifier = ""): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > 200) return "That password is too long.";
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password))
    return "That password is too easy to guess. Try a short phrase, like 3 words you'll remember.";
  const digits = identifier.replace(/\D/g, "");
  const local = identifier.split("@")[0]?.toLowerCase() ?? "";
  if ((digits.length >= 6 && lower.replace(/\D/g, "").includes(digits.slice(-9))) || (local.length >= 4 && lower === local))
    return "Don't use your phone number or email as your password.";
  return null;
}

/** "+27712345678" → "071 234 5678" for display. Takes a signed-in user ({ kind, identifier }). */
export function displayIdentifier(user: { kind: IdentifierKind; identifier: string }): string {
  if (user.kind !== "phone") return user.identifier;
  const n = "0" + user.identifier.slice(3);
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}
