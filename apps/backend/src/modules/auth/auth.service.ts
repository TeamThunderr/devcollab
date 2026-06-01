import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../../db/client';
import { AppError } from '../../utils/errors';
import { RegisterInput, LoginInput, UpdateUserInput } from './auth.schema';
import { emailService } from '../../services/email.service';

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  github_url: string | null;
  google_id: string | null;
  github_id: string | null;
  platform_role: 'USER' | 'SUPER_ADMIN';
  is_verified: boolean;
}

function publicUser(user: Pick<UserRow, 'id' | 'email' | 'name' | 'avatar_url' | 'bio' | 'skills' | 'github_url' | 'platform_role'>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio,
    skills: user.skills ?? [],
    githubLink: user.github_url,
    platformRole: user.platform_role,
  };
}

const generateTokens = (user: Pick<UserRow, 'id' | 'email' | 'name' | 'platform_role'>) => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    platformRole: user.platform_role,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const authService = {
  async register(data: RegisterInput) {
    const existingUser = await query<UserRow>('SELECT * FROM users WHERE email = $1', [data.email]);
    if (existingUser.rowCount) {
      throw new AppError(400, 'User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const name = data.name?.trim() || data.email.split('@')[0];
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, name, github_url, is_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, email, password_hash, name, avatar_url, bio, skills, github_url, platform_role, is_verified`,
      [data.email, passwordHash, name, data.githubLink ?? null]
    );
    const user = result.rows[0];
    
    // Generate a secure verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    
    await emailService.sendVerificationEmail(user.email, token);

    return { user: publicUser(user) };
  },

  async login(data: LoginInput) {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [data.email]);
    const user = result.rows[0];
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.password_hash) {
      throw new AppError(401, 'Please login with your OAuth provider (Google/Github)');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.is_verified) {
      throw new AppError(401, 'Please verify your email before logging in.');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    return { user: publicUser(user), accessToken, refreshToken };
  },

  async logout(_refreshToken: string) {
    return;
  },

  async oauthLogin(provider: 'google' | 'github', profile: { id: string; email: string; name: string; avatarUrl?: string }) {
    let user: UserRow;

    const existingUser = await query<UserRow>('SELECT * FROM users WHERE email = $1', [profile.email]);

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      user = existingUser.rows[0];
      if (provider === 'google' && !user.google_id) {
        await query('UPDATE users SET google_id = $1, is_verified = TRUE WHERE id = $2', [profile.id, user.id]);
      } else if (provider === 'github' && !user.github_id) {
        await query('UPDATE users SET github_id = $1, is_verified = TRUE WHERE id = $2', [profile.id, user.id]);
      } else if (!user.is_verified) {
        await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [user.id]);
      }
    } else {
      const result = await query<UserRow>(
        `INSERT INTO users (email, name, avatar_url, ${provider === 'google' ? 'google_id' : 'github_id'}, is_verified)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, email, password_hash, name, avatar_url, bio, skills, github_url, google_id, github_id, platform_role, is_verified`,
        [profile.email, profile.name, profile.avatarUrl || null, profile.id]
      );
      user = result.rows[0];
    }

    const { accessToken, refreshToken } = generateTokens(user);
    return { user: publicUser(user), accessToken, refreshToken };
  },

  async refresh(oldRefreshToken: string) {
    try {
      const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET!) as {
        userId: string;
        email: string;
        name: string;
      };

      const result = await query<UserRow>('SELECT * FROM users WHERE id = $1 AND email = $2', [
        decoded.userId,
        decoded.email,
      ]);
      const user = result.rows[0];
      if (!user) {
        throw new AppError(401, 'Invalid refresh token');
      }

      return generateTokens(user);
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }
  },

  async getMe(userId: string) {
    const result = await query<UserRow>(
      `SELECT id, email, password_hash, name, avatar_url, bio, skills, github_url, platform_role
       FROM users
       WHERE id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return publicUser(user);
  },

  async updateMe(userId: string, data: UpdateUserInput) {
    const result = await query<UserRow>(
      `UPDATE users 
       SET name = COALESCE($1, name),
           avatar_url = COALESCE($2, avatar_url),
           bio = COALESCE($3, bio),
           skills = COALESCE($4, skills),
           github_url = COALESCE($5, github_url)
       WHERE id = $6
       RETURNING id, email, password_hash, name, avatar_url, bio, skills, github_url, platform_role`,
      [
        data.name ?? null,
        data.avatar ?? null,
        data.bio ?? null,
        data.skills ?? null,
        data.githubLink ?? null,
        userId
      ]
    );
    const user = result.rows[0];
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return publicUser(user);
  },

  async verifyEmail(token: string) {
    // Clean up expired tokens globally
    await query('DELETE FROM email_verification_tokens WHERE expires_at < NOW()');

    const result = await query<{ user_id: string }>(
      'SELECT user_id FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rowCount === 0) {
      throw new AppError(400, 'Invalid or expired verification token');
    }

    const userId = result.rows[0].user_id;

    await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);

    return { success: true };
  },

  async resendVerification(email: string) {
    // Clean up expired tokens globally
    await query('DELETE FROM email_verification_tokens WHERE expires_at < NOW()');

    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];
    if (user.is_verified) {
      throw new AppError(400, 'Email is already verified');
    }

    // Rate limiting: Check last sent token for this user
    const recentToken = await query<{ created_at: Date }>(
      'SELECT created_at FROM email_verification_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (recentToken.rowCount && recentToken.rowCount > 0) {
      const lastSent = recentToken.rows[0].created_at;
      const timeDiffSeconds = (Date.now() - new Date(lastSent).getTime()) / 1000;
      if (timeDiffSeconds < 60) {
        throw new AppError(429, 'Please wait 60 seconds before requesting another email');
      }
    }

    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    await emailService.sendVerificationEmail(user.email, token);

    return { success: true };
  }
};
