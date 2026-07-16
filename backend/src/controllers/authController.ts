import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (req: Request, res: Response) => {
  return res.status(403).json({ error: 'Tính năng đăng ký tài khoản mới hiện đang bị tạm khóa. Đây là hệ thống nội bộ.' });
};


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    setRefreshTokenCookie(res, refreshToken);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };

    return res.json({
      accessToken,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is missing' });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    setRefreshTokenCookie(res, newRefreshToken);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };

    return res.json({
      accessToken: newAccessToken,
      user: safeUser,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.json({ message: 'Logged out successfully' });
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({ message: 'Mật khẩu đã được thay đổi thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

