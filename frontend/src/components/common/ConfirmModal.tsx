import { AlertTriangle, X } from 'lucide-react';


interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#23201D] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-stone-100 dark:border-stone-800 text-left relative animate-in zoom-in-95 duration-200 transition-colors">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-full text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 text-rose-500 border-b border-stone-100 dark:border-stone-850 pb-3">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <h3 className="text-base font-bold text-[#2A2521] dark:text-stone-100 font-serif">{title}</h3>
        </div>
        
        <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-1">
          {message}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-850">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors bg-white dark:bg-[#23201D]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
