import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/errors';
import { RegisterInput, LoginInput } from './auth.schema';

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const authService = {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new AppError(400, 'User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
      },
    });

    return { id: user.id, email: user.email };
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  },

  async refresh(oldRefreshToken: string) {
    const secret = process.env.JWT_REFRESH_SECRET!;
    
    try {
      const decoded = jwt.verify(oldRefreshToken, secret) as { userId: string };
      
      const dbToken = await prisma.refreshToken.findUnique({
        where: { token: oldRefreshToken }
      });

      if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
         throw new AppError(401, 'Invalid or expired refresh token');
      }

      // Revoke the old token (Refresh Token Rotation)
      await prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() }
      });

      const { accessToken, refreshToken } = generateTokens(decoded.userId);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt,
        },
      });

      return { accessToken, refreshToken };
    } catch (e) {
      throw new AppError(401, 'Invalid refresh token');
    }
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, avatar: true, bio: true, skills: true, githubLink: true }
    });
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    
    return user;
  }
};
