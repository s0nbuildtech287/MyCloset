import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { ClothingItem } from '../../../../shared/types';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Thermometer, Sparkles, AlertCircle } from 'lucide-react';

interface OutfitItemDetail {
  id: string;
  clothingItemId: string;
  clothingItem: ClothingItem;
}

interface OutfitDetail {
  id: string;
  name: string;
  thumbnailUrl: string;
  items: OutfitItemDetail[];
}

interface WeatherData {
  weather: {
    temperature: number;
    condition: string;
    isRainy: boolean;
    weatherCode: number;
  };
  recommendation: string;
  suggestedItems: ClothingItem[];
  suggestedOutfits: OutfitDetail[];
}

// Helper to render matching Lucide icon based on WMO weather code
const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-8 w-8 text-amber-500 animate-spin-slow" />;
  if (code >= 1 && code <= 3) return <Cloud className="h-8 w-8 text-stone-400" />;
  if (code === 45 || code === 48) return <CloudFog className="h-8 w-8 text-stone-300" />;
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return <CloudRain className="h-8 w-8 text-blue-400" />;
  }
  if (code >= 71 && code <= 77) return <CloudSnow className="h-8 w-8 text-sky-300" />;
  if (code >= 95) return <CloudLightning className="h-8 w-8 text-purple-500" />;
  return <Sun className="h-8 w-8 text-amber-500" />;
};

export default function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchSuggestions = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      const res = await apiClient.post('/items/weather-suggestions', {
        latitude,
        longitude,
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch weather suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchSuggestions(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation failed/denied, falling back to Hanoi coordinates:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
          // Default Hanoi coords: Lat 21.0285, Lon 105.8542
          fetchSuggestions(21.0285, 105.8542);
        },
        { timeout: 6000 }
      );
    } else {
      console.warn('Geolocation not supported, using default Hanoi coordinates');
      fetchSuggestions(21.0285, 105.8542);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm animate-pulse space-y-4">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 bg-stone-100 rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-stone-100 rounded w-1/4" />
            <div className="h-3 bg-stone-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { weather, recommendation, suggestedItems, suggestedOutfits } = data;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col">
      {/* 1. Weather Info Banner */}
      <div className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between bg-stone-50/50 border-b border-stone-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl border border-stone-100 shadow-sm flex items-center justify-center shrink-0">
            {getWeatherIcon(weather.weatherCode)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-md text-[#2A2521] font-serif">Thời tiết hiện tại</h4>
              {permissionDenied && (
                <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.2 rounded" title="GPS bị chặn, hiển thị thời tiết mặc định">
                  <AlertCircle className="h-2.5 w-2.5" /> Mặc định
                </span>
              )}
            </div>
            
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-[#C4704F]" />
              {weather.temperature}°C &bull; {weather.condition}
            </p>
          </div>
        </div>

        {/* Suggestion Text */}
        <div className="flex-1 max-w-xl text-left bg-white p-3 rounded-xl border border-stone-100 shadow-inner flex gap-2 items-start">
          <span className="p-1 rounded bg-[#C4704F]/10 text-[#C4704F] shrink-0 mt-0.5">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs text-stone-600 font-medium leading-relaxed">
            {recommendation}
          </p>
        </div>
      </div>

      {/* 2. Recommendations Slider */}
      {(suggestedItems.length > 0 || suggestedOutfits.length > 0) ? (
        <div className="p-5 space-y-4">
          {/* Suggested Outfits first */}
          {suggestedOutfits.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Gợi ý bộ phối hợp thời tiết:</h5>
              <div className="flex gap-4 overflow-x-auto pb-2 pr-1 select-none">
                {suggestedOutfits.map((outfit) => (
                  <div key={outfit.id} className="w-[120px] shrink-0 space-y-1 group">
                    <div className="aspect-square bg-[#FAF6F1]/50 border border-stone-100 rounded-xl p-1 overflow-hidden flex items-center justify-center relative">
                      <img
                        src={outfit.thumbnailUrl}
                        alt={outfit.name}
                        className="object-contain max-h-full max-w-full group-hover:scale-102 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-stone-600 line-clamp-1 text-center font-serif leading-tight">
                      {outfit.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Individual items */}
          {suggestedItems.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quần áo khuyên dùng trong ngày:</h5>
              <div className="flex gap-4 overflow-x-auto pb-2 pr-1 select-none">
                {suggestedItems.map((item) => (
                  <div key={item.id} className="w-[80px] shrink-0 space-y-1 text-center group">
                    <div className="aspect-square bg-[#FAF6F1]/50 border border-stone-100 rounded-xl p-1 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.processedImageUrl || item.originalImageUrl}
                        alt={item.name}
                        className="object-contain max-h-full max-w-full p-0.5 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-stone-500 line-clamp-1 leading-tight">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-stone-400">
          Không tìm thấy trang phục phù hợp cho thời tiết này. Hãy thêm thêm quần áo và phối đồ nhé!
        </div>
      )}
    </div>
  );
}
