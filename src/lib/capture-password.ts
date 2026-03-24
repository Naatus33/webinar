import { compare, hash } from "bcrypt";

const BCRYPT_ROUNDS = 10;

function isBcryptHash(stored: string): boolean {
  return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
}

export async function hashCapturePassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifica senha da página de captura. Suporta hashes bcrypt e legado (texto plano em DB).
 */
export async function verifyCapturePassword(
  plain: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored || !plain) return false;
  if (isBcryptHash(stored)) {
    return compare(plain, stored);
  }
  return plain === stored;
}
