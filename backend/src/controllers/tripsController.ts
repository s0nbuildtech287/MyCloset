import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

export const getTrips = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trips = await prisma.travelTrip.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            clothingItem: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTrip = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, destination, startDate, endDate } = req.body;
    if (!name || !destination || !startDate || !endDate) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin chuyến đi' });
    }

    const trip = await prisma.travelTrip.create({
      data: {
        userId,
        name,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        items: true,
      },
    });

    return res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTrip = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const trip = await prisma.travelTrip.findUnique({
      where: { id },
    });

    if (!trip || trip.userId !== userId) {
      return res.status(404).json({ error: 'Chuyến đi không tồn tại' });
    }

    await prisma.travelTrip.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Đã xóa chuyến đi' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addTripItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tripId, clothingItemId } = req.body;

    const trip = await prisma.travelTrip.findUnique({
      where: { id: tripId },
    });

    if (!trip || trip.userId !== userId) {
      return res.status(404).json({ error: 'Chuyến đi không tồn tại' });
    }

    // Check if already added
    const existing = await prisma.tripItem.findFirst({
      where: { tripId, clothingItemId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Món đồ đã có trong danh sách chuẩn bị' });
    }

    const tripItem = await prisma.tripItem.create({
      data: {
        tripId,
        clothingItemId,
        packed: false,
      },
      include: {
        clothingItem: true,
      },
    });

    return res.status(201).json(tripItem);
  } catch (error) {
    console.error('Add trip item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeTripItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const tripItem = await prisma.tripItem.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!tripItem || tripItem.trip.userId !== userId) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin đồ trong chuyến đi' });
    }

    await prisma.tripItem.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Đã xóa món đồ khỏi danh sách chuẩn bị' });
  } catch (error) {
    console.error('Remove trip item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleTripItemPacked = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const tripItem = await prisma.tripItem.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!tripItem || tripItem.trip.userId !== userId) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin đồ trong chuyến đi' });
    }

    const updated = await prisma.tripItem.update({
      where: { id },
      data: {
        packed: !tripItem.packed,
      },
      include: {
        clothingItem: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Toggle trip item packed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
