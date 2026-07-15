import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { apiClient } from '../../api/client';
import type { ClothingItem } from '../../../../shared/types';
import { Trash2, ArrowUp, ArrowDown, Save, RefreshCw, Layers } from 'lucide-react';

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

// Custom hook to load HTML Image from URL string safely
function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = 'anonymous'; // Support cross-origin images if needed
    img.onload = () => {
      setImage(img);
    };
  }, [src]);

  return image;
}

// Sub-component to render Konva Image with custom properties
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
      // Width and Height are set to a default bounding size, let Konva scale it
      width={130}
      height={130}
      offsetX={65} // center pivot
      offsetY={65} // center pivot
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={() => {
        // transformer changes scale and rotation
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
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Responsive stage size state
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth < 640 ? 320 : 500,
    height: window.innerWidth < 640 ? 320 : 500,
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setStageSize({
        width: isMobile ? 320 : 500,
        height: isMobile ? 320 : 500,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Save modal states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [saving, setSaving] = useState(false);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Load user closet items
  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const res = await apiClient.get('/items', { params: { limit: 100 } });
        setWardrobeItems(res.data.items.filter((item: any) => item.condition !== 'damaged'));
      } catch (err) {
        console.error('Failed to load wardrobe items:', err);
      }
    };
    fetchWardrobe();
  }, []);

  // Update Konva Transformer nodes when selection changes
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

  // Click handler to deselect when clicking on stage background
  const handleStageClick = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  // Add item from sidebar to Canvas
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
    setSelectedId(newItem.id); // auto-select newly added item
  };

  // Handle item attributes changes (from drags/transforms)
  const handleItemChange = (id: string, newAttrs: Partial<CanvasItem>) => {
    setCanvasItems(canvasItems.map((item) => (item.id === id ? { ...item, ...newAttrs } : item)));
  };

  // Layer ordering actions
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

  // Delete selected item from canvas
  const deleteSelected = () => {
    if (!selectedId) return;
    setCanvasItems(canvasItems.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  // Clear all items on canvas
  const clearCanvas = () => {
    if (window.confirm('Xóa sạch toàn bộ sản phẩm trên canvas?')) {
      setCanvasItems([]);
      setSelectedId(null);
    }
  };

  // Sort canvas items by zIndex before rendering so they draw in correct stack order
  const sortedCanvasItems = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);

  // Save Outfit
  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      alert('Vui lòng nhập tên cho bộ phối!');
      return;
    }

    setSaving(true);
    try {
      // 1. Deselect any active item so transformer box doesn't appear in thumbnail
      setSelectedId(null);
      
      // Allow state update to repaint canvas without transformer box
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. Export Stage to dataURL (base64 PNG)
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 }); // Double resolution for crisp thumbnail

      // 3. Prepare payload mapping canvas attributes to DB schema
      const itemsPayload = canvasItems.map((item) => ({
        clothingItemId: item.clothingItemId,
        positionX: item.x,
        positionY: item.y,
        scale: item.scaleX, // scaleX and scaleY are similar in uniform scale
        rotation: item.rotation,
        zIndex: item.zIndex,
      }));

      // 4. Send API POST request
      await apiClient.post('/outfits', {
        name: outfitName,
        items: itemsPayload,
        thumbnail: dataUrl,
      });

      alert('Đã lưu bộ phối thành công!');
      setIsSaveModalOpen(false);
      setOutfitName('');
      setCanvasItems([]); // clear canvas
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

  const filteredWardrobe = activeCategory
    ? wardrobeItems.filter((i) => i.category === activeCategory)
    : wardrobeItems;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
      {/* 1. Wardrobe Sidebar (Left column) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex flex-col h-[560px] lg:order-1 order-2 w-full">
        <h3 className="font-bold text-sm text-[#2A2521] font-serif border-b border-stone-100 pb-2 mb-3">
          Tủ đồ của bạn
        </h3>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-1 mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                activeCategory === cat.value
                  ? 'bg-[#C4704F] text-white'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Closet Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 pr-1">
          {filteredWardrobe.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-stone-400 text-xs">
              Không có sản phẩm nào
            </div>
          ) : (
            filteredWardrobe.map((wItem) => (
              <div
                key={wItem.id}
                onClick={() => handleAddItemToCanvas(wItem)}
                className="aspect-square bg-[#FAF6F1]/50 border border-stone-100 rounded-xl p-1.5 flex items-center justify-center cursor-pointer hover:border-[#C4704F] hover:bg-[#FAF6F1] transition-all group relative"
                title="Bấm để thêm vào Canvas"
              >
                <img
                  src={wItem.processedImageUrl || wItem.originalImageUrl}
                  alt={wItem.name}
                  className="object-contain max-h-full max-w-full p-1"
                />
                <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-[#C4704F] text-white text-[8px] font-bold px-1 rounded transition-opacity">
                  + Thêm
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Canvas Panel (Center column) */}
      <div className="lg:col-span-8 flex flex-col items-center gap-4 lg:order-2 order-1 w-full">
        {/* Toolbar header */}
        <div className="w-full flex justify-between items-center bg-white px-4 py-2 border border-stone-100 shadow-sm rounded-xl" style={{ maxWidth: stageSize.width + 16 }}>
          {/* Layer Actions */}
          <div className="flex gap-1.5">
            <button
              disabled={!selectedId}
              onClick={bringToFront}
              className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
              title="Đưa lên trên cùng (Z-Index)"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              disabled={!selectedId}
              onClick={sendToBack}
              className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
              title="Đưa xuống dưới cùng (Z-Index)"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              disabled={!selectedId}
              onClick={deleteSelected}
              className="p-2 border border-stone-200 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors border-l-2"
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
              className="flex items-center gap-1 px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </button>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              disabled={canvasItems.length === 0}
              className="flex items-center gap-1 px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-[#C4704F] hover:bg-[#b05f3f] disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              Lưu Outfit
            </button>
          </div>
        </div>

        {/* Konva Stage Frame */}
        <div className="bg-white p-2 rounded-3xl border border-stone-200 shadow-lg relative overflow-hidden" style={{ width: stageSize.width + 16, height: stageSize.height + 16 }}>
          {/* Subtle canvas helpers / grid dot background */}
          <div className="absolute inset-2 bg-[#F6F5F3] dotted-grid rounded-2xl -z-10 pointer-events-none" />

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
                  // limit resize to minimum width/height of 30px
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
              <Layers className="h-12 w-12 text-stone-300 mb-2" />
              <p className="text-sm font-semibold text-stone-600">Canvas ghép đồ trống</p>
              <p className="text-xs text-stone-400 mt-0.5">Click vào các bức ảnh ở cột trái để bắt đầu phối đồ</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Save Outfit Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-2xl shadow-xl space-y-4 border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-[#2A2521] font-serif">Lưu bộ trang phục</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Đặt tên cho bộ trang phục phối đồ này để lưu lại trong kho lưu trữ của bạn.
              </p>
            </div>

            <div>
              <label htmlFor="outfitName" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Tên bộ phối
              </label>
              <input
                id="outfitName"
                type="text"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="Ví dụ: Outfit đi chơi hè 2026"
                required
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveOutfit}
                className="px-4 py-2 border border-transparent rounded-lg text-xs font-bold text-white bg-[#C4704F] hover:bg-[#b05f3f] transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
