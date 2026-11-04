import argon2 from 'argon2';
import crypto from 'crypto';
import { db } from '../db/database';
import { RegisterInput, LoginInput, AuthUser } from '@fitlife/shared-types';

export class AuthService {
  /**
   * Hashes password using Argon2id with OWASP-recommended parameters.
   * memoryCost: 64MB (65536 KiB), timeCost: 3, parallelism: 4
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  static async registerUser(input: RegisterInput): Promise<AuthUser> {
    const existing = await db
      .selectFrom('users')
      .where((eb) =>
        eb.or([
          eb('email', '=', input.email.toLowerCase()),
          eb('username', '=', input.username.toLowerCase()),
        ])
      )
      .select(['id', 'email', 'username'])
      .executeTakeFirst();

    if (existing) {
      if (existing.email === input.email.toLowerCase()) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw new Error('USERNAME_ALREADY_EXISTS');
    }

    const passwordHash = await this.hashPassword(input.password);

    const newUser = await db
      .insertInto('users')
      .values({
        username: input.username.toLowerCase(),
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        is_active: true,
        is_verified: false,
      })
      .returning(['id', 'username', 'email', 'is_active', 'is_verified', 'created_at', 'updated_at'])
      .executeTakeFirstOrThrow();

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      isActive: newUser.is_active,
      isVerified: newUser.is_verified,
      createdAt: newUser.created_at.toISOString(),
      updatedAt: newUser.updated_at.toISOString(),
    };
  }

  static async validateUserCredentials(input: LoginInput): Promise<AuthUser> {
    const identifier = input.emailOrUsername.toLowerCase();

    const user = await db
      .selectFrom('users')
      .where((eb) => eb.or([eb('email', '=', identifier), eb('username', '=', identifier)]))
      .selectAll()
      .executeTakeFirst();

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.is_active) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    const isValid = await this.verifyPassword(user.password_hash, input.password);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.is_active,
      isVerified: user.is_verified,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };
  }

  static async createRefreshToken(
    userId: string,
    familyId?: string,
    deviceInfo?: string
  ): Promise<{ token: string; familyId: string }> {
    const token = this.generateRandomToken(32);
    const tokenHash = this.hashToken(token);
    const activeFamilyId = familyId ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db
      .insertInto('refresh_tokens')
      .values({
        user_id: userId,
        token_hash: tokenHash,
        family_id: activeFamilyId,
        device_info: deviceInfo ?? null,
        expires_at: expiresAt,
        revoked_at: null,
      })
      .execute();

    return { token, familyId: activeFamilyId };
  }

  /**
   * Refreshes token with reuse detection (Token Rotation).
   * If a revoked token is used, invalidates all tokens in the family.
   */
  static async rotateRefreshToken(
    rawToken: string,
    deviceInfo?: string
  ): Promise<{ userId: string; newRefreshToken: string; familyId: string }> {
    const tokenHash = this.hashToken(rawToken);

    const record = await db
      .selectFrom('refresh_tokens')
      .where('token_hash', '=', tokenHash)
      .selectAll()
      .executeTakeFirst();

    if (!record) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Token reuse detection: if already revoked, compromise detected! Revoke entire family.
    if (record.revoked_at !== null) {
      await db
        .updateTable('refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('family_id', '=', record.family_id)
        .execute();
      throw new Error('TOKEN_REUSE_DETECTED');
    }

    if (new Date() > record.expires_at) {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    // Revoke current token
    await db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('id', '=', record.id)
      .execute();

    // Issue new token in same family
    const next = await this.createRefreshToken(record.user_id, record.family_id, deviceInfo);

    return {
      userId: record.user_id,
      newRefreshToken: next.token,
      familyId: next.familyId,
    };
  }

  static async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('token_hash', '=', tokenHash)
      .execute();
  }

  static async deleteUserAccount(userId: string): Promise<void> {
    // Cascades to all tables: user_profiles, workout_sessions, meals, habits, sleep, measurements
    await db.deleteFrom('users').where('id', '=', userId).execute();
  }
}
