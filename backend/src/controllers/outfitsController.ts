import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { uploadToStorage, deleteFromStorage } from '../services/storageService';

export const createOutfit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, items, thumbnail } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one clothing item is required' });
    }

    if (!thumbnail) {
      return res.status(400).json({ error: 'Outfit thumbnail is required' });
    }

    // 1. Process base64 thumbnail — upload to Supabase Storage
    let thumbnailUrl = null;
    try {
      const base64Data = thumbnail.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `outfit-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      thumbnailUrl = await uploadToStorage(buffer, filename, 'image/png');
    } catch (err) {
      console.error('Failed to upload outfit thumbnail:', err);
      return res.status(500).json({ error: 'Failed to save outfit thumbnail image' });
    }

    // 2. Save in database (transaction)
    const outfit = await prisma.$transaction(async (tx: any) => {
      const newOutfit = await tx.outfit.create({
        data: {
          userId,
          name: name || 'Bộ phối mới',
          thumbnailUrl,
        },
      });

      // Map and create outfit items
      const outfitItemsData = items.map((item: any) => ({
        outfitId: newOutfit.id,
        clothingItemId: item.clothingItemId,
        positionX: parseFloat(item.positionX),
        positionY: parseFloat(item.positionY),
        scale: parseFloat(item.scale || 1),
        rotation: parseFloat(item.rotation || 0),
        zIndex: parseInt(item.zIndex || 0),
      }));

      // Create multiple outfit items
      await tx.outfitItem.createMany({
        data: outfitItemsData,
      });

      return newOutfit;
    });

    // Fetch and return the fully populated outfit
    const fullyPopulatedOutfit = await prisma.outfit.findUnique({
      where: { id: outfit.id },
      include: {
        items: {
          include: {
            clothingItem: true,
          },
        },
      },
    });

    return res.status(201).json(fullyPopulatedOutfit);
  } catch (error) {
    console.error('Create outfit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOutfits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const outfits = await prisma.outfit.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            clothingItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(outfits);
  } catch (error) {
    console.error('Get outfits error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOutfitById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const outfit = await prisma.outfit.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            clothingItem: true,
          },
          orderBy: { zIndex: 'asc' },
        },
      },
    });

    if (!outfit || outfit.userId !== userId) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    return res.json(outfit);
  } catch (error) {
    console.error('Get outfit by ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOutfit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const outfit = await prisma.outfit.findUnique({
      where: { id },
    });

    if (!outfit || outfit.userId !== userId) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    // Delete thumbnail file from storage
    if (outfit.thumbnailUrl) {
      await deleteFromStorage(outfit.thumbnailUrl);
    }

    // Delete record from DB
    await prisma.outfit.delete({
      where: { id },
    });

    return res.json({ message: 'Outfit deleted successfully' });
  } catch (error) {
    console.error('Delete outfit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
