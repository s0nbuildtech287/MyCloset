import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface StatusModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  confirmLabel?: string;
  onClose: () => void;
}

export default function StatusModal({
  isOpen,
  title,
  message,
  type,
  confirmLabel = 'Đồng ý',
  onClose,
}: StatusModalProps) {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      titleColor: 'text-[#2A2521]',
      btnBg: 'bg-[#C4704F] hover:bg-[#b05f3f]',
    },
    error: {
      icon: <XCircle className="h-6 w-6 text-rose-500" />,
      titleColor: 'text-rose-700',
      btnBg: 'bg-rose-600 hover:bg-rose-700',
    },
    info: {
      icon: <Info className="h-6 w-6 text-blue-500" />,
      titleColor: 'text-[#2A2521]',
      btnBg: 'bg-stone-700 hover:bg-stone-800',
    },
  }[type];

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-stone-100 text-left relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
          {config.icon}
          <h3 className={`text-base font-bold font-serif ${config.titleColor}`}>{title}</h3>
        </div>
        
        <div className="text-xs text-stone-600 leading-relaxed pt-1 whitespace-pre-line">
          {message}
        </div>

        <div className="flex justify-end pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm ${config.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
