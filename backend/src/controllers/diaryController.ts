import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

export const getDiaryEntries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const entries = await prisma.outfitDiary.findMany({
      where: { userId },
      include: {
        outfit: true,
      },
      orderBy: {
        wearDate: 'asc',
      },
    });

    return res.json(entries);
  } catch (error) {
    console.error('Get diary entries error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const upsertDiaryEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { outfitId, wearDate } = req.body;
    if (!outfitId || !wearDate) {
      return res.status(400).json({ error: 'Outfit ID and wear date are required' });
    }

    const parsedDate = new Date(wearDate);

    // Verify outfit ownership
    const outfit = await prisma.outfit.findUnique({
      where: { id: outfitId },
    });

    if (!outfit || outfit.userId !== userId) {
      return res.status(404).json({ error: 'Outfit not found or access denied' });
    }

    // Upsert entry for the user and specific day
    const entry = await prisma.outfitDiary.upsert({
      where: {
        userId_wearDate: {
          userId,
          wearDate: parsedDate,
        },
      },
      update: {
        outfitId,
      },
      create: {
        userId,
        outfitId,
        wearDate: parsedDate,
      },
      include: {
        outfit: true,
      },
    });

    return res.json(entry);
  } catch (error) {
    console.error('Upsert diary entry error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDiaryEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const entry = await prisma.outfitDiary.findUnique({
      where: { id },
    });

    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    await prisma.outfitDiary.delete({
      where: { id },
    });

    return res.json({ message: 'Diary entry deleted successfully' });
  } catch (error) {
    console.error('Delete diary entry error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
