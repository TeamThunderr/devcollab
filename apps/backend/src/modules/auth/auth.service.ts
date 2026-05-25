import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../db/client';
import { AppError } from '../../utils/errors';
import { RegisterInput, LoginInput } from './auth.schema';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  github_url: string | null;
  platform_role: 'USER' | 'SUPER_ADMIN';
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
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash, name, avatar_url, bio, skills, github_url, platform_role`,
      [data.email, passwordHash, name]
    );
    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);

    return { user: publicUser(user), accessToken, refreshToken };
  },

  async login(data: LoginInput) {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [data.email]);
    const user = result.rows[0];
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    return { user: publicUser(user), accessToken, refreshToken };
  },

  async logout(_refreshToken: string) {
    return;
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
  }
};
