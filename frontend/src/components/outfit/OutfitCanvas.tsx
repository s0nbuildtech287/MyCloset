import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { apiClient } from '../../api/client';
import type { ClothingItem } from '../../../../shared/types';
import { Trash2, ArrowUp, ArrowDown, Save, RefreshCw, Layers } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';


interface CanvasItem {
  id: string; // unique instance ID
  clothingItemId: string;
  imageUrl: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  zIndex: number;
}

// Custom hook to load HTML Image safely
function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
  }, [src]);

  return image;
}

// Sub-component for individual Konva images
interface IndividualImageProps {
  item: CanvasItem;
  onSelect: () => void;
  onChange: (newAttrs: Partial<CanvasItem>) => void;
}

const IndividualImage = ({ item, onSelect, onChange }: IndividualImageProps) => {
  const image = useImage(item.imageUrl);
  const shapeRef = useRef<any>(null);

  return (
    <KonvaImage
      ref={shapeRef}
      id={item.id}
      image={image || undefined}
      x={item.x}
      y={item.y}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      width={130}
      height={130}
      offsetX={65}
      offsetY={65}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (node) {
          onChange({
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }
      }}
    />
  );
};

export default function OutfitCanvas() {
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  // Mobile tab: 'canvas' shows the Konva studio, 'selector' shows the wardrobe picker
  const [mobilePaneView, setMobilePaneView] = useState<'canvas' | 'selector'>('canvas');

  const containerRef = useRef<HTMLDivElement>(null);

  const [stageSize, setStageSize] = useState({ width: 500, height: 500 });

  // Responsive stage measurement
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        // Subtract container padding (12px * 2 = 24px)
        const finalW = w - 24;
        setStageSize({
          width: finalW,
          height: Math.max(450, Math.min(600, finalW * 0.65)), // 1.5 aspect ratio
        });
      }
    };

    // Initial measurement
    updateSize();

    // Trigger update after a micro-delay to allow full page layout settlement
    const timer = setTimeout(updateSize, 100);

    window.addEventListener('resize', updateSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, []);


  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [saving, setSaving] = useState(false);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Load user closet items up to 1000 items to support massive wardrobes
  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const res = await apiClient.get('/items', { params: { limit: 1000 } });
        setWardrobeItems(res.data.items.filter((item: any) => item.condition !== 'damaged'));
      } catch (err) {
        console.error('Failed to load wardrobe items:', err);
      }
    };
    fetchWardrobe();
  }, []);

  // Update Transformer node selections
  useEffect(() => {
    if (transformerRef.current) {
      if (selectedId) {
        const selectedNode = stageRef.current.findOne('#' + selectedId);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
        } else {
          transformerRef.current.nodes([]);
        }
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId, canvasItems]);

  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  const handleAddItemToCanvas = (wardrobeItem: ClothingItem) => {
    const imageUrl = wardrobeItem.processedImageUrl || wardrobeItem.originalImageUrl;
    const maxZIndex = canvasItems.reduce((max, item) => (item.zIndex > max ? item.zIndex : max), 0);

    const newItem: CanvasItem = {
      id: `canvas-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      clothingItemId: wardrobeItem.id,
      imageUrl,
      x: stageSize.width / 2,
      y: stageSize.height / 2,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: maxZIndex + 1,
    };

    setCanvasItems([...canvasItems, newItem]);
    setSelectedId(newItem.id);
  };

  const handleItemChange = (id: string, newAttrs: Partial<CanvasItem>) => {
    setCanvasItems(canvasItems.map((item) => (item.id === id ? { ...item, ...newAttrs } : item)));
  };

  const bringToFront = () => {
    if (!selectedId) return;
    const maxZIndex = canvasItems.reduce((max, item) => (item.zIndex > max ? item.zIndex : max), 0);
    handleItemChange(selectedId, { zIndex: maxZIndex + 1 });
  };

  const sendToBack = () => {
    if (!selectedId) return;
    const minZIndex = canvasItems.reduce((min, item) => (item.zIndex < min ? item.zIndex : min), 0);
    handleItemChange(selectedId, { zIndex: minZIndex - 1 });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setCanvasItems(canvasItems.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    setIsConfirmClearOpen(true);
  };

  const executeClearCanvas = () => {
    setCanvasItems([]);
    setSelectedId(null);
  };


  const sortedCanvasItems = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);

  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      alert('Vui lòng nhập tên cho bộ phối!');
      return;
    }

    setSaving(true);
    try {
      setSelectedId(null);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });

      const itemsPayload = canvasItems.map((item) => ({
        clothingItemId: item.clothingItemId,
        positionX: item.x,
        positionY: item.y,
        scale: item.scaleX,
        rotation: item.rotation,
        zIndex: item.zIndex,
      }));

      await apiClient.post('/outfits', {
        name: outfitName,
        items: itemsPayload,
        thumbnail: dataUrl,
      });

      alert('Đã lưu bộ phối thành công!');
      setIsSaveModalOpen(false);
      setOutfitName('');
      setCanvasItems([]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lưu bộ phối thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const CATEGORIES = [
    { value: '', label: 'Tất cả' },
    { value: 'top', label: 'Áo' },
    { value: 'bottom', label: 'Quần' },
    { value: 'shoes', label: 'Giày' },
    { value: 'accessory', label: 'Phụ kiện' },
    { value: 'outerwear', label: 'Áo khoác' },
  ];

  // Robust Client-side filtering supporting instant search over hundreds of items
  const filteredWardrobe = wardrobeItems.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !search.trim() || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-0 text-left">

      {/* Mobile Tab Toggle (only visible on < lg) */}
      <div className="lg:hidden flex bg-stone-100 p-1 rounded-2xl gap-1 mb-4">
        <button
          onClick={() => setMobilePaneView('canvas')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobilePaneView === 'canvas' ? 'bg-white text-[#C4704F] shadow-sm' : 'text-stone-500'
          }`}
        >
          🎨 Studio ghép đồ
        </button>
        <button
          onClick={() => setMobilePaneView('selector')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobilePaneView === 'selector' ? 'bg-white text-[#C4704F] shadow-sm' : 'text-stone-500'
          }`}
        >
          👗 Chọn đồ ({wardrobeItems.length})
        </button>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
      
      {/* 1. Wardrobe Selector Sidebar (Left panel - grid 4 span for wider item cards) */}
      <div className={`lg:col-span-4 bg-white rounded-3xl border border-stone-100 p-4 sm:p-6 shadow-sm flex flex-col h-[420px] sm:h-[500px] lg:h-[580px] lg:order-1 order-2 w-full ${
        mobilePaneView === 'selector' ? 'block' : 'hidden lg:flex'
      }`}>
        <h3 className="font-bold text-sm text-[#2A2521] font-serif border-b border-stone-100 pb-2 mb-4">
          Bộ chọn sản phẩm phối đồ
        </h3>
        
        {/* Category horizontal filters */}
        <div className="flex flex-wrap gap-1 mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeCategory === cat.value
                  ? 'bg-[#C4704F] text-white shadow-xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic client-side instant search for handling hundreds of items */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm đồ để phối..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] bg-[#FAF6F1]/30"
          />
        </div>

        {/* Closet grid containing cards (responsive 3 to 4 columns to utilize sidebar width) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 xl:grid-cols-4 gap-2 pr-1">
          {filteredWardrobe.length === 0 ? (
            <div className="col-span-3 xl:col-span-4 text-center py-12 text-stone-400 text-xs">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          ) : (
            filteredWardrobe.map((wItem) => (
              <div
                key={wItem.id}
                onClick={() => handleAddItemToCanvas(wItem)}
                className="aspect-square bg-[#FAF6F1]/50 border border-stone-100 rounded-2xl p-2 flex items-center justify-center cursor-pointer hover:border-[#C4704F] hover:bg-[#FAF6F1] transition-all group relative shadow-xs"
                title="Bấm để thêm vào Studio"
              >
                <img
                  src={wItem.processedImageUrl || wItem.originalImageUrl}
                  alt={wItem.name}
                  className="object-contain max-h-full max-w-full p-1"
                />
                <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-[#C4704F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg transition-opacity shadow-sm">
                  + Thêm
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Dotted Grid Workspace (Right panel - grid 8 span - stretch flush 100% width) */}
      <div ref={containerRef} className={`lg:col-span-8 flex flex-col items-stretch gap-4 lg:order-2 order-1 w-full ${
        mobilePaneView === 'canvas' ? 'block' : 'hidden lg:flex'
      }`}>
        {/* Workspace Toolbar Header (Stretches 100% width flush) */}
        <div className="w-full flex justify-between items-center bg-white px-4 py-3 border border-stone-100 shadow-sm rounded-2xl">
          {/* Layer manipulation actions */}
          <div className="flex gap-1.5">
            <button
              disabled={!selectedId}
              onClick={bringToFront}
              className="p-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
              title="Đưa lên trên cùng (Z-Index)"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              disabled={!selectedId}
              onClick={sendToBack}
              className="p-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
              title="Đưa xuống dưới cùng (Z-Index)"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              disabled={!selectedId}
              onClick={deleteSelected}
              className="p-2 border border-stone-200 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors border-l-2 ml-1"
              title="Xóa món đồ đang chọn"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Canvas Actions */}
          <div className="flex gap-2">
            <button
              onClick={clearCanvas}
              disabled={canvasItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              disabled={canvasItems.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-[#C4704F] hover:bg-[#b05f3f] disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              Lưu bộ phối
            </button>
          </div>
        </div>

        {/* Konva Stage Frame with beautiful dotted background (Stretches 100% width flush) */}
        <div className="w-full bg-white p-3 rounded-[32px] border border-stone-200 shadow-lg relative overflow-hidden" style={{ height: stageSize.height + 24 }}>
          {/* Dotted Figma-like designer grid layout */}
          <div 
            className="absolute inset-3 bg-[#FAF9F6] rounded-2xl -z-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', 
              backgroundSize: '16px 16px' 
            }} 
          />

          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onClick={handleStageClick}
            className="rounded-2xl overflow-hidden bg-transparent"
          >
            <Layer>
              {sortedCanvasItems.map((item) => (
                <IndividualImage
                  key={item.id}
                  item={item}
                  onSelect={() => setSelectedId(item.id)}
                  onChange={(newAttrs) => handleItemChange(item.id, newAttrs)}
                />
              ))}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (Math.abs(newBox.width) < 30 || Math.abs(newBox.height) < 30) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>

          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
              <Layers className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-sm font-bold text-stone-600 font-serif">Studio ghép đồ trống</p>
              <p className="text-[11px] text-stone-400 mt-1">Bấm các bức ảnh ở cột trái để thêm đồ vào canvas</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Save Outfit Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl shadow-2xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-base font-bold text-[#2A2521] font-serif">Lưu bộ trang phục</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Đặt tên cho bộ trang phục phối đồ này để lưu lại trong kho lưu trữ của bạn.
              </p>
            </div>

            <div>
              <label htmlFor="outfitName" className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Tên bộ phối
              </label>
              <input
                id="outfitName"
                type="text"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="Ví dụ: Outfit đi chơi hè 2026"
                required
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveOutfit}
                className="px-4 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-[#C4704F] hover:bg-[#b05f3f] transition-colors shadow-sm"
              >
                {saving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmClearOpen}
        title="Xóa sạch canvas"
        message="Bạn có chắc chắn muốn xóa sạch toàn bộ sản phẩm trên canvas? Hành động này sẽ loại bỏ tất cả các món đồ đang ghép dở trên màn hình."
        confirmLabel="Xóa sạch"
        onConfirm={() => {
          executeClearCanvas();
          setIsConfirmClearOpen(false);
        }}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
    </div>
  );
}
