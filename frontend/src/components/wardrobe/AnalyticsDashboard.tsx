import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DollarSign, Tag, ShoppingBag, Layers } from 'lucide-react';

interface StatsData {
  totalItems: number;
  favoritesCount: number;
  totalOutfits: number;
  totalValue: number;
  averagePrice: number;
  byCategory: Record<string, number>;
  byCategoryValue: Record<string, number>;
  colorDistribution: Array<{ color: string; count: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  top: 'Áo',
  bottom: 'Quần',
  shoes: 'Giày dép',
  accessory: 'Phụ kiện',
  outerwear: 'Áo khoác',
};

// Clever helper to translate color name string into actual Hex code for rendering circles
const getHexColor = (col: string) => {
  if (!col) return '#e2e8f0';
  if (col.startsWith('#') && col.length === 7) return col;
  
  const lower = col.toLowerCase().trim();
  const colorMap: Record<string, string> = {
    'đen': '#1a1a1a',
    'black': '#1a1a1a',
    'trắng': '#fcfcfc',
    'white': '#fcfcfc',
    'đỏ': '#dc2626',
    'red': '#dc2626',
    'xanh': '#2563eb',
    'blue': '#2563eb',
    'xanh lá': '#16a34a',
    'green': '#16a34a',
    'vàng': '#ca8a04',
    'yellow': '#ca8a04',
    'xám': '#4b5563',
    'gray': '#4b5563',
    'grey': '#4b5563',
    'beige': '#e6dfd3',
    'kem': '#f5f5dc',
    'hồng': '#db2777',
    'pink': '#db2777',
    'cam': '#ea580c',
    'orange': '#ea580c',
    'nâu': '#78350f',
    'brown': '#78350f',
  };
  
  return colorMap[lower] || '#cbd5e1'; // fallback slate color
};

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get('/items/stats');
        setStats(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Không thể tải báo cáo thống kê');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <span className="w-8 h-8 rounded-full border-4 border-[#C4704F] border-t-transparent animate-spin"></span>
        <p className="text-sm font-semibold text-stone-500">Đang tính toán số liệu thống kê...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-center text-sm max-w-md mx-auto">
        {error || 'Không có dữ liệu báo cáo.'}
      </div>
    );
  }

  // Format currency helper
  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#2A2521] font-serif">Báo cáo tủ đồ</h2>
        <p className="text-xs text-stone-500">Phân tích giá trị đầu tư và phân phối phong cách thời trang của bạn</p>
      </div>

      {/* 2. Key Finance & Quantity Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tổng giá trị tủ đồ</span>
            <span className="p-1.5 rounded-lg bg-[#C4704F]/10 text-[#C4704F]">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#2A2521] tracking-tight">
            {formatCurrency(stats.totalValue)}
          </h3>
          <p className="text-[10px] text-stone-400 font-medium">Toàn bộ chi phí mua sắm quần áo</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Giá trung bình món</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Tag className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#2A2521] tracking-tight">
            {formatCurrency(stats.averagePrice)}
          </h3>
          <p className="text-[10px] text-stone-400 font-medium">Giá trị trung bình trên một sản phẩm</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Số lượng sản phẩm</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#2A2521] tracking-tight">
            {stats.totalItems} món
          </h3>
          <p className="text-[10px] text-stone-400 font-medium">Phân chia theo {Object.values(stats.byCategory).filter(c => c > 0).length} loại mặt hàng</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bộ phối đã ghép</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#2A2521] tracking-tight">
            {stats.totalOutfits} bộ
          </h3>
          <p className="text-[10px] text-stone-400 font-medium">Các outfit do bạn sáng tạo</p>
        </div>
      </div>

      {/* 3. Detailed Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Category Financial Breakdown (Left Column) */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-sm text-[#2A2521] font-serif">Đầu tư theo danh mục</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Giá trị tài sản chi tiết của từng phân loại sản phẩm</p>
          </div>

          <div className="space-y-4">
            {Object.entries(stats.byCategoryValue).map(([cat, val]) => {
              const count = stats.byCategory[cat] || 0;
              const percent = stats.totalValue > 0 ? (val / stats.totalValue) * 100 : 0;
              
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-stone-700">
                    <span className="flex items-center gap-1.5">
                      {CATEGORY_LABELS[cat] || cat}
                      <span className="text-[9px] font-bold bg-stone-100 px-1 py-0.2 rounded text-stone-400">
                        {count} món
                      </span>
                    </span>
                    <span>
                      {formatCurrency(val)} ({Math.round(percent)}%)
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-stone-50 overflow-hidden border border-stone-100">
                    <div
                      className="h-full bg-[#C4704F] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Palette Distribution (Right Column) */}
        <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-sm text-[#2A2521] font-serif">Bảng màu sắc yêu thích</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Tỷ lệ phân phối các tông màu có trong tủ quần áo</p>
          </div>

          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {stats.colorDistribution.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                Chưa có dữ liệu màu sắc
              </div>
            ) : (
              stats.colorDistribution.map((col) => {
                const percent = stats.totalItems > 0 ? (col.count / stats.totalItems) * 100 : 0;
                const renderedHex = getHexColor(col.color);

                return (
                  <div key={col.color} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {/* Color Circle */}
                      <span
                        className="w-5 h-5 rounded-full border border-stone-200 shadow-inner flex shrink-0"
                        style={{ backgroundColor: renderedHex }}
                      />
                      <span className="font-semibold text-stone-700 capitalize">
                        {col.color}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-semibold text-stone-500 text-right">
                      <span>{col.count} món</span>
                      <span className="text-stone-400 text-[10px] font-bold">
                        {Math.round(percent)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
