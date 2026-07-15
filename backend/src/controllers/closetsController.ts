import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

export const getClosets = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let userClosets = await prisma.closet.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-create default closet for users with no closets
    if (userClosets.length === 0) {
      const defaultCloset = await prisma.closet.create({
        data: {
          userId,
          name: 'Tủ đồ chính',
          isDefault: true,
        },
      });

      // Move any loose items into this default closet
      await prisma.clothingItem.updateMany({
        where: { userId, closetId: null },
        data: { closetId: defaultCloset.id },
      });

      userClosets = [defaultCloset];
    }

    return res.json(userClosets);
  } catch (error) {
    console.error('Get closets error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCloset = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên tủ đồ không được để trống' });
    }

    const closet = await prisma.closet.create({
      data: {
        userId,
        name: name.trim(),
        isDefault: false,
      },
    });

    return res.status(201).json(closet);
  } catch (error) {
    console.error('Create closet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCloset = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const closet = await prisma.closet.findUnique({
      where: { id },
    });

    if (!closet || closet.userId !== userId) {
      return res.status(404).json({ error: 'Tủ đồ không tồn tại' });
    }

    if (closet.isDefault) {
      return res.status(400).json({ error: 'Không thể xóa tủ đồ mặc định' });
    }

    // Move any items in this closet back to the default closet
    const defaultCloset = await prisma.closet.findFirst({
      where: { userId, isDefault: true },
    });

    if (defaultCloset) {
      await prisma.clothingItem.updateMany({
        where: { closetId: id },
        data: { closetId: defaultCloset.id },
      });
    }

    await prisma.closet.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Đã xóa tủ đồ và chuyển sản phẩm về tủ đồ chính' });
  } catch (error) {
    console.error('Delete closet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
