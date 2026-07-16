import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { ClothingItem } from '../../../../shared/types';
import { Upload, X, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useClosetStore } from '../../store/closetStore';

interface ItemFormProps {
  initialItem?: ClothingItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'top', label: 'Áo (Top)' },
  { value: 'bottom', label: 'Quần (Bottom)' },
  { value: 'shoes', label: 'Giày (Shoes)' },
  { value: 'accessory', label: 'Phụ kiện (Accessory)' },
  { value: 'outerwear', label: 'Áo khoác (Outerwear)' },
];

const SEASONS = [
  { value: 'spring', label: 'Mùa xuân' },
  { value: 'summer', label: 'Mùa hạ' },
  { value: 'fall', label: 'Mùa thu' },
  { value: 'winter', label: 'Mùa đông' },
  { value: 'all', label: 'Cả năm' },
];

export default function ItemForm({ initialItem, onSuccess, onCancel }: ItemFormProps) {
  const isEditMode = !!initialItem;
  const { activeClosetId } = useClosetStore();

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('top');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [season, setSeason] = useState('all');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [condition, setCondition] = useState('new');
  
  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [removeBg, setRemoveBg] = useState(true);



  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // History and Stats states
  const [recentItems, setRecentItems] = useState<ClothingItem[]>([]);
  const [stats, setStats] = useState<{ totalItems: number; totalPrice: number } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRecentAndStats = async () => {
    if (!activeClosetId) return;
    setHistoryLoading(true);
    try {
      const itemsRes = await apiClient.get(`/items?limit=3&orderBy=createdAt_desc&closetId=${activeClosetId}`);
      setRecentItems(itemsRes.data.items || []);

      const allRes = await apiClient.get(`/items?limit=1000&closetId=${activeClosetId}`);
      const allItems = allRes.data.items || [];
      const total = allItems.length;
      const priceSum = allItems.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      setStats({ totalItems: total, totalPrice: priceSum });
    } catch (err) {
      console.error('Failed to load recent items & stats:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Populate data in edit mode & fetch history
  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setCategory(initialItem.category);
      setColor(initialItem.color || '');
      setBrand(initialItem.brand || '');
      setSeason(initialItem.season || 'all');
      setPrice(initialItem.price ? initialItem.price.toString() : '');
      setNotes(initialItem.notes || '');
      setTagsInput(initialItem.tags ? initialItem.tags.join(', ') : '');
      setImagePreview(initialItem.originalImageUrl);
      setCondition(initialItem.condition || 'new');
    } else {
      // Clear forms
      setName('');
      setCategory('top');
      setColor('');
      setBrand('');
      setSeason('all');
      setPrice('');
      setNotes('');
      setTagsInput('');
      setImageFile(null);
      setImagePreview(null);
      setCondition('new');
    }
    fetchRecentAndStats();
  }, [initialItem, activeClosetId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    if (url.trim().startsWith('http')) {
      setImagePreview(url.trim());
    } else {
      setImagePreview(null);
    }
  };


  const handleAiAutofill = async () => {
    if (!imageFile && !imageUrl) return;
    setAiAnalyzing(true);
    setError('');
    try {
      let res;
      if (uploadMethod === 'file' && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        res = await apiClient.post('/items/analyze-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else if (uploadMethod === 'url' && imageUrl) {
        res = await apiClient.post('/items/analyze-image', {
          imageUrl: imageUrl.trim()
        });
      }

      if (res && res.data) {
        const { name, category, color, brand, season, tags, condition: aiCondition } = res.data;
        if (name) setName(name);
        if (category) setCategory(category);
        if (color) setColor(color);
        if (brand) setBrand(brand);
        if (season) setSeason(season);
        if (aiCondition) setCondition(aiCondition);
        if (tags) {
          setTagsInput(Array.isArray(tags) ? tags.join(', ') : tags);
        }
      }
    } catch (err: any) {
      console.error('Failed to run AI autofill:', err);
      setError(err.response?.data?.error || 'Lỗi phân tích nhận diện ảnh từ OpenAI.');
    } finally {
      setAiAnalyzing(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEditMode && initialItem) {
        // Edit Item metadata via patch
        await apiClient.patch(`/items/${initialItem.id}`, {
          name,
          category,
          color,
          brand,
          season,
          price: price === '' ? null : parseFloat(price),
          notes,
          tags,
          condition,
        });
      } else {
        // Create Item
        if (uploadMethod === 'file') {
          if (!imageFile) {
            throw new Error('Vui lòng tải lên tệp ảnh cho món đồ');
          }

          const formData = new FormData();
          formData.append('name', name);
          formData.append('category', category);
          formData.append('color', color);
          formData.append('brand', brand);
          formData.append('season', season);
          formData.append('price', price);
          formData.append('notes', notes);
          formData.append('tags', JSON.stringify(tags));
          formData.append('image', imageFile);
          formData.append('condition', condition);
          formData.append('removeBg', removeBg.toString());
          if (activeClosetId) {
            formData.append('closetId', activeClosetId);
          }

          await apiClient.post('/items', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } else {
          if (!imageUrl.trim()) {
            throw new Error('Vui lòng nhập đường dẫn link ảnh online');
          }

          await apiClient.post('/items', {
            name,
            category,
            color,
            brand,
            season,
            price: price === '' ? null : parseFloat(price),
            notes,
            tags,
            condition,
            imageUrl: imageUrl.trim(),
            removeBg,
            closetId: activeClosetId || null
          });
        }
      }



      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Xảy ra lỗi trong quá trình xử lý');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-start text-left">
      
      {/* Left Side: Form Card */}
      <div className="w-full lg:w-3/5 bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <button
            onClick={onCancel}
            type="button"
            className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#2A2521] font-serif">
              {isEditMode ? 'Chỉnh sửa món đồ' : 'Thêm đồ mới vào tủ'}
            </h2>
            <p className="text-xs text-stone-500">
              {isEditMode ? 'Cập nhật lại các thông tin của món đồ thời trang' : 'Tạo mới tủ đồ của bạn với hình ảnh trực quan'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Form body */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Sub-column: Image upload */}
          <div className="flex flex-col items-center justify-start space-y-4 w-full">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider self-start">
              Hình ảnh quần áo
            </label>

            {!isEditMode && (
              <div className="flex w-full bg-stone-100 p-1 rounded-xl gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => { setUploadMethod('file'); handleClearImage(); }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    uploadMethod === 'file' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Tải tệp ảnh
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMethod('url'); handleClearImage(); }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    uploadMethod === 'url' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Dán link ảnh
                </button>
              </div>
            )}

            {imagePreview ? (
              <div className="w-full space-y-3">
                <div className="relative aspect-square w-full bg-[#FAF6F1]/50 border border-stone-200 rounded-xl overflow-hidden flex items-center justify-center group animate-in fade-in duration-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="object-contain w-full h-full p-2"
                  />
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 bg-stone-900/80 hover:bg-stone-900 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {(imageFile || (uploadMethod === 'url' && imageUrl.trim().startsWith('http'))) && (

                  <button
                    type="button"
                    disabled={loading || aiAnalyzing}
                    onClick={handleAiAutofill}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#8A9A5B] hover:bg-[#72804b] text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm animate-in slide-in-from-top-1 duration-200"
                  >
                    {aiAnalyzing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        AI đang nhận diện...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        AI tự động điền thông tin
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : uploadMethod === 'file' ? (
              <div className="relative aspect-square w-full border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center p-6 bg-[#FAF6F1]/10 hover:bg-[#FAF6F1]/20 transition-colors cursor-pointer w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required={!isEditMode}
                />
                <Upload className="h-10 w-10 text-stone-400 mb-2" />
                <p className="text-sm font-medium text-stone-700">Tải lên hình ảnh</p>
                <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WEBP lên tới 5MB</p>
              </div>
            ) : (
              <div className="relative aspect-square w-full border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center p-6 bg-[#FAF6F1]/10 hover:bg-[#FAF6F1]/20 transition-all w-full gap-3">
                <Upload className="h-10 w-10 text-stone-400 animate-bounce" />
                <div className="w-full text-center space-y-1">
                  <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">Đường dẫn ảnh online</p>
                  <p className="text-[10px] text-stone-400">Hỗ trợ Pinterest, Google, Imgur...</p>
                </div>
                <input
                  type="url"
                  placeholder="Dán link ảnh (e.g. https://...)"
                  value={imageUrl}
                  onChange={handleUrlChange}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  required={!isEditMode}
                />
              </div>
            )}
          </div>


          {/* Right Sub-column: Form fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Tên món đồ *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                placeholder="Ví dụ: Áo khoác Blazer đen"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Phân loại *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="season" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Mùa phù hợp
                </label>
                <select
                  id="season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                >
                  {SEASONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="color" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Màu sắc
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={color.startsWith('#') && color.length === 7 ? color : '#FAF6F1'}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-9 p-0.5 border border-stone-200 rounded-lg cursor-pointer bg-white"
                    title="Chọn mã màu thực tế"
                  />
                  <input
                    id="color"
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-2 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                    placeholder="#HEX / Tên màu"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="brand" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Thương hiệu
                </label>
                <input
                  id="brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                  placeholder="Ví dụ: Zara, Uniqlo"
                />
              </div>
            </div>

            <div>
              <label htmlFor="price" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Giá mua (VND)
              </label>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                placeholder="Ví dụ: 350000"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Nhãn (Tags - phân tách bằng dấu phẩy)
              </label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
                placeholder="ví dụ: công sở, năng động, đi tiệc"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Tình trạng trang phục
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:flex">
                {[
                  { value: 'new', label: '✨ Mới', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { value: 'good', label: '👍 Tốt', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { value: 'old', label: '🍂 Cũ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { value: 'damaged', label: '⚠️ Hỏng', color: 'bg-rose-50 text-rose-700 border-rose-200' }
                ].map((cond) => {
                  const isSelected = condition === cond.value;
                  return (
                    <button
                      key={cond.value}
                      type="button"
                      onClick={() => setCondition(cond.value)}
                      className={`flex-1 py-2 px-0.5 border text-[10px] font-bold rounded-xl text-center transition-all ${
                        isSelected
                          ? cond.color + ' border-current scale-[1.02] shadow-xs'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {cond.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isEditMode && (
              <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-100 rounded-2xl animate-in fade-in duration-200">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-[#2A2521]">Tự động tách nền bằng AI</span>
                  <span className="block text-[10px] text-stone-400">Sử dụng AI để loại bỏ hình nền xung quanh trang phục</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveBg(!removeBg)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all ${
                    removeBg ? 'bg-[#C4704F]' : 'bg-stone-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${
                      removeBg ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">

                Ghi chú thêm
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F] resize-none"
                placeholder="Nhập chất liệu, cách giặt ủi..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-bold border border-stone-200 rounded-lg text-stone-600 bg-white hover:bg-stone-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-bold border border-transparent rounded-lg text-white bg-[#C4704F] hover:bg-[#b05f3f] disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </div>

      {/* Right Side: History & Stats (Visually balancing the screen space) */}
      <div className="hidden lg:block w-full lg:w-2/5 space-y-6">
        {/* Quick Stats Card */}
        <div className="bg-[#C4704F]/5 border border-[#C4704F]/15 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#C4704F] uppercase tracking-wider font-serif">Thông tin tủ đồ hiện tại</h3>
          {historyLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-[#C4704F]/10 rounded w-1/2" />
              <div className="h-3 bg-[#C4704F]/10 rounded w-3/4" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 p-3 rounded-2xl border border-[#C4704F]/10 shadow-xs">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Tổng số đồ</span>
                <span className="text-base font-extrabold text-stone-700 mt-1 block">{stats.totalItems} món</span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-[#C4704F]/10 shadow-xs">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Tổng giá trị</span>
                <span className="text-xs font-extrabold text-stone-700 block truncate mt-2.5" title={stats.totalPrice.toLocaleString('vi-VN') + ' đ'}>
                  {stats.totalPrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#C4704F]/70">Chưa có thông tin thống kê.</p>
          )}
        </div>

        {/* Recently Added Items List */}
        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-2">
            <h3 className="text-sm font-bold text-[#2A2521] font-serif">Món đồ vừa thêm gần đây</h3>
          </div>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-stone-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-100 rounded w-2/3" />
                    <div className="h-3 bg-stone-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-stone-50 transition-colors border border-stone-50">
                  <div 
                    className="w-10 h-10 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: item.color && item.color.startsWith('#') && item.color.length === 7
                        ? `${item.color}0d`
                        : '#FAF6F1'
                    }}
                  >
                    <img src={item.originalImageUrl} alt={item.name} className="object-contain w-full h-full p-1" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h4 className="text-xs font-bold text-stone-700 truncate leading-tight">{item.name}</h4>
                    <p className="text-[9px] text-stone-400 mt-0.5 truncate capitalize">
                      {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-600 shrink-0">
                    {item.price ? `${item.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-4 text-center">Chưa có món đồ nào trong tủ đồ này.</p>
          )}
        </div>
      </div>

    </div>
  );
}
