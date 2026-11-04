import { AuthService } from './auth.service';

describe('Auth Service (Argon2id & Cryptography)', () => {
  it('hashes password with Argon2id and verifies correctly', async () => {
    const raw = 'SecurePassword2026!';
    const hash = await AuthService.hashPassword(raw);

    expect(hash).toContain('$argon2id$');
    const isValid = await AuthService.verifyPassword(hash, raw);
    expect(isValid).toBe(true);

    const isInvalid = await AuthService.verifyPassword(hash, 'WrongPassword123');
    expect(isInvalid).toBe(false);
  });

  it('generates deterministic SHA-256 token hashes', () => {
    const token = 'test-token-12345';
    const hash1 = AuthService.hashToken(token);
    const hash2 = AuthService.hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates cryptographically random 32-byte hex strings', () => {
    const t1 = AuthService.generateRandomToken();
    const t2 = AuthService.generateRandomToken();
    expect(t1).toHaveLength(64); // 32 bytes in hex = 64 characters
    expect(t2).toHaveLength(64);
    expect(t1).not.toBe(t2);
  });
});
