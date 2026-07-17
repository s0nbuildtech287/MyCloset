import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { imageQueue } from '../services/queue';
import { processImageBackground, removeBackgroundViaPython } from '../services/imageProcessing';
import { fetchWeather } from '../services/weatherService';
import { uploadToStorage, deleteFromStorage } from '../services/storageService';
import path from 'path';
import axios from 'axios';

// Helper to delete a file from storage safely (handles both Supabase URLs and legacy local paths)
const deleteStorageFile = async (imageUrl: string) => {
  try {
    await deleteFromStorage(imageUrl);
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

    const { name, category, color, brand, season, notes, condition, imageUrl, removeBg } = req.body;


    if (!req.file && !imageUrl) {
      return res.status(400).json({ error: 'Vui lòng tải lên tệp ảnh hoặc dán link ảnh online.' });
    }

    let originalImageUrl = '';

    if (req.file) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `item-${uniqueSuffix}${ext}`;
      originalImageUrl = await uploadToStorage(req.file.buffer, filename, req.file.mimetype);
    } else if (imageUrl) {
      try {
        console.log(`Downloading image from pasted URL: ${imageUrl}...`);
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 20000, // 20s timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const buffer = Buffer.from(response.data);

        // Resolve extension (default to .jpg)
        let ext = '.jpg';
        try {
          const parsedUrl = new URL(imageUrl);
          const pathname = parsedUrl.pathname;
          const detectedExt = path.extname(pathname);
          if (detectedExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(detectedExt.toLowerCase())) {
            ext = detectedExt;
          }
        } catch (_) {}

        const filename = `downloaded_${Date.now()}_${Math.round(Math.random() * 1000)}${ext}`;
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        originalImageUrl = await uploadToStorage(buffer, filename, mimeType);
        console.log(`Pasted image uploaded to storage: ${originalImageUrl}`);
      } catch (dlErr: any) {
        console.error('Failed to download image from URL:', dlErr);
        return res.status(400).json({ error: 'Không thể tải ảnh từ link bạn cung cấp. Vui lòng kiểm tra lại đường dẫn.' });
      }
    }

    let tags: string[] = [];
    if (req.body.tags) {
      try {
        tags = Array.isArray(req.body.tags) 
          ? req.body.tags 
          : JSON.parse(req.body.tags);
      } catch (e) {
        tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    let price = null;
    if (req.body.price !== undefined && req.body.price !== '') {
      price = parseFloat(req.body.price);
    }

    let targetClosetId = req.body.closetId || null;

    if (!targetClosetId) {
      const defaultCloset = await prisma.closet.findFirst({
        where: { userId, isDefault: true }
      });
      if (defaultCloset) {
        targetClosetId = defaultCloset.id;
      }
    }

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
        condition: condition || 'new',
        closetId: targetClosetId,
      },
    });

    const removeBgBool = removeBg !== 'false' && removeBg !== false;

    // Push the background removal job into the sequential queue
    imageQueue.push(async () => {
      await processImageBackground(clothingItem.id, removeBgBool);
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

    const { category, season, isFavorite, search, tag, condition, closetId, orderBy, page = 1, limit = 20 } = req.query;

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

    if (condition) {
      where.condition = condition as string;
    }

    let targetClosetId = closetId as string | undefined;
    if (!targetClosetId && closetId !== 'all') {
      const defaultCloset = await prisma.closet.findFirst({
        where: { userId, isDefault: true }
      });
      if (defaultCloset) {
        targetClosetId = defaultCloset.id;
      }
    }

    if (targetClosetId && closetId !== 'all') {
      where.closetId = targetClosetId;
    }

    let prismaOrderBy: any = { createdAt: 'desc' };
    if (orderBy === 'price_asc') {
      prismaOrderBy = { price: 'asc' };
    } else if (orderBy === 'price_desc') {
      prismaOrderBy = { price: 'desc' };
    } else if (orderBy === 'createdAt_asc') {
      prismaOrderBy = { createdAt: 'asc' };
    } else if (orderBy === 'createdAt_desc') {
      prismaOrderBy = { createdAt: 'desc' };
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
        orderBy: prismaOrderBy,
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

    const { name, category, color, brand, season, notes, tags, isFavorite, condition, duplicateWarning } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (color !== undefined) updateData.color = color || null;
    if (brand !== undefined) updateData.brand = brand || null;
    if (season !== undefined) updateData.season = season || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isFavorite !== undefined) updateData.isFavorite = !!isFavorite;
    if (condition !== undefined) updateData.condition = condition;
    if (duplicateWarning !== undefined) updateData.duplicateWarning = duplicateWarning;


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

    if (req.body.processedImageBase64) {
      const base64Data = req.body.processedImageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const newFilename = `processed_manual_${Date.now()}_${Math.round(Math.random() * 1000)}.png`;
      const newUrl = await uploadToStorage(buffer, newFilename, 'image/png');

      // Delete the old processed file from storage
      if (item.processedImageUrl) {
        await deleteStorageFile(item.processedImageUrl);
      }

      updateData.processedImageUrl = newUrl;
      updateData.processingStatus = 'done';
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

    // Delete image files from storage
    if (item.originalImageUrl) {
      await deleteStorageFile(item.originalImageUrl);
    }
    if (item.processedImageUrl) {
      await deleteStorageFile(item.processedImageUrl);
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
    const [
      totalItems,
      favoritesCount,
      totalOutfits,
      categoryGroups,
      totalValueAggregate,
      avgPriceAggregate,
      categoryValueGroups,
      colorGroups
    ] = await Promise.all([
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
      }),
      prisma.clothingItem.aggregate({
        where: { userId },
        _sum: {
          price: true
        }
      }),
      prisma.clothingItem.aggregate({
        where: { userId, NOT: { price: null } },
        _avg: {
          price: true
        }
      }),
      prisma.clothingItem.groupBy({
        by: ['category'],
        where: { userId },
        _sum: {
          price: true
        }
      }),
      prisma.clothingItem.groupBy({
        by: ['color'],
        where: { userId, NOT: { color: null } },
        _count: {
          color: true
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

    // Format category values
    const byCategoryValue: Record<string, number> = {
      top: 0,
      bottom: 0,
      shoes: 0,
      accessory: 0,
      outerwear: 0
    };

    categoryValueGroups.forEach((group: any) => {
      if (group.category) {
        byCategoryValue[group.category] = Number(group._sum.price || 0);
      }
    });

    // Format color distribution
    const colorDistribution = colorGroups
      .map((group: any) => ({
        color: group.color,
        count: group._count.color
      }))
      .sort((a: any, b: any) => b.count - a.count);

    return res.json({
      totalItems,
      favoritesCount,
      totalOutfits,
      totalValue: Number(totalValueAggregate._sum.price || 0),
      averagePrice: Number(avgPriceAggregate._avg.price || 0),
      byCategory,
      byCategoryValue,
      colorDistribution
    });
  } catch (error) {
    console.error('Get items stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWeatherSuggestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Default to Hanoi coordinates if not provided
    const lat = req.body.latitude ? parseFloat(req.body.latitude) : 21.0285;
    const lon = req.body.longitude ? parseFloat(req.body.longitude) : 105.8542;

    const weather = await fetchWeather(lat, lon);
    const temp = weather.temperature;

    let suggestedSeasons: string[] = ['all'];
    let recommendation = '';

    if (temp < 18) {
      suggestedSeasons.push('winter', 'fall');
      recommendation = 'Thời tiết khá lạnh. Hãy mặc đồ dày dặn, nhiều lớp và nhớ khoác thêm áo nhé!';
    } else if (temp >= 18 && temp <= 25) {
      suggestedSeasons.push('spring', 'fall');
      recommendation = 'Thời tiết mát mẻ dễ chịu. Một chiếc áo mỏng nhẹ hoặc blazer thời trang là lựa chọn hoàn hảo.';
    } else {
      suggestedSeasons.push('summer');
      recommendation = 'Trời khá nóng bức. Hãy chọn những trang phục mỏng nhẹ, cộc tay và thoáng mát nhé!';
    }

    if (weather.isRainy) {
      recommendation += ' Ngoài ra trời có mưa dông, hãy mang theo ô/áo mưa và đi giày chống trơn trượt.';
    }

    // 1. Fetch matching items
    const suggestedItems = await prisma.clothingItem.findMany({
      where: {
        userId,
        condition: { not: 'damaged' },
        season: {
          in: suggestedSeasons
        }
      },
      take: 8,
      orderBy: { isFavorite: 'desc' } // prioritize favorites
    });

    // 2. Fetch matching outfits
    const suggestedOutfits = await prisma.outfit.findMany({
      where: {
        userId,
        items: {
          some: {
            clothingItem: {
              condition: { not: 'damaged' },
              season: {
                in: suggestedSeasons
              }
            }
          }
        }
      },
      include: {
        items: {
          include: {
            clothingItem: true
          }
        }
      },
      take: 3
    });

    return res.json({
      weather,
      recommendation,
      suggestedItems,
      suggestedOutfits
    });
  } catch (error) {
    console.error('Get weather suggestions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const analyzeImageMetadata = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageUrl } = req.body;
    if (!req.file && !imageUrl) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tệp ảnh hoặc đường dẫn link ảnh để phân tích.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5.4';

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Cấu hình API Key bị thiếu. Vui lòng điền OPENAI_API_KEY trong file backend/.env.' 
      });
    }

    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      // Memory storage: use buffer directly
      base64Image = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (imageUrl) {
      try {
        console.log(`Downloading image from URL for AI analysis: ${imageUrl}...`);
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const buffer = Buffer.from(response.data);
        base64Image = buffer.toString('base64');

        const contentType = response.headers['content-type'];
        if (typeof contentType === 'string' && contentType.startsWith('image/')) {
          mimeType = contentType;
        }

      } catch (dlErr) {
        console.error('Failed to download image from URL for AI analysis:', dlErr);
        return res.status(400).json({ error: 'Không thể tải ảnh từ link để AI nhận diện. Vui lòng kiểm tra lại đường dẫn.' });
      }
    }


    const makeOpenAiRequest = async (targetModel: string) => {
      return await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: targetModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Hãy phân tích hình ảnh trang phục này và trả về dữ liệu JSON mô tả trang phục với các trường:
- "name": Tên món đồ tiếng Việt súc tích (ví dụ: Áo phông trắng Uniqlo, Quần tây đen công sở)
- "category": chỉ chọn 1 trong các giá trị sau: 'top', 'bottom', 'shoes', 'accessory', 'outerwear'
- "color": mã màu Hex đại diện chính xác nhất của trang phục dạng #RRGGBB (ví dụ: #FAF6F1)
- "brand": thương hiệu nếu có, nếu không có để chuỗi rỗng
- "season": chỉ chọn 1 trong các giá trị sau: 'spring', 'summer', 'fall', 'winter', 'all'
- "condition": tình trạng của đồ, chỉ chọn 1 trong: 'new' (nếu trông rất mới/chưa mặc), 'good' (trông còn tốt/đã sử dụng), 'old' (trông cũ/sờn), 'damaged' (trông hỏng/rách)
- "tags": mảng các tag tiếng Việt liên quan mô tả phong cách/hoàn cảnh (ví dụ: ['công sở', 'năng động', 'lịch sự'])
Trả về ĐỊNH DẠNG JSON THUẦN TÚY, không có dấu bọc markdown hay bất kỳ ký tự nào bên ngoài chuỗi JSON.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 20s timeout for vision API
        }
      );
    };

    let response;
    try {
      response = await makeOpenAiRequest(model);
    } catch (err) {
      console.warn(`Model ${model} failed, attempting fallback to gpt-4o...`);
      if (model !== 'gpt-4o') {
        response = await makeOpenAiRequest('gpt-4o');
      } else {
        throw err;
      }
    }

    // Clean up temporary file from disk immediately — no longer needed (memory storage)

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI Vision API');
    }

    const parsedData = JSON.parse(content);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Analyze image error:', error.response?.data || error.message);
    const apiError = error.response?.data?.error?.message || error.message;
    return res.status(500).json({ error: `Lỗi phân tích AI: ${apiError}` });
  }
};

// POST /items/rembg - Remove background from a base64 canvas image (for ImageEditor in-place AI)
export const rembgImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Calling rembg Python subprocess for editor inline background removal...');
    const resultBuffer = await removeBackgroundViaPython(buffer);

    const resultBase64 = resultBuffer.toString('base64');
    return res.json({ imageBase64: `data:image/png;base64,${resultBase64}` });
  } catch (error: any) {
    console.error('rembg inline error:', error.message);
    return res.status(500).json({ error: 'Không thể xử lý tách nền hình ảnh bằng AI.' });
  }
};

