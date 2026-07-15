import { useState, useEffect } from 'react';
import { useClosetStore } from '../../store/closetStore';
import { FolderKanban, Plus, Trash2, Check, Loader2 } from 'lucide-react';

export default function ClosetSelector() {
  const { closets, activeClosetId, loading, fetchClosets, setActiveClosetId, addCloset, deleteCloset } = useClosetStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newClosetName, setNewClosetName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchClosets();
  }, []);

  const activeCloset = closets.find((c) => c.id === activeClosetId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClosetName.trim() || adding) return;
    
    setAdding(true);
    try {
      await addCloset(newClosetName.trim());
      setNewClosetName('');
    } catch (err) {
      alert('Không thể tạo tủ đồ mới');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa tủ đồ này? Các món đồ bên trong sẽ tự động chuyển về Tủ đồ chính.')) {
      try {
        await deleteCloset(id);
      } catch (err) {
        alert('Không thể xóa tủ đồ');
      }
    }
  };

  return (
    <div className="relative z-40 select-none">
      
      {/* Selector Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-stone-200 hover:border-stone-300 rounded-xl bg-white text-xs font-semibold text-stone-700 shadow-sm transition-all focus:outline-none"
      >
        <FolderKanban className="h-4 w-4 text-[#C4704F]" />
        <span>{activeCloset ? activeCloset.name : 'Đang tải tủ đồ...'}</span>
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <>
          {/* Click outside overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute lg:left-0 lg:right-auto right-0 mt-2 w-64 bg-white border border-stone-150 rounded-2xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
            
            <div className="border-b border-stone-100 pb-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Chọn tủ đồ hoạt động</span>
            </div>

            {/* Closets List */}
            <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
              {loading && closets.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-stone-400 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Đang tải...
                </div>
              ) : (
                closets.map((c) => {
                  const isActive = c.id === activeClosetId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveClosetId(c.id);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#C4704F]/5 text-[#C4704F]'
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="truncate pr-2">{c.name} {c.isDefault && <span className="text-[9px] bg-stone-100 text-stone-400 px-1 py-0.5 rounded ml-1 font-bold">Mặc định</span>}</span>
                      <div className="flex items-center gap-1.5">
                        {isActive && <Check className="h-3.5 w-3.5" />}
                        {!c.isDefault && (
                          <button
                            onClick={(e) => handleDelete(e, c.id)}
                            className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-red-500 transition-colors"
                            title="Xóa tủ đồ"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Create Closet Form */}
            <form onSubmit={handleCreate} className="border-t border-stone-100 pt-3 flex gap-1.5">
              <input
                type="text"
                placeholder="Tên tủ đồ mới..."
                value={newClosetName}
                onChange={(e) => setNewClosetName(e.target.value)}
                required
                className="flex-1 min-w-0 px-2.5 py-1.5 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C4704F] focus:border-[#C4704F]"
              />
              <button
                type="submit"
                disabled={adding || !newClosetName.trim()}
                className="p-2 rounded-xl bg-[#C4704F] text-white hover:bg-[#b05f3f] disabled:opacity-40 transition-colors shrink-0 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>
        </>
      )}

    </div>
  );
}
