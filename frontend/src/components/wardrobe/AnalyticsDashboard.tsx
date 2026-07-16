import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DollarSign, Tag, ShoppingBag, Layers, BarChart, PieChart } from 'lucide-react';

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

const CATEGORY_COLORS: Record<string, string> = {
  top: '#C4704F',      // Terracotta
  bottom: '#8A9A5B',   // Moss Green
  shoes: '#4A6B82',    // Slate Blue
  accessory: '#D4AF37',// Gold
  outerwear: '#696969',// Dim Gray
};

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
  
  return colorMap[lower] || '#cbd5e1';
};

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSlice, setActiveSlice] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<string | null>(null);

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

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  const donutRadius = 40;
  const donutCirc = 2 * Math.PI * donutRadius;
  const validCategories = Object.entries(stats.byCategory).filter(([_, count]) => count > 0);
  const totalCategoryCount = validCategories.reduce((sum, [_, count]) => sum + count, 0);

  let accumulatedPercent = 0;
  const donutSlices = validCategories.map(([cat, count]) => {
    const percent = totalCategoryCount > 0 ? (count / totalCategoryCount) * 100 : 0;
    const strokeDasharray = `${(percent * donutCirc) / 100} ${donutCirc}`;
    const strokeDashoffset = -((accumulatedPercent * donutCirc) / 100);
    accumulatedPercent += percent;
    return {
      category: cat,
      count,
      percent,
      strokeDasharray,
      strokeDashoffset,
      color: CATEGORY_COLORS[cat] || '#cbd5e1',
    };
  });

  const barChartMax = Math.max(...Object.values(stats.byCategoryValue), 1);
  const barChartEntries = Object.entries(stats.byCategoryValue).map(([cat, val]) => ({
    category: cat,
    value: val,
    heightPercent: (val / barChartMax) * 80,
    color: CATEGORY_COLORS[cat] || '#cbd5e1',
  }));

  return (
    <div className="w-full space-y-8 select-none">
      
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm text-left">
        <h2 className="text-xl font-bold text-[#2A2521] font-serif">Báo cáo & Phân tích tủ đồ</h2>
        <p className="text-xs text-stone-500 mt-1">Phân tích giá trị tài chính mua sắm và cơ cấu phong cách thời trang của bạn.</p>
      </div>

      {/* Financial & Quantity Cards (Premium visual styling) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        
        {/* Card 1: Total value */}
        <div className="bg-white p-3 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden text-left group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#C4704F]" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tổng giá trị</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-[#C4704F]/10 text-[#C4704F]">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>
          <h3 className="text-base sm:text-2xl font-black text-[#2A2521] tracking-tight mt-2 sm:mt-3 truncate">
            {formatCurrency(stats.totalValue)}
          </h3>
          <p className="text-[10px] text-stone-400 mt-1 font-semibold leading-none hidden sm:block">Tổng chi phí đầu tư thời trang</p>
        </div>

        {/* Card 2: Average price */}
        <div className="bg-white p-3 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden text-left group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#8A9A5B]" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Giá TB</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-[#8A9A5B]/10 text-[#8A9A5B]">
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>
          <h3 className="text-base sm:text-2xl font-black text-[#2A2521] tracking-tight mt-2 sm:mt-3 truncate">
            {formatCurrency(stats.averagePrice)}
          </h3>
          <p className="text-[10px] text-stone-400 mt-1 font-semibold leading-none hidden sm:block">Trung bình giá trị một sản phẩm</p>
        </div>

        {/* Card 3: Total items */}
        <div className="bg-white p-3 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden text-left group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#4A6B82]" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Sản phẩm</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-[#4A6B82]/10 text-[#4A6B82]">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>
          <h3 className="text-base sm:text-2xl font-black text-[#2A2521] tracking-tight mt-2 sm:mt-3">
            {stats.totalItems} món
          </h3>
          <p className="text-[10px] text-stone-400 mt-1 font-semibold leading-none hidden sm:block">Phân bổ trên {validCategories.length} danh mục</p>
        </div>

        {/* Card 4: Total outfits */}
        <div className="bg-white p-3 sm:p-5 rounded-3xl border border-stone-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden text-left group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37]" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bộ phối</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>
          <h3 className="text-base sm:text-2xl font-black text-[#2A2521] tracking-tight mt-2 sm:mt-3">
            {stats.totalOutfits} bộ
          </h3>
          <p className="text-[10px] text-stone-400 mt-1 font-semibold leading-none hidden sm:block">Bộ phối đồ tự thiết kế sáng tạo</p>
        </div>
      </div>

      {/* Visual Charts Grid (Stretching across screen width dynamically) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Donut Chart: Quantity Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-stone-100 shadow-sm space-y-6 text-left flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[#2A2521] font-serif flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-[#C4704F]" />
              Phân bổ số lượng sản phẩm
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">Tỷ lệ cơ cấu các loại quần áo trong tủ đồ hoạt động</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-8 py-4">
            {/* Interactive SVG Donut */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#FAF6F1"
                  strokeWidth="10"
                />
                {donutSlices.map((slice) => {
                  const isActive = activeSlice === slice.category;
                  return (
                    <circle
                      key={slice.category}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isActive ? '13' : '10'}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveSlice(slice.category)}
                      onMouseLeave={() => setActiveSlice(null)}
                      className="cursor-pointer transition-all duration-300 origin-center"
                    />
                  );
                })}
              </svg>
              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-[#2A2521] leading-none">{stats.totalItems}</span>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-1.5">Sản phẩm</span>
              </div>
            </div>

            {/* Labels Legend */}
            <div className="space-y-2 flex-1 w-full text-left">
              {donutSlices.map((slice) => {
                const isActive = activeSlice === slice.category;
                return (
                  <div
                    key={slice.category}
                    onMouseEnter={() => setActiveSlice(slice.category)}
                    onMouseLeave={() => setActiveSlice(null)}
                    className={`flex items-center justify-between text-xs p-2 rounded-xl transition-colors cursor-pointer ${
                      isActive ? 'bg-[#C4704F]/5 text-[#C4704F] font-bold' : 'text-stone-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="font-semibold">{CATEGORY_LABELS[slice.category] || slice.category}</span>
                    </div>
                    <span className="font-bold">{slice.count} món ({Math.round(slice.percent)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bar Chart: Investment Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-stone-100 shadow-sm space-y-6 text-left flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[#2A2521] font-serif flex items-center gap-1.5">
              <BarChart className="h-4 w-4 text-[#8A9A5B]" />
              Giá trị đầu tư thời trang
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">So sánh chi phí mua sắm theo từng nhóm danh mục thời trang</p>
          </div>

          <div className="h-40 sm:h-48 flex items-end gap-2 sm:gap-6 border-b border-stone-100 pb-2 relative mt-4">
            {/* Bars */}
            {barChartEntries.map((bar) => {
              const isActive = activeBar === bar.category;
              return (
                <div
                  key={bar.category}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  onMouseEnter={() => setActiveBar(bar.category)}
                  onMouseLeave={() => setActiveBar(null)}
                >
                  {/* Tooltip on hover */}
                  {isActive && (
                    <div className="absolute -top-10 bg-stone-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl shadow-md z-10 whitespace-nowrap animate-in fade-in duration-100">
                      {formatCurrency(bar.value)}
                    </div>
                  )}

                  <div
                    className="w-full rounded-t-xl transition-all duration-300"
                    style={{
                      height: `${bar.heightPercent}%`,
                      backgroundColor: bar.color,
                      opacity: activeBar && !isActive ? 0.4 : 1,
                    }}
                  />
                  
                  <span className="text-[10px] font-bold text-stone-400 mt-2 truncate w-full text-center">
                    {CATEGORY_LABELS[bar.category] || bar.category}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bar Chart Value Info */}
          <div className="pt-2 flex justify-between items-center text-xs font-bold text-stone-600">
            <span>Tổng vốn đầu tư:</span>
            <span className="text-[#8A9A5B] font-extrabold text-sm">{formatCurrency(stats.totalValue)}</span>
          </div>
        </div>

      </div>

      {/* Color Palette List (Full Width styling) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-stone-100 shadow-sm space-y-4 text-left">
        <div>
          <h3 className="font-bold text-sm text-[#2A2521] font-serif">Phân bổ màu sắc trang phục</h3>
          <p className="text-[10px] text-stone-400 mt-0.5">Bản đồ phân phối màu sắc quần áo thực tế đang sở hữu</p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          {stats.colorDistribution.length === 0 ? (
            <div className="text-center py-6 text-stone-400 text-xs w-full">
              Chưa có dữ liệu màu sắc
            </div>
          ) : (
            stats.colorDistribution.map((col) => {
              const percent = stats.totalItems > 0 ? (col.count / stats.totalItems) * 100 : 0;
              const renderedHex = getHexColor(col.color);

              return (
                <div
                  key={col.color}
                  className="flex items-center gap-3 bg-stone-50 border border-stone-100 px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-700 shadow-xs hover:border-stone-200 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-stone-200 shadow-inner shrink-0"
                    style={{ backgroundColor: renderedHex }}
                  />
                  <div>
                    <p className="capitalize leading-none text-xs">{col.color}</p>
                    <p className="text-[9px] text-[#C4704F] mt-1 font-bold leading-none">
                      {col.count} món ({Math.round(percent)}%)
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
