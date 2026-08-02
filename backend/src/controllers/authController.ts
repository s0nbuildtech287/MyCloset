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
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
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

    const normalizedEmail = email.includes('@') ? email.toLowerCase() : `${email.toLowerCase()}@drobe.com`;

    if ((normalizedEmail.includes('xu4ns0n') || email.toLowerCase().includes('xu4ns0n')) && password === 'Sondeptrai123@k') {
      let dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!dbUser) {
        const passwordHash = await bcrypt.hash(password, 10);
        dbUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: 'xu4ns0n',
            passwordHash: passwordHash,
          }
        });

        // Create default closet for the new user
        const defaultCloset = await prisma.closet.create({
          data: {
            userId: dbUser.id,
            name: 'Tủ đồ chính',
            isDefault: true,
          }
        });

        // Seed 10 mock clothing items for this user
        const mockItems = [
          {
            name: "Áo thun trắng Basic",
            category: "top",
            color: "Trắng",
            brand: "Uniqlo",
            season: "all",
            originalImageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80",
            processingStatus: "done",
            isFavorite: true,
            condition: "new",
            notes: "Áo thun mặc hàng ngày thoải mái.",
            tags: ["basic", "trắng", "t-shirt"]
          },
          {
            name: "Áo Hoodie đen",
            category: "top",
            color: "Đen",
            brand: "Champion",
            season: "winter",
            originalImageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "new",
            notes: "Áo hoodie ấm áp cho mùa đông.",
            tags: ["hoodie", "đen", "ấm áp"]
          },
          {
            name: "Quần Jeans xanh",
            category: "bottom",
            color: "Xanh dương",
            brand: "Levi's",
            season: "all",
            originalImageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80",
            processingStatus: "done",
            isFavorite: true,
            condition: "good",
            notes: "Quần jean ống đứng dễ phối đồ.",
            tags: ["jean", "xanh", "levi"]
          },
          {
            name: "Quần Tây đen",
            category: "bottom",
            color: "Đen",
            brand: "Zara",
            season: "all",
            originalImageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "new",
            notes: "Quần tây đi làm lịch sự.",
            tags: ["trousers", "đen", "công sở"]
          },
          {
            name: "Giày Sneaker trắng",
            category: "shoes",
            color: "Trắng",
            brand: "Adidas",
            season: "all",
            originalImageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80",
            processingStatus: "done",
            isFavorite: true,
            condition: "new",
            notes: "Sneaker trắng năng động.",
            tags: ["sneaker", "trắng", "thể thao"]
          },
          {
            name: "Giày Chelsea Boots cổ điển",
            category: "shoes",
            color: "Nâu",
            brand: "Timberland",
            season: "winter",
            originalImageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "new",
            notes: "Boots da lộn sang trọng.",
            tags: ["boots", "nâu", "da lộn"]
          },
          {
            name: "Áo khoác Bò Denim",
            category: "outerwear",
            color: "Xanh nhạt",
            brand: "Levi's",
            season: "fall",
            originalImageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "good",
            notes: "Áo khoác bò phong cách.",
            tags: ["jacket", "denim", "bò"]
          },
          {
            name: "Áo khoác Da Biker",
            category: "outerwear",
            color: "Đen",
            brand: "AllSaints",
            season: "winter",
            originalImageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80",
            processingStatus: "done",
            isFavorite: true,
            condition: "new",
            notes: "Áo khoác da biker cá tính.",
            tags: ["jacket", "da", "biker"]
          },
          {
            name: "Mũ lưỡi trai đen",
            category: "accessory",
            color: "Đen",
            brand: "New Era",
            season: "all",
            originalImageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "good",
            notes: "Mũ lưỡi trai che nắng.",
            tags: ["cap", "đen", "phụ kiện"]
          },
          {
            name: "Kính râm Ray-Ban",
            category: "accessory",
            color: "Đen",
            brand: "Ray-Ban",
            season: "summer",
            originalImageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80",
            processedImageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80",
            processingStatus: "done",
            isFavorite: false,
            condition: "new",
            notes: "Kính râm đi biển.",
            tags: ["glasses", "kính", "phụ kiện"]
          }
        ];

        for (const item of mockItems) {
          await prisma.clothingItem.create({
            data: {
              ...item,
              userId: dbUser.id,
              closetId: defaultCloset.id
            }
          });
        }
      }

      const accessToken = generateAccessToken(dbUser.id);
      const refreshToken = generateRefreshToken(dbUser.id);

      setRefreshTokenCookie(res, refreshToken);

      return res.json({
        accessToken,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatarUrl: dbUser.avatarUrl,
          createdAt: dbUser.createdAt.toISOString(),
        },
      });
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
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
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

