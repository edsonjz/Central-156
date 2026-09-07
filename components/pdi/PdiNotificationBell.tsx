import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  Clock,
  MessageSquare,
  Award,
  Target,
  AlertCircle,
  X,
  CheckCheck,
  ExternalLink
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { PDINotification, PDINotificationType } from '../../types/pdi';
import { NotificationService } from '../../services/notificationService';

interface PdiNotificationBellProps {
  supabase: SupabaseClient | null;
  userRole: 'Supervisor' | 'Operador';
  operatorRegistration?: string;
}

export const PdiNotificationBell: React.FC<PdiNotificationBellProps> = ({
  supabase,
  userRole,
  operatorRegistration
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<PDINotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications(supabase, userRole, operatorRegistration);
      setNotifications(data);
    } catch (e) {
      console.error('Erro ao buscar notificações:', e);
    }
  }, [supabase, userRole, operatorRegistration]);

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('pdi_notifications_updated', handleUpdate);
    const interval = setInterval(loadNotifications, 15000); // Polling suave a cada 15s

    return () => {
      window.removeEventListener('pdi_notifications_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Fecha popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead(supabase, userRole, operatorRegistration);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClickNotification = async (notif: PDINotification) => {
    if (!notif.read) {
      await NotificationService.markAsRead(supabase, notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    setIsOpen(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    await NotificationService.deleteNotification(supabase, notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const getNotificationIcon = (type: PDINotificationType) => {
    switch (type) {
      case 'action_completed':
        return <CheckCircle size={16} className="text-emerald-500" />;
      case 'action_updated':
      case 'evidence_added':
        return <Clock size={16} className="text-blue-500" />;
      case 'feedback_added':
      case 'feedback_replied':
        return <MessageSquare size={16} className="text-indigo-500" />;
      case 'recognition_added':
        return <Award size={16} className="text-amber-500" />;
      case 'pdi_created':
      case 'pdi_updated':
        return <Target size={16} className="text-purple-500" />;
      case 'pdi_finished':
        return <CheckCircle size={16} className="text-emerald-600" />;
      default:
        return <AlertCircle size={16} className="text-slate-500" />;
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `há ${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `há ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `há ${diffDays}d`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botão Sino com Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 focus:outline-none"
        title="Alertas & Notificações de PDI"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-blue-600' : 'text-slate-600'} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] font-black items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover / Dropdown de Alertas */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Cabeçalho */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Alertas de PDI</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Tudo em dia'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={14} />
                <span>Ler todas</span>
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-400">
                <Bell size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-semibold">Nenhum alerta recente</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Novas ações, feedbacks e atualizações de PDI aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClickNotification(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                    notif.read ? 'bg-white hover:bg-slate-50/80 opacity-80 hover:opacity-100' : 'bg-blue-50/40 hover:bg-blue-50/70'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${notif.read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        De: <strong className="text-slate-600">{notif.sender_name}</strong> ({notif.sender_role})
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">
                        <span>Acessar</span>
                        <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteNotification(e, notif.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir alerta"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Rodapé Informativo */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
            Notificações bidirecionais entre Supervisores e Operadores
          </div>
        </div>
      )}
    </div>
  );
};
