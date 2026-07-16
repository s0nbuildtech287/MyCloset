import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { MessageSquare, Send, X, Sparkles, Loader2, Play, Briefcase } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedRecommendation {
  type: 'outfit_recommendation' | 'travel_packing_recommendation';
  tripId?: string;
  items: Array<{ id: string; name: string }>;
}

export default function StylistBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem('drobe_stylist_chat');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: 'Xin chào! Tôi là **Drobe Stylist**, trợ lý thời trang cá nhân của bạn. Tôi có thể giúp bạn phối đồ từ tủ đồ hiện có hoặc chuẩn bị hành lý cho các chuyến đi sắp tới. Bạn muốn tôi tư vấn gì hôm nay?'
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packedStatus, setPackedStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('drobe_stylist_chat', JSON.stringify(messages));
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText } as ChatMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Send chat history to backend
      const res = await apiClient.post('/ai/chat', { messages: newMessages });
      const reply = res.data?.reply;
      if (reply) {
        setMessages([...newMessages, { role: 'assistant', content: reply.content || reply }]);
      }
    } catch (err: any) {
      console.error('StylistBot error:', err);
      const errMsg = err.response?.data?.error || 'Có lỗi kết nối với máy chủ AI. Vui lòng kiểm tra lại cấu hình OpenAI API Key trong backend/.env.';
      setMessages([...newMessages, {
        role: 'assistant',
        content: `❌ **Lỗi:** ${errMsg}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Parses markdown json block from text
  const parseJsonRecommendation = (text: string): ParsedRecommendation | null => {
    try {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        const data = JSON.parse(match[1].trim());
        if (data.type === 'outfit_recommendation' || data.type === 'travel_packing_recommendation') {
          return data;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  };

  // Strip JSON blocks to render clean text message
  const getCleanText = (text: string): string => {
    return text.replace(/```json\s*([\s\S]*?)\s*```/g, '').trim();
  };

  // Action 1: Load outfit recommendations to Canvas workspace
  const handleLoadToCanvas = (items: Array<{ id: string; name: string }>) => {
    // 1. Dispatch custom event to tell OutfitCanvas to load items
    window.dispatchEvent(new CustomEvent('load-outfit-to-canvas', {
      detail: { items }
    }));
    // 2. Dispatch change tab event to App.tsx
    window.dispatchEvent(new CustomEvent('change-active-tab', {
      detail: { tab: 'outfit_canvas' }
    }));
  };

  // Action 2: Add all items directly to suitcase checklist
  const handlePackToSuitcase = async (tripId: string, items: Array<{ id: string; name: string }>) => {
    setPackingLoading(true);
    setPackedStatus('Đang xếp hành lý...');
    let successCount = 0;

    for (const item of items) {
      try {
        await apiClient.post('/trips/items', {
          tripId,
          clothingItemId: item.id
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to pack item ${item.name}:`, err);
      }
    }

    setPackingLoading(false);
    if (successCount > 0) {
      setPackedStatus(`Thành công! Đã xếp ${successCount} món vào Vali.`);
      setTimeout(() => {
        setPackedStatus(null);
        // Switch tab to travel
        window.dispatchEvent(new CustomEvent('change-active-tab', {
          detail: { tab: 'travel' }
        }));
      }, 1500);
    } else {
      setPackedStatus('Thất bại. Vui lòng kiểm tra lại danh sách.');
      setTimeout(() => setPackedStatus(null), 2000);
    }
  };

  return (
    <div className="fixed bottom-20 right-6 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      
      {/* 1. Extended Chat Window Wrapper */}
      {isOpen && (
        <div className="w-[90vw] sm:w-[380px] h-[500px] bg-white/95 backdrop-blur-md rounded-[28px] border border-stone-150 shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header Banner */}
          <div className="bg-[#C4704F] p-4 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-xs leading-none">Drobe Stylist</h4>
                <span className="text-[9px] text-white/80 mt-1 block">Trợ lý phối đồ & Xếp vali AI</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
            {messages.map((msg, idx) => {
              const recommendation = parseJsonRecommendation(msg.content);
              const cleanText = getCleanText(msg.content);

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Msg bubble text */}
                  <div 
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed text-left ${
                      msg.role === 'user' 
                        ? 'bg-[#C4704F] text-white rounded-br-none' 
                        : 'bg-white border border-stone-150 text-stone-700 rounded-bl-none shadow-xs'
                    }`}
                  >
                    {/* Inline simplistic renderer for bullet list or bold markers */}
                    <div className="whitespace-pre-wrap">
                      {cleanText.split('\n').map((line, lIdx) => {
                        let parsed = line;
                        // Replace simple bold markers like **text**
                        const boldMatches = parsed.match(/\*\*(.*?)\*\*/g);
                        if (boldMatches) {
                          return (
                            <p key={lIdx} className="mb-1">
                              {parsed.split('**').map((part, pIdx) => 
                                pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold">{part}</strong> : part
                              )}
                            </p>
                          );
                        }
                        return <p key={lIdx} className="mb-1">{line}</p>;
                      })}
                    </div>
                  </div>

                  {/* Recommendation action block */}
                  {msg.role === 'assistant' && recommendation && (
                    <div className="mt-2.5 w-full max-w-[85%] bg-white border border-stone-150 rounded-2xl p-3 shadow-sm text-left space-y-2 animate-in fade-in duration-200">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                        {recommendation.type === 'outfit_recommendation' ? '✨ Đề xuất Bộ phối đồ' : '🧳 Đề xuất Xếp Vali'}
                      </span>
                      <div className="space-y-1">
                        {recommendation.items.map((item, iIdx) => (
                          <div key={iIdx} className="text-[11px] text-stone-600 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C4704F]" />
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Load to Canvas button */}
                      {recommendation.type === 'outfit_recommendation' && (
                        <button
                          onClick={() => handleLoadToCanvas(recommendation.items)}
                          className="w-full mt-2 py-2 px-3 bg-[#C4704F] hover:bg-[#b05f3f] text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          Thử phối đồ trên Canvas
                        </button>
                      )}

                      {/* Pack to Suitcase button */}
                      {recommendation.type === 'travel_packing_recommendation' && recommendation.tripId && (
                        <button
                          disabled={packingLoading}
                          onClick={() => handlePackToSuitcase(recommendation.tripId!, recommendation.items)}
                          className="w-full mt-2 py-2 px-3 bg-[#8A9A5B] hover:bg-[#72804b] text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {packingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Briefcase className="h-3 w-3" />
                          )}
                          {packedStatus || 'Xếp nhanh vào Vali'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* AI generating spinner */}
            {loading && (
              <div className="flex items-center gap-2 text-stone-400 text-[11px] font-bold animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C4704F]" />
                <span>Drobe Stylist đang phân tích tủ đồ...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input */}
          <form 
            onSubmit={handleSend}
            className="p-3 border-t border-stone-150 bg-white flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Hỏi phối đồ, xếp vali..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white rounded-xl disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* 2. Floating Action Circle Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#C4704F] hover:bg-[#b05f3f] text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group relative"
        title="Trò chuyện với AI Stylist"
      >
        {isOpen ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <>
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
          </>
        )}
      </button>

    </div>
  );
}
