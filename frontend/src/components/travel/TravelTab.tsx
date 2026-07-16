import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { ClothingItem, TravelTrip } from '../../../../shared/types';
import { Briefcase, Calendar, MapPin, Plus, Trash2, CheckSquare, Square, Loader2, Sparkles, FolderLock } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';


export default function TravelTab() {
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Trip Form fields
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Selected trip details
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState<string | null>(null);
  // Mobile tab: 'list' shows trips sidebar, 'detail' shows packing checklist
  const [mobilePaneView, setMobilePaneView] = useState<'list' | 'detail'>('list');


  // Wardrobe items selector state
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorLoading, setSelectorLoading] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/trips');
      setTrips(res.data);
      if (res.data.length > 0 && !activeTripId) {
        setActiveTripId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch trips:', err);
      setError('Không thể tải danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError('');

    try {
      const res = await apiClient.post('/trips', {
        name,
        destination,
        startDate,
        endDate
      });
      const newTrip = res.data;
      setTrips([...trips, newTrip]);
      setActiveTripId(newTrip.id);
      setIsFormOpen(false);
      setName('');
      setDestination('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      console.error('Failed to create trip:', err);
      setError(err.response?.data?.error || 'Không thể tạo chuyến đi mới');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = (id: string) => {
    setConfirmDeleteTripId(id);
  };

  const executeDeleteTrip = async (id: string) => {
    try {
      await apiClient.delete(`/trips/${id}`);
      const updatedTrips = trips.filter((t) => t.id !== id);
      setTrips(updatedTrips);
      if (activeTripId === id) {
        setActiveTripId(updatedTrips.length > 0 ? updatedTrips[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete trip:', err);
      alert('Không thể xóa chuyến đi');
    }
  };


  // Load wardrobe items to select from (excludes damaged ones)
  const openSelector = async () => {
    setIsSelectorOpen(true);
    setSelectorLoading(true);
    try {
      const res = await apiClient.get('/items', { params: { limit: 100 } });
      setWardrobe(res.data.items.filter((item: ClothingItem) => item.condition !== 'damaged'));
    } catch (err) {
      console.error('Failed to load wardrobe:', err);
    } finally {
      setSelectorLoading(false);
    }
  };

  // Add item to checklist
  const handleAddItemToTrip = async (clothingItemId: string) => {
    if (!activeTripId) return;
    try {
      const res = await apiClient.post('/trips/items', {
        tripId: activeTripId,
        clothingItemId
      });
      
      setTrips(trips.map((trip) => {
        if (trip.id === activeTripId) {
          return {
            ...trip,
            items: [...(trip.items || []), res.data]
          };
        }
        return trip;
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi thêm đồ vào vali');
    }
  };

  // Remove item from checklist
  const handleRemoveItemFromTrip = async (tripItemId: string) => {
    try {
      await apiClient.delete(`/trips/items/${tripItemId}`);
      
      setTrips(trips.map((trip) => {
        if (trip.id === activeTripId) {
          return {
            ...trip,
            items: (trip.items || []).filter((item) => item.id !== tripItemId)
          };
        }
        return trip;
      }));
    } catch (err) {
      console.error('Failed to remove item:', err);
      alert('Không thể xóa món đồ');
    }
  };

  // Toggle packed status
  const handleTogglePacked = async (tripItemId: string) => {
    try {
      const res = await apiClient.patch(`/trips/items/${tripItemId}/toggle-packed`);
      
      setTrips(trips.map((trip) => {
        if (trip.id === activeTripId) {
          return {
            ...trip,
            items: (trip.items || []).map((item) => 
              item.id === tripItemId ? res.data : item
            )
          };
        }
        return trip;
      }));
    } catch (err) {
      console.error('Failed to toggle packed status:', err);
    }
  };

  const activeTrip = trips.find((t) => t.id === activeTripId);
  const tripItems = activeTrip?.items || [];
  const packedCount = tripItems.filter((i) => i.packed).length;
  const progressPercent = tripItems.length > 0 ? Math.round((packedCount / tripItems.length) * 100) : 0;

  return (
    <div className="w-full space-y-0 text-left">

      {/* Mobile Tab Toggle (only visible on < lg) */}
      <div className="lg:hidden flex bg-stone-100 p-1 rounded-2xl gap-1 mb-4">
        <button
          onClick={() => setMobilePaneView('list')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobilePaneView === 'list' ? 'bg-white text-[#C4704F] shadow-sm' : 'text-stone-500'
          }`}
        >
          ✈️ Hành trình ({trips.length})
        </button>
        <button
          onClick={() => setMobilePaneView('detail')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobilePaneView === 'detail' ? 'bg-white text-[#C4704F] shadow-sm' : 'text-stone-500'
          }`}
        >
          🧳 Checklist Vali
        </button>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
      
      {/* 1. Left Column: Trips List Sidebar (4 Grid Columns) */}
      <div className={`lg:col-span-4 bg-white rounded-3xl border border-stone-100 p-4 sm:p-6 shadow-sm flex flex-col min-h-[300px] lg:h-[580px] w-full lg:order-1 order-2 ${
        mobilePaneView === 'list' ? 'flex' : 'hidden lg:flex'
      }`}>
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-center text-xs mb-3">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center pb-2 border-b border-stone-100 mb-4">
          <h3 className="font-bold text-sm text-[#2A2521] uppercase tracking-wider flex items-center gap-1.5 font-serif">
            <Briefcase className="h-4 w-4 text-[#C4704F]" />
            Hành trình du lịch
          </h3>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#C4704F] hover:bg-[#b05f3f] text-white text-[11px] font-bold rounded-lg transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Mới
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : trips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-stone-50/20 border border-dashed border-stone-200 rounded-2xl">
            <FolderLock className="h-8 w-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-semibold">Chưa có kế hoạch xếp vali nào</p>
            <p className="text-[10px] text-stone-400">Hãy tạo hành trình mới để lên danh sách đồ du lịch!</p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {trips.map((trip) => {
              const isActive = trip.id === activeTripId;
              const tripItemsCount = trip.items?.length || 0;
              const tripPackedCount = trip.items?.filter((i) => i.packed).length || 0;
              
              return (
                <div
                  key={trip.id}
                  onClick={() => setActiveTripId(trip.id)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative ${
                    isActive
                      ? 'border-[#C4704F] bg-white shadow-sm'
                      : 'border-stone-100 bg-[#FAF9F6]/40 hover:bg-[#FAF9F6]'
                  }`}
                >
                  <h4 className="font-bold text-xs text-stone-800 font-serif leading-tight pr-6">{trip.name}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-2 font-medium">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 text-stone-300" />
                      {trip.destination}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3 text-stone-300" />
                      {new Date(trip.startDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  {/* Progress Indicator inside trip card */}
                  <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-stone-400">
                    <span>Đã xếp {tripPackedCount}/{tripItemsCount} món</span>
                    <span className="text-[#C4704F]">{tripItemsCount > 0 ? Math.round((tripPackedCount / tripItemsCount) * 100) : 0}%</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                    className="absolute top-4 right-4 p-1 hover:bg-stone-50 rounded-lg text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Right Column: Packing Checklist Details Workspace (8 Grid Columns) */}
      <div className={`lg:col-span-8 w-full flex flex-col lg:order-2 order-1 min-h-[360px] lg:h-[580px] ${
        mobilePaneView === 'detail' ? 'flex' : 'hidden lg:flex'
      }`}>
        {activeTrip ? (
          <div className="bg-white rounded-3xl border border-stone-100 p-6 space-y-6 shadow-sm h-full flex flex-col overflow-hidden">
            
            {/* Details Header info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 pb-4 shrink-0 gap-3">
              <div className="space-y-1">
                <span className="text-[9px] bg-stone-100 text-stone-500 font-bold uppercase px-2 py-0.5 rounded tracking-wide">
                  Chi tiết đóng gói Vali
                </span>
                <h3 className="font-bold text-lg text-[#2A2521] font-serif leading-none pt-1">{activeTrip.name}</h3>
                <p className="text-xs text-stone-400 flex items-center gap-2 font-medium pt-1">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 text-stone-300" />
                    {activeTrip.destination}
                  </span>
                  <span className="text-stone-300">|</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3 text-stone-300" />
                    Từ {new Date(activeTrip.startDate).toLocaleDateString('vi-VN')} đến {new Date(activeTrip.endDate).toLocaleDateString('vi-VN')}
                  </span>
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-ai-chat', {
                      detail: {
                        query: activeTrip ? `Tôi chuẩn bị đi chuyến đi ${activeTrip.name} tới ${activeTrip.destination}. Hãy gợi ý cho tôi danh sách các trang phục phù hợp để xếp vào Vali từ tủ đồ hiện có của tôi.` : undefined,
                        autoSend: false
                      }
                    }));
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI gợi ý xếp đồ
                </button>
                <button
                  onClick={openSelector}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#8A9A5B] hover:bg-[#72804b] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Chọn đồ vào Vali
                </button>
              </div>
            </div>

            {/* Progress Bar (Always visible) */}
            <div className="space-y-1.5 shrink-0 bg-[#FAF9F6]/40 p-4 border border-stone-50 rounded-2xl">
              <div className="flex justify-between text-xs font-bold text-stone-600">
                <span>Tiến trình chuẩn bị hành lý</span>
                <span className="text-[#8A9A5B]">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8A9A5B] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 font-semibold leading-none">
                Đã chuẩn bị xong {packedCount} trên tổng số {tripItems.length} sản phẩm cần mang đi.
              </p>
            </div>

            {/* Checklist Items Area (Scrollable within parent height) */}
            <div className="flex-1 overflow-y-auto pr-1">
              {tripItems.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-stone-200 rounded-2xl p-6 space-y-3 bg-stone-50/20">
                  <Sparkles className="h-6 w-6 text-[#8A9A5B] mx-auto animate-pulse" />
                  <h4 className="font-bold text-xs text-stone-700 font-serif">Vali đang trống trơn</h4>
                  <p className="text-[10px] text-stone-400 max-w-xs mx-auto">
                    Hãy nhấn nút "Chọn đồ vào Vali" ở góc trên để lựa chọn các món quần áo, giày dép, phụ kiện bạn muốn mang đi chuyến này.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {tripItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 hover:bg-stone-50/50 rounded-xl px-2 transition-colors group"
                    >
                      <div 
                        onClick={() => handleTogglePacked(item.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        {item.packed ? (
                          <CheckSquare className="h-5 w-5 text-[#8A9A5B] shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-stone-300 shrink-0" />
                        )}
                        
                        <div className="flex items-center gap-3">
                          <img
                            src={item.clothingItem?.processedImageUrl || item.clothingItem?.originalImageUrl}
                            alt={item.clothingItem?.name}
                            className="w-10 h-10 object-contain p-0.5 border border-stone-100 rounded-lg bg-stone-50/80"
                          />
                          <div className="text-left">
                            <p className={`text-xs font-bold leading-tight ${item.packed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                              {item.clothingItem?.name}
                            </p>
                            <p className="text-[9px] text-stone-400 mt-1 uppercase font-bold tracking-wider leading-none">
                              {item.clothingItem?.brand || 'Thương hiệu tự do'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItemFromTrip(item.id)}
                        className="p-1.5 hover:bg-stone-100 rounded text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Bỏ khỏi vali"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-stone-100 p-6 space-y-3 shadow-xs h-full text-center">
            <Briefcase className="h-10 w-10 text-stone-300 animate-bounce" />
            <h4 className="font-bold text-sm text-[#2A2521] font-serif">Chọn hoặc tạo chuyến đi</h4>
            <p className="text-xs text-stone-400 max-w-xs text-center leading-relaxed">
              Vui lòng chọn một hành trình ở cột bên trái hoặc nhấp vào nút "Mới" để thiết lập kế hoạch đóng vali cho hành trình tiếp theo của bạn!
            </p>
          </div>
        )}
      </div>

      {/* 3. New Trip Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateTrip}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left"
          >
            <div>
              <h4 className="font-bold text-sm text-[#2A2521] font-serif uppercase tracking-wider">Hành trình du lịch mới</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">Lên lịch trình đóng đồ gọn gàng vào vali</p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tên hành trình *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đi Đà Nẵng 3 ngày"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Điểm đến *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đà Nẵng"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Ngày đi *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Ngày về *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1 px-5 py-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Tạo kế hoạch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Select Clothes Drawer / Modal Overlay */}
      {isSelectorOpen && activeTrip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col h-[520px]">
            
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-sm text-[#2A2521] font-serif uppercase tracking-wider">Lựa chọn quần áo đem đi</h4>
                <p className="text-[10px] text-stone-400 mt-0.5">Click để thêm sản phẩm vào vali của hành trình này</p>
              </div>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clothes grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {selectorLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                </div>
              ) : wardrobe.length === 0 ? (
                <div className="text-center py-20 text-stone-400 text-xs font-semibold">
                  Tủ đồ trống. Vui lòng thêm quần áo vào tủ trước.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-1">
                  {wardrobe.map((item) => {
                    const isAdded = tripItems.some((i) => i.clothingItemId === item.id);
                    const tripItem = tripItems.find((i) => i.clothingItemId === item.id);
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isAdded && tripItem) {
                            handleRemoveItemFromTrip(tripItem.id);
                          } else {
                            handleAddItemToTrip(item.id);
                          }
                        }}
                        className={`p-2 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between aspect-square relative overflow-hidden group ${
                          isAdded
                            ? 'border-[#8A9A5B] bg-[#8A9A5B]/5 shadow-inner'
                            : 'border-stone-100 bg-[#FAF9F6]/20 hover:border-stone-200 hover:bg-[#FAF9F6]/50'
                        }`}
                      >
                        <div className="w-full flex-1 flex items-center justify-center overflow-hidden min-h-[80px]">
                          <img
                            src={item.processedImageUrl || item.originalImageUrl}
                            alt={item.name}
                            className="max-h-[80px] object-contain p-1"
                          />
                        </div>
                        <p className="text-[10px] font-bold text-stone-600 line-clamp-1 mt-1.5 leading-tight text-center">
                          {item.name}
                        </p>
                        
                        {/* Selector Indicator overlays */}
                        {isAdded && (
                          <div className="absolute top-2 right-2 bg-[#8A9A5B] text-white p-0.5 rounded-full z-10 shadow-sm animate-in zoom-in-50">
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="px-5 py-2 bg-[#C4704F] hover:bg-[#b05f3f] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                Hoàn thành chọn đồ
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteTripId !== null}
        title="Xóa kế hoạch chuyến đi"
        message="Bạn có chắc chắn muốn xóa kế hoạch xếp đồ chuyến đi này? Hành động này không thể hoàn tác và toàn bộ danh sách vali xếp đồ sẽ bị loại bỏ."
        confirmLabel="Xóa chuyến đi"
        onConfirm={() => {
          if (confirmDeleteTripId) {
            executeDeleteTrip(confirmDeleteTripId);
            setConfirmDeleteTripId(null);
          }
        }}
        onCancel={() => setConfirmDeleteTripId(null)}
      />
    </div>
    </div>
  );
}


// Inline custom implementation for X icon since we missed importing it
const X = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
  <svg
    onClick={onClick}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
