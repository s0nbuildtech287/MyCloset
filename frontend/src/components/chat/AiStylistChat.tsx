import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiStylistChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize with a welcome message if history is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Xin chào! Tôi là Drobe Stylist, trợ lý thời trang cá nhân của bạn. 🌸\n\nTôi đã quét toàn bộ các món đồ trong tủ đồ thực tế của bạn. Bạn muốn tôi tư vấn cách phối đồ cho dịp gì hôm nay? Ví dụ: đi đám cưới bạn thân, đi dạo phố ngày hè, hay chọn trang phục hợp thời tiết se lạnh...',
        },
      ]);
    }
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Send chat history (excluding the very first welcome message if it's too long, or just send the whole array)
      const res = await apiClient.post('/ai/chat', {
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });
      
      const reply = res.data?.reply;
      if (reply) {
        setMessages([...updatedMessages, { role: 'assistant', content: reply.content }]);
      }
    } catch (err: any) {
      console.error('Failed to send chat message:', err);
      const errMsg = err.response?.data?.error || 'Không thể kết nối tới AI Stylist. Vui lòng kiểm tra lại cấu hình API key.';
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: `⚠️ Lỗi: ${errMsg}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end">
      
      {/* 1. Chat Window */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[480px] bg-white border border-stone-150 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-[#2A2521] text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-[#C4704F] text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h4 className="font-bold text-xs font-serif leading-none tracking-wide text-stone-100 flex items-center gap-1">
                  Drobe Stylist
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </h4>
                <p className="text-[9px] text-stone-400 mt-1 leading-none">Trợ lý thời trang AI cá nhân</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9F6]/40 select-text">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-500 border border-stone-200 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                
                <div
                  className={`p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#C4704F] text-white rounded-tr-none font-medium'
                      : 'bg-white text-stone-700 rounded-tl-none border border-stone-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Loading / Typing indicator */}
            {loading && (
              <div className="flex gap-2 max-w-[85%] mr-auto justify-start animate-pulse">
                <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-500 border border-stone-200 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="p-3 bg-white text-stone-500 rounded-2xl rounded-tl-none border border-stone-100 flex items-center gap-1.5 text-[10px] font-semibold">
                  <Loader2 className="h-3 w-3 animate-spin text-[#C4704F]" />
                  Drobe Stylist đang phân tích đồ...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi Drobe Stylist phối đồ..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-[#C4704F] hover:bg-[#b05f3f] text-white disabled:opacity-40 transition-colors shadow-sm shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* 2. Floating Round Bubble Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-[#C4704F] text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 hover:bg-[#b05f3f] transition-all relative group animate-in zoom-in duration-300"
        title="Trợ lý thời trang AI"
      >
        <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
      </button>

    </div>
  );
}
