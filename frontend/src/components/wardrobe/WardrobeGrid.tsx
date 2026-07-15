import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { ClothingItem } from '../../../../shared/types';
import { Heart, Search, Edit3, Trash2, Tag, Calendar, ShoppingBag } from 'lucide-react';

interface WardrobeGridProps {
  onEditItem: (item: ClothingItem) => void;
}

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'top', label: 'Áo' },
  { value: 'bottom', label: 'Quần' },
  { value: 'shoes', label: 'Giày' },
  { value: 'accessory', label: 'Phụ kiện' },
  { value: 'outerwear', label: 'Áo khoác' },
];

const SEASONS = [
  { value: '', label: 'Mọi mùa' },
  { value: 'spring', label: 'Xuân' },
  { value: 'summer', label: 'Hạ' },
  { value: 'fall', label: 'Thu' },
  { value: 'winter', label: 'Đông' },
  { value: 'all', label: 'Cả năm' },
];

export default function WardrobeGrid({ onEditItem }: WardrobeGridProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats state
  const [stats, setStats] = useState<{
    totalItems: number;
    favoritesCount: number;
    totalOutfits: number;
    byCategory: Record<string, number>;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/items/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch statistics', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Filter states
  const [category, setCategory] = useState('');
  const [season, setSeason] = useState('');
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page,
        limit: 12,
      };

      if (category) params.category = category;
      if (season) params.season = season;
      if (isFavorite !== null) params.isFavorite = isFavorite.toString();
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await apiClient.get('/items', { params });
      setItems(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải danh sách tủ đồ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, season, isFavorite, debouncedSearch, page]);

  // Smart polling for items in processing or pending status
  useEffect(() => {
    const hasProcessing = items.some(
      (item) => item.processingStatus === 'pending' || item.processingStatus === 'processing'
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchItems();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [items]);

  // Toggle favorite
  const handleToggleFavorite = async (item: ClothingItem) => {
    try {
      const res = await apiClient.patch(`/items/${item.id}`, {
        isFavorite: !item.isFavorite,
      });
      // Update local state
      setItems(items.map((i) => (i.id === item.id ? res.data : i)));
      fetchStats();
    } catch (err: any) {
      alert('Không thể cập nhật trạng thái yêu thích');
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món đồ này khỏi tủ quần áo?')) return;

    try {
      await apiClient.delete(`/items/${id}`);
      setItems(items.filter((i) => i.id !== id));
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Xóa món đồ thất bại');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Statistics */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4704F]/10 flex items-center justify-center text-[#C4704F]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tổng sản phẩm</p>
              <h3 className="text-xl font-bold text-[#2A2521] mt-0.5">{stats.totalItems}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <Heart className="h-5 w-5 fill-red-500 stroke-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Yêu thích</p>
              <h3 className="text-xl font-bold text-[#2A2521] mt-0.5">{stats.favoritesCount}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bộ phối đồ</p>
              <h3 className="text-xl font-bold text-[#2A2521] mt-0.5">{stats.totalOutfits}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center gap-1 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tỉ lệ phân loại</p>
            <div className="flex gap-1.5 items-center mt-1">
              <div className="flex-1 h-2 rounded bg-stone-100 overflow-hidden flex">
                {Object.entries(stats.byCategory).map(([cat, count]) => {
                  if (count === 0 || stats.totalItems === 0) return null;
                  const pct = (count / stats.totalItems) * 100;
                  const bg = 
                    cat === 'top' ? 'bg-[#C4704F]' :
                    cat === 'bottom' ? 'bg-amber-500' :
                    cat === 'shoes' ? 'bg-emerald-500' :
                    cat === 'outerwear' ? 'bg-blue-500' : 'bg-stone-400';
                  return (
                    <div 
                      key={cat} 
                      className={`${bg} h-full`} 
                      style={{ width: `${pct}%` }} 
                      title={`${cat}: ${count} món (${Math.round(pct)}%)`} 
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-bold text-stone-500 shrink-0">
                {Object.values(stats.byCategory).filter(c => c > 0).length} loại
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
        {/* Search and Favorite toggle */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] bg-[#FAF6F1]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsFavorite(isFavorite === true ? null : true);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border rounded-xl transition-all ${
                isFavorite === true
                  ? 'border-[#C4704F] bg-[#C4704F]/5 text-[#C4704F]'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite === true ? 'fill-[#C4704F]' : ''}`} />
              Đồ yêu thích
            </button>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Danh mục</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat.value
                    ? 'bg-[#2A2521] text-white'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Season filter */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Mùa phù hợp</label>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((se) => (
              <button
                key={se.value}
                onClick={() => {
                  setSeason(se.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  season === se.value
                    ? 'bg-[#8A9A5B] text-white'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {se.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {/* Wardrobe Grid */}
      {loading ? (
        /* Shimmer Loading state */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm animate-pulse space-y-4 pb-4">
              <div className="aspect-square bg-stone-100 w-full" />
              <div className="px-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="bg-white py-16 px-4 text-center rounded-2xl border border-stone-100 shadow-sm max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-[#FAF6F1] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="h-8 w-8 text-stone-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#2A2521]">Tủ đồ đang trống</h3>
            <p className="text-sm text-stone-500">
              Hãy bấm thêm sản phẩm đầu tiên vào tủ đồ cá nhân của bạn nhé!
            </p>
          </div>
        </div>
      ) : (
        /* Grid Display */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image card header */}
              <div className="relative aspect-square w-full bg-[#FAF6F1]/50 overflow-hidden flex items-center justify-center border-b border-stone-50">
                <img
                  src={item.processingStatus === 'done' && item.processedImageUrl ? item.processedImageUrl : item.originalImageUrl}
                  alt={item.name}
                  className={`object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300 ${
                    item.processingStatus === 'pending' || item.processingStatus === 'processing' ? 'blur-sm grayscale' : ''
                  }`}
                />

                {/* Processing Overlay */}
                {(item.processingStatus === 'pending' || item.processingStatus === 'processing') && (
                  <div className="absolute inset-0 bg-stone-900/30 flex flex-col items-center justify-center text-white p-2">
                    <span className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin mb-1"></span>
                    <span className="text-[10px] font-bold tracking-wider uppercase drop-shadow-sm">Đang tách nền...</span>
                  </div>
                )}

                {/* Failed Badge */}
                {item.processingStatus === 'failed' && (
                  <span className="absolute top-3 right-3 bg-red-100/90 text-red-700 px-2 py-0.5 rounded text-[9px] font-bold border border-red-200 shadow-sm">
                    Lỗi tách nền
                  </span>
                )}

                {/* Floating tags */}
                {item.isFavorite && (
                  <span className="absolute top-3 left-3 bg-white/95 text-[#C4704F] p-1.5 rounded-full shadow-sm">
                    <Heart className="h-3.5 w-3.5 fill-[#C4704F] stroke-[#C4704F]" />
                  </span>
                )}

                {/* Action buttons (Visible on hover, only when not processing) */}
                {item.processingStatus !== 'pending' && item.processingStatus !== 'processing' ? (
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(item)}
                      className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-[#C4704F] transition-colors"
                      title={item.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    >
                      <Heart className={`h-4 w-4 ${item.isFavorite ? 'fill-[#C4704F]' : ''}`} />
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-stone-700 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-red-600 transition-colors"
                      title="Xóa món đồ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* Only allow deletion during processing */
                  <div className="absolute inset-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 bg-white rounded-full shadow hover:bg-stone-50 text-red-600 transition-colors"
                      title="Xóa món đồ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Detail body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                  </span>
                  <h4 className="font-semibold text-sm text-[#2A2521] line-clamp-1 group-hover:text-[#C4704F] transition-colors">
                    {item.name}
                  </h4>
                  {item.brand && (
                    <p className="text-xs text-stone-500 font-medium">{item.brand}</p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-50">
                  {/* Meta items */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                    {item.season && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {SEASONS.find((s) => s.value === item.season)?.label || item.season}
                      </span>
                    )}
                    {item.price && (
                      <span className="font-semibold text-[#8A9A5B]">
                        {Number(item.price).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-0.5 px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px]"
                        >
                          <Tag className="h-2 w-2 text-stone-400" />
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[9px]">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination control */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-xs font-semibold border border-stone-200 rounded-lg text-stone-600 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Trước
          </button>
          <span className="text-xs text-stone-500">
            Trang {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs font-semibold border border-stone-200 rounded-lg text-stone-600 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
