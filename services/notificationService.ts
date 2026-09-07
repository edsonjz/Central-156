import { SupabaseClient } from '@supabase/supabase-js';
import { PDINotification, PDINotificationType } from '../types/pdi';

const STORAGE_KEY = 'central156_pdi_notifications';

const getStorageNotifications = (): PDINotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveStorageNotifications = (notifs: PDINotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 100))); // Guarda até 100 notificações
    // Dispara evento customizado para reatividade imediata no navegador
    window.dispatchEvent(new CustomEvent('pdi_notifications_updated'));
  } catch (e) {
    console.error('Erro ao salvar notificações no localStorage:', e);
  }
};

export class NotificationService {
  /**
   * Obtém as notificações filtradas para o usuário atual (Supervisor ou Operador)
   */
  static async getNotifications(
    supabase: SupabaseClient | null,
    role: 'Supervisor' | 'Operador',
    operatorRegistration?: string
  ): Promise<PDINotification[]> {
    let list = getStorageNotifications();

    if (supabase) {
      try {
        let query = supabase
          .from('pdi_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (role === 'Supervisor') {
          query = query.or(`recipient_role.eq.Supervisor,recipient_role.eq.All`);
        } else {
          query = query.or(`and(recipient_role.eq.Operador,recipient_registration.eq.${operatorRegistration}),recipient_role.eq.All`);
        }

        const { data, error } = await query;
        if (!error && data) {
          // Mescla com cache local evitando duplicatas
          const serverMap = new Map<string, PDINotification>();
          data.forEach((item: any) => serverMap.set(item.id, item));
          list.forEach(item => {
            if (!serverMap.has(item.id)) serverMap.set(item.id, item);
          });
          list = Array.from(serverMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          saveStorageNotifications(list);
        }
      } catch (err) {
        // Tabela ainda não existe no Supabase ou offline; usa localStorage
      }
    }

    // Filtra localmente de acordo com perfil
    return list.filter(n => {
      if (role === 'Supervisor') {
        return n.recipient_role === 'Supervisor' || n.recipient_role === 'All';
      } else {
        if (n.recipient_role === 'All') return true;
        if (n.recipient_role === 'Operador') {
          return !n.recipient_registration || n.recipient_registration === operatorRegistration;
        }
        return false;
      }
    });
  }

  /**
   * Adiciona uma nova notificação e avisa a aplicação
   */
  static async addNotification(
    supabase: SupabaseClient | null,
    params: {
      pdi_id?: string;
      recipient_role: 'Supervisor' | 'Operador' | 'All';
      recipient_registration?: string;
      sender_name: string;
      sender_role: 'Supervisor' | 'Operador';
      title: string;
      message: string;
      type: PDINotificationType;
      action_url?: string;
    }
  ): Promise<PDINotification> {
    const newNotif: PDINotification = {
      id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...params,
      read: false,
      created_at: new Date().toISOString()
    };

    // 1. Salva imediatamente no localStorage
    const current = getStorageNotifications();
    const updated = [newNotif, ...current.filter(n => n.id !== newNotif.id)];
    saveStorageNotifications(updated);

    // Dispara alerta visual Toast instantâneo
    try {
      window.dispatchEvent(new CustomEvent('pdi_toast_notification', { detail: newNotif }));
    } catch {}

    // 2. Tenta persistir no Supabase se disponível
    if (supabase) {
      try {
        await supabase.from('pdi_notifications').insert([newNotif]);
      } catch {
        // Ignora silenciosamente se tabela não existir
      }
    }

    return newNotif;
  }

  /**
   * Notifica o supervisor quando um operador realiza uma ação no PDI
   */
  static async notifySupervisor(
    supabase: SupabaseClient | null,
    params: {
      pdiId: string;
      operatorName: string;
      operatorRegistration?: string;
      title: string;
      message: string;
      type: PDINotificationType;
    }
  ) {
    return this.addNotification(supabase, {
      pdi_id: params.pdiId,
      recipient_role: 'Supervisor',
      sender_name: params.operatorName,
      sender_role: 'Operador',
      title: params.title,
      message: params.message,
      type: params.type,
      action_url: '/pdi'
    });
  }

  /**
   * Notifica o operador quando o supervisor realiza uma alteração no PDI
   */
  static async notifyOperator(
    supabase: SupabaseClient | null,
    params: {
      pdiId: string;
      operatorRegistration: string;
      supervisorName: string;
      title: string;
      message: string;
      type: PDINotificationType;
    }
  ) {
    return this.addNotification(supabase, {
      pdi_id: params.pdiId,
      recipient_role: 'Operador',
      recipient_registration: params.operatorRegistration,
      sender_name: params.supervisorName,
      sender_role: 'Supervisor',
      title: params.title,
      message: params.message,
      type: params.type,
      action_url: '/my-pdi'
    });
  }

  /**
   * Marca uma notificação individual como lida
   */
  static async markAsRead(supabase: SupabaseClient | null, notifId: string) {
    const list = getStorageNotifications().map(n => n.id === notifId ? { ...n, read: true } : n);
    saveStorageNotifications(list);

    if (supabase) {
      try {
        await supabase.from('pdi_notifications').update({ read: true }).eq('id', notifId);
      } catch {}
    }
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  static async markAllAsRead(
    supabase: SupabaseClient | null,
    role: 'Supervisor' | 'Operador',
    operatorRegistration?: string
  ) {
    const list = getStorageNotifications().map(n => {
      const match = role === 'Supervisor' 
        ? (n.recipient_role === 'Supervisor' || n.recipient_role === 'All')
        : (n.recipient_role === 'All' || (n.recipient_role === 'Operador' && (!n.recipient_registration || n.recipient_registration === operatorRegistration)));
      return match ? { ...n, read: true } : n;
    });
    saveStorageNotifications(list);

    if (supabase) {
      try {
        if (role === 'Supervisor') {
          await supabase.from('pdi_notifications').update({ read: true }).eq('recipient_role', 'Supervisor');
        } else if (operatorRegistration) {
          await supabase.from('pdi_notifications').update({ read: true }).eq('recipient_registration', operatorRegistration);
        }
      } catch {}
    }
  }

  /**
   * Remove uma notificação
   */
  static async deleteNotification(supabase: SupabaseClient | null, notifId: string) {
    const list = getStorageNotifications().filter(n => n.id !== notifId);
    saveStorageNotifications(list);

    if (supabase) {
      try {
        await supabase.from('pdi_notifications').delete().eq('id', notifId);
      } catch {}
    }
  }
}
