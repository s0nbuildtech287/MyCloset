import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Trash2, ShoppingBag, Calendar, Eye, X } from 'lucide-react';
import OutfitCalendar from './OutfitCalendar';

interface OutfitItemDetail {
  id: string;
  clothingItemId: string;
  clothingItem: {
    name: string;
    originalImageUrl: string;
    category: string;
  };
}

interface OutfitDetail {
  id: string;
  name: string;
  thumbnailUrl: string;
  createdAt: string;
  items: OutfitItemDetail[];
}

export default function MyOutfits() {
  const [subTab, setSubTab] = useState<'saved' | 'planner'>('saved');
  const [outfits, setOutfits] = useState<OutfitDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selected outfit for modal preview
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitDetail | null>(null);

  const fetchOutfits = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/outfits');
      setOutfits(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải danh sách bộ phối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutfits();
  }, []);

  const handleDeleteOutfit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal opening
    if (!window.confirm('Bạn có chắc chắn muốn xóa bộ phối này?')) return;

    try {
      await apiClient.delete(`/outfits/${id}`);
      setOutfits(outfits.filter((o) => o.id !== id));
      if (selectedOutfit?.id === id) {
        setSelectedOutfit(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Xóa bộ phối thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#2A2521] font-serif">Bộ phối của bạn</h2>
          <p className="text-xs text-stone-500">Xem lại và quản lý danh sách các bộ trang phục đã được bạn ghép đôi</p>
        </div>
      </div>

      {/* Sub tabs switch */}
      <div className="flex gap-2 border-b border-stone-200 pb-px">
        <button
          onClick={() => setSubTab('saved')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            subTab === 'saved'
              ? 'border-[#C4704F] text-[#C4704F]'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Bộ phối đã lưu
        </button>
        <button
          onClick={() => setSubTab('planner')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            subTab === 'planner'
              ? 'border-[#C4704F] text-[#C4704F]'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Lịch phối đồ (Planner)
        </button>
      </div>

      {subTab === 'planner' ? (
        <OutfitCalendar />
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-center text-sm">
              {error}
            </div>
          )}

      {loading ? (
        /* Shimmer Loading */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm animate-pulse space-y-4 pb-4">
              <div className="aspect-square bg-stone-100 w-full" />
              <div className="px-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : outfits.length === 0 ? (
        /* Empty State */
        <div className="bg-white py-16 px-4 text-center rounded-2xl border border-stone-100 shadow-sm max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-[#FAF6F1] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="h-8 w-8 text-stone-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2A2521]">Chưa có bộ phối nào</h3>
            <p className="text-sm text-stone-500">
              Hãy sang tab Ghép đồ để tự tay phối thử bộ trang phục yêu thích của mình nhé!
            </p>
          </div>
        </div>
      ) : (
        /* Grid Display */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {outfits.map((outfit) => (
            <div
              key={outfit.id}
              onClick={() => setSelectedOutfit(outfit)}
              className="group bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full bg-[#FAF6F1]/50 overflow-hidden flex items-center justify-center border-b border-stone-50">
                <img
                  src={outfit.thumbnailUrl}
                  alt={outfit.name}
                  className="object-contain w-full h-full p-2 group-hover:scale-102 transition-transform duration-300"
                />
                
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <span className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-stone-700 transition-colors">
                    <Eye className="h-4 w-4" />
                  </span>
                  <button
                    onClick={(e) => handleDeleteOutfit(outfit.id, e)}
                    className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-red-600 transition-colors"
                    title="Xóa bộ phối"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Description Body */}
              <div className="p-4 space-y-2">
                <h4 className="font-semibold text-sm text-[#2A2521] line-clamp-1 group-hover:text-[#C4704F] transition-colors">
                  {outfit.name}
                </h4>
                <div className="flex justify-between items-center text-[10px] text-stone-400">
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(outfit.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                    {outfit.items.length} món
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outfit Preview Detail Modal */}
      {selectedOutfit && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row h-[420px] md:h-[350px]">
            {/* Left Column: Image */}
            <div className="bg-[#FAF6F1]/50 flex items-center justify-center p-4 md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-stone-100">
              <img
                src={selectedOutfit.thumbnailUrl}
                alt={selectedOutfit.name}
                className="object-contain max-h-full max-w-full"
              />
            </div>

            {/* Right Column: Details list */}
            <div className="p-5 flex-1 flex flex-col justify-between h-1/2 md:h-full">
              <div className="space-y-3 overflow-y-auto">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-md font-bold text-[#2A2521] font-serif line-clamp-2">{selectedOutfit.name}</h3>
                  <button
                    onClick={() => setSelectedOutfit(null)}
                    className="p-1 hover:bg-stone-50 rounded text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                
                <p className="text-[10px] text-stone-400">
                  Lưu ngày: {new Date(selectedOutfit.createdAt).toLocaleString('vi-VN')}
                </p>

                {/* Items contained list */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Các sản phẩm phối:</h4>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                    {selectedOutfit.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2 p-1 bg-stone-50 border border-stone-100 rounded-lg">
                        <img
                          src={it.clothingItem.originalImageUrl}
                          alt={it.clothingItem.name}
                          className="w-7 h-7 object-contain bg-white rounded border border-stone-100"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-stone-700 line-clamp-1">{it.clothingItem.name}</p>
                          <p className="text-[9px] text-stone-400 capitalize">{it.clothingItem.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => handleDeleteOutfit(selectedOutfit.id, e)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa bộ phối
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOutfit(null)}
                  className="px-3 py-1.5 bg-[#2A2521] text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
