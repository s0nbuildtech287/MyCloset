import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { X, RefreshCw, Save, Loader2 } from 'lucide-react';

interface ImageEditorProps {
  itemId: string;
  imageUrl: string;
  onSave: () => void;
  onClose: () => void;
}

export default function ImageEditor({ itemId, imageUrl, onSave, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [brushSize, setBrushSize] = useState(15);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Load and draw image to canvas
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Bypass CORS lock
    img.src = imageUrl + '?t=' + Date.now(); // cache buster
    img.onload = () => {
      // Define canvas dimensions based on image aspect ratio, fit inside container
      const maxDim = 400; // fit max 400px
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      // Clear and draw image
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
  };

  useEffect(() => {
    initCanvas();
  }, [imageUrl]);

  // Coordinates helper
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support Touch and Mouse events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Drawing event handlers
  const handleStart = (e: any) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    setIsDrawing(true);
    setLastPos(pos);
  };

  const handleMove = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCoordinates(e);

    ctx.globalCompositeOperation = 'destination-out'; // Eraser mode
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    setLastPos(currentPos);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  // Save changes
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSaving(true);
    setSaveError('');
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await apiClient.patch(`/items/${itemId}`, {
        processedImageBase64: dataUrl
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onSave();
      }, 800);
    } catch (err) {
      console.error('Failed to save manually erased image:', err);
      setSaveError('Không thể lưu ảnh đã chỉnh sửa. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-stone-100">
          <div>
            <h4 className="font-bold text-md text-[#2A2521] font-serif">Tẩy nền ảnh thủ công</h4>
            <p className="text-[10px] text-stone-400 mt-0.5">Dùng cọ tẩy để xóa các vùng thừa chưa sạch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas container */}
        <div 
          ref={containerRef}
          className="bg-stone-50 p-4 border border-dashed border-stone-200 rounded-2xl flex items-center justify-center relative min-h-[300px]"
        >
          {/* Dot helper background */}
          <div className="absolute inset-0 dotted-grid pointer-events-none opacity-40" />
          
          <canvas
            ref={canvasRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="border border-stone-200 bg-[#F6F5F3] shadow-md rounded-lg cursor-crosshair relative z-10 touch-none"
          />
        </div>

        {/* Success Toast */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            Đã lưu thành công! Đang cập nhật...
          </div>
        )}

        {/* Error Banner */}
        {saveError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-2.5 rounded-xl">
            {saveError}
          </div>
        )}

        {/* Toolbar & Sliders */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-stone-600">
              <span>Kích thước đầu cọ tẩy</span>
              <span className="text-[#C4704F]">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-[#C4704F] cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={initCanvas}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm lại từ đầu
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#C4704F] text-white rounded-xl text-xs font-semibold hover:bg-[#b05f3f] disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Lưu ảnh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
