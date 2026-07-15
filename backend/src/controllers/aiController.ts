import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import axios from 'axios';

export const chatWithStylist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o'; // Defaults to gpt-4o (flagship high-tier)

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Cấu hình API Key của OpenAI bị thiếu. Vui lòng thêm OPENAI_API_KEY vào file backend/.env và restart lại server.' 
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Chat history messages are required' });
    }

    // Fetch wardrobe clothing catalog
    const items = await prisma.clothingItem.findMany({
      where: { userId },
      select: {
        name: true,
        category: true,
        color: true,
        brand: true,
        season: true,
        tags: true,
      },
    });

    const systemPrompt = `Bạn là một trợ lý thời trang cá nhân chuyên nghiệp và thân thiện tên là "Drobe Stylist".
Dưới đây là danh sách quần áo mà người dùng đang sở hữu trong tủ đồ của họ:
${JSON.stringify(items, null, 2)}

Nhiệm vụ của bạn:
1. Tư vấn cách phối đồ (Outfits) phù hợp với nhu cầu của người dùng (đi tiệc, đi học, thời tiết, đi hẹn hò, đi làm công sở...).
2. Chỉ gợi ý kết hợp các trang phục thực sự nằm trong danh sách sở hữu của họ ở trên. Không bịa ra các món đồ họ không có.
3. Trả lời bằng tiếng Việt thân thiện, súc tích, chuyên nghiệp và có định dạng rõ ràng (sử dụng các gạch đầu dòng hoặc bảng nếu cần thiết).`;

    // Make direct API request to OpenAI chat completions
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15s timeout
      }
    );

    const reply = response.data?.choices?.[0]?.message;
    if (!reply) {
      throw new Error('Empty response from OpenAI API');
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('Chat with AI Stylist error:', error.response?.data || error.message);
    const apiError = error.response?.data?.error?.message || error.message;
    return res.status(500).json({ 
      error: `Lỗi kết nối OpenAI: ${apiError}. Vui lòng kiểm tra lại API Key trong backend/.env.` 
    });
  }
};
