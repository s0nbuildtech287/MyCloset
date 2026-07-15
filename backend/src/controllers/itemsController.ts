import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { imageQueue } from '../services/queue';
import { processImageBackground } from '../services/imageProcessing';
import path from 'path';
import fs from 'fs';

// Helper to delete a file from disk safely
const deleteDiskFile = (imageUrl: string) => {
  try {
    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete file: ${imageUrl}`, error);
  }
};

export const createItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { name, category, color, brand, season, notes } = req.body;
    let tags: string[] = [];

    if (req.body.tags) {
      try {
        tags = Array.isArray(req.body.tags) 
          ? req.body.tags 
          : JSON.parse(req.body.tags);
      } catch (e) {
        // Fallback if it is a comma separated string
        tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    let price = null;
    if (req.body.price !== undefined && req.body.price !== '') {
      price = parseFloat(req.body.price);
    }

    const originalImageUrl = `/uploads/${req.file.filename}`;

    const clothingItem = await prisma.clothingItem.create({
      data: {
        userId,
        name,
        category,
        color: color || null,
        brand: brand || null,
        season: season || null,
        tags,
        originalImageUrl,
        notes: notes || null,
        price,
      },
    });

    // Push the background removal job into the sequential queue
    imageQueue.push(async () => {
      await processImageBackground(clothingItem.id);
    });

    return res.status(201).json(clothingItem);
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, season, isFavorite, search, tag, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const where: any = {
      userId,
    };

    if (category) {
      where.category = category as string;
    }

    if (season) {
      where.season = season as string;
    }

    if (isFavorite === 'true') {
      where.isFavorite = true;
    } else if (isFavorite === 'false') {
      where.isFavorite = false;
    }

    if (tag) {
      where.tags = {
        has: tag as string,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [items, totalCount] = await prisma.$transaction([
      prisma.clothingItem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.clothingItem.count({ where }),
    ]);

    return res.json({
      items,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Get items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const item = await prisma.clothingItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== userId) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.json(item);
  } catch (error) {
    console.error('Get item by ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const item = await prisma.clothingItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== userId) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { name, category, color, brand, season, notes, tags, isFavorite } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (color !== undefined) updateData.color = color || null;
    if (brand !== undefined) updateData.brand = brand || null;
    if (season !== undefined) updateData.season = season || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isFavorite !== undefined) updateData.isFavorite = !!isFavorite;

    if (tags !== undefined) {
      try {
        updateData.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (e) {
        updateData.tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    if (req.body.price !== undefined) {
      updateData.price = req.body.price === '' || req.body.price === null ? null : parseFloat(req.body.price);
    }

    const updatedItem = await prisma.clothingItem.update({
      where: { id },
      data: updateData,
    });

    return res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const item = await prisma.clothingItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== userId) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Delete image files from disk
    if (item.originalImageUrl) {
      deleteDiskFile(item.originalImageUrl);
    }
    if (item.processedImageUrl) {
      deleteDiskFile(item.processedImageUrl);
    }

    // Delete record from DB
    await prisma.clothingItem.delete({
      where: { id: id },
    });

    return res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemsStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Run queries in parallel
    const [totalItems, favoritesCount, totalOutfits, categoryGroups] = await Promise.all([
      prisma.clothingItem.count({
        where: { userId }
      }),
      prisma.clothingItem.count({
        where: { userId, isFavorite: true }
      }),
      prisma.outfit.count({
        where: { userId }
      }),
      prisma.clothingItem.groupBy({
        by: ['category'],
        where: { userId },
        _count: {
          category: true
        }
      })
    ]);

    // Format category details
    const byCategory: Record<string, number> = {
      top: 0,
      bottom: 0,
      shoes: 0,
      accessory: 0,
      outerwear: 0
    };

    categoryGroups.forEach((group: any) => {
      if (group.category) {
        byCategory[group.category] = group._count.category;
      }
    });

    return res.json({
      totalItems,
      favoritesCount,
      totalOutfits,
      byCategory
    });
  } catch (error) {
    console.error('Get items stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
