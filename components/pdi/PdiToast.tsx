import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, Clock, MessageSquare, Award, Target, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PDINotification } from '../../types/pdi';

export const PdiToast: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<PDINotification | null>(null);

  useEffect(() => {
    const handleToast = (event: any) => {
      if (event.detail) {
        setToast(event.detail);
        // Auto fecha após 7 segundos
        const timer = setTimeout(() => {
          setToast(null);
        }, 7000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('pdi_toast_notification', handleToast);
    return () => {
      window.removeEventListener('pdi_toast_notification', handleToast);
    };
  }, []);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'action_completed':
        return <CheckCircle size={18} className="text-emerald-500" />;
      case 'feedback_added':
      case 'feedback_replied':
        return <MessageSquare size={18} className="text-blue-500" />;
      case 'recognition_added':
        return <Award size={18} className="text-amber-500" />;
      case 'pdi_created':
      case 'pdi_updated':
        return <Target size={18} className="text-purple-500" />;
      default:
        return <Bell size={18} className="text-blue-600" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-100 shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Alerta de PDI</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <h4 className="text-xs font-black text-slate-900 mt-0.5 truncate">{toast.title}</h4>
          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{toast.message}</p>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[9px] font-bold text-slate-400">
              De: {toast.sender_name} ({toast.sender_role})
            </span>
            {toast.action_url && (
              <button
                onClick={() => {
                  navigate(toast.action_url!);
                  setToast(null);
                }}
                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                <span>Ver detalhes</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
