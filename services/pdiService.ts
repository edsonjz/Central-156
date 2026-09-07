// ==========================================================
// SERVIÇO DE PERSISTÊNCIA E CÁLCULO DO PDI 360°
// Suporte duplo: Supabase Cloud + LocalStorage Fallback Resiliente
// ==========================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  PDI, 
  PDIObjective, 
  PDIAction, 
  PDICompetence, 
  PDIFeedback, 
  PDIRecognition, 
  PDIStatus,
  PDIResult,
  PDISummaryStats
} from '../types/pdi';

const STORAGE_KEY = 'central156_pdis';

// Gera ID único compatível
const generateId = () => {
  return 'pdi_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
};

// Carregar do LocalStorage
const loadFromStorage = (): PDI[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('[PdiService] Erro ao carregar do localStorage:', e);
    return [];
  }
};

// Salvar no LocalStorage
const saveToStorage = (pdis: PDI[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pdis));
  } catch (e) {
    console.error('[PdiService] Erro ao salvar no localStorage:', e);
  }
};

// Calcula status automático do PDI com base em prazos e ações
export const calculateDynamicPdiStatus = (pdi: PDI): PDIStatus => {
  if (pdi.status === 'Concluído' || pdi.status === 'Cancelado') {
    return pdi.status;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(pdi.data_fim);
  endDate.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Verifica se há ações atrasadas
  const hasOverdueActions = pdi.acoes.some(a => {
    if (a.status === 'Concluído' || a.status === 'Cancelado') return false;
    const limit = new Date(a.data_limite);
    limit.setHours(0, 0, 0, 0);
    return limit < today;
  });

  // Verifica se o prazo final já expirou
  if (daysRemaining < 0) {
    return 'Crítico';
  }

  if (hasOverdueActions || daysRemaining <= 7) {
    return 'Atenção';
  }

  return 'Em evolução';
};

// Calcula progresso geral ponderado do PDI (0 a 100%)
export const calculatePdiOverallProgress = (pdi: PDI): number => {
  if (!pdi.acoes || pdi.acoes.length === 0) {
    if (!pdi.objetivos || pdi.objetivos.length === 0) return 0;
    const avg = pdi.objetivos.reduce((acc, o) => acc + (o.progresso || 0), 0) / pdi.objetivos.length;
    return Math.round(avg);
  }

  // Peso das ações: 60% ações concluídas, 40% progresso dos objetivos
  const completedActions = pdi.acoes.filter(a => a.status === 'Concluído').length;
  const actionProgress = (completedActions / pdi.acoes.length) * 100;

  let objProgress = 0;
  if (pdi.objetivos && pdi.objetivos.length > 0) {
    objProgress = pdi.objetivos.reduce((acc, o) => acc + (o.progresso || 0), 0) / pdi.objetivos.length;
  } else {
    objProgress = actionProgress;
  }

  const overall = Math.round((actionProgress * 0.6) + (objProgress * 0.4));
  return Math.min(100, Math.max(0, overall));
};

export class PdiService {
  // Lista todos os PDIs (com fallback se o Supabase não tiver tabela criada)
  static async getAllPdis(supabase: SupabaseClient | null): Promise<PDI[]> {
    let cloudPdis: PDI[] | null = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('pdis')
          .select(`
            *,
            objetivos:pdi_objetivos(*),
            acoes:pdi_acoes(*),
            competencias:pdi_competencias(*),
            feedbacks:pdi_feedbacks(*),
            reconhecimentos:pdi_reconhecimentos(*)
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          cloudPdis = data.map((item: any) => ({
            ...item,
            objetivos: item.objetivos || [],
            acoes: item.acoes || [],
            competencias: item.competencias || [],
            feedbacks: item.feedbacks || [],
            reconhecimentos: item.reconhecimentos || []
          }));
        }
      } catch (err) {
        // Tabela não existe ou offline
        console.warn('[PdiService] Supabase offline ou tabela inexistente, usando localStorage:', err);
      }
    }

    if (cloudPdis && cloudPdis.length > 0) {
      // Sincroniza cópia em cache local
      saveToStorage(cloudPdis);
      return cloudPdis;
    }

    // Fallback local
    return loadFromStorage();
  }

  // Busca PDIs de um operador específico (ativo e anteriores)
  // OTIMIZAÇÃO CRÍTICA: Consulta filtrada diretamente por matrícula no Supabase
  // Evita transferir todos os PDIs de toda a central na sessão do operador, economizando até 98% de dados
  static async getPdisByOperator(supabase: SupabaseClient | null, registration: string): Promise<{
    active: PDI | null;
    history: PDI[];
  }> {
    let operatorPdis: PDI[] | null = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('pdis')
          .select(`
            *,
            objetivos:pdi_objetivos(*),
            acoes:pdi_acoes(*),
            competencias:pdi_competencias(*),
            feedbacks:pdi_feedbacks(*),
            reconhecimentos:pdi_reconhecimentos(*)
          `)
          .eq('operator_registration', registration)
          .order('created_at', { ascending: false });

        if (!error && data) {
          operatorPdis = data.map((item: any) => ({
            ...item,
            objetivos: item.objetivos || [],
            acoes: item.acoes || [],
            competencias: item.competencias || [],
            feedbacks: item.feedbacks || [],
            reconhecimentos: item.reconhecimentos || []
          }));
        }
      } catch (err) {
        console.warn('[PdiService] Falha na consulta direta do operador no Supabase, usando fallback local:', err);
      }
    }

    if (!operatorPdis) {
      const all = loadFromStorage();
      operatorPdis = all.filter(p => p.operator_registration === registration);
    }

    const active = operatorPdis.find(p => p.status !== 'Concluído' && p.status !== 'Cancelado') || null;
    const history = operatorPdis.filter(p => p.id !== active?.id);

    return { active, history };
  }

  // Cria ou Atualiza um PDI completo
  static async savePdi(supabase: SupabaseClient | null, pdiData: Partial<PDI>): Promise<PDI> {
    const isNew = !pdiData.id;
    const id = pdiData.id || generateId();

    const now = new Date().toISOString();

    const pdi: PDI = {
      id,
      operator_registration: pdiData.operator_registration || '',
      supervisor_id: pdiData.supervisor_id,
      supervisor_name: pdiData.supervisor_name || 'Supervisor',
      titulo: pdiData.titulo || 'Plano de Desenvolvimento Individual',
      tipo: pdiData.tipo || 'Desenvolvimento',
      dimensao_foco: pdiData.dimensao_foco || 'Resultados',
      ciclo_dias: pdiData.ciclo_dias || 30,
      data_inicio: pdiData.data_inicio || new Date().toISOString().split('T')[0],
      data_fim: pdiData.data_fim || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: pdiData.status || 'Em evolução',
      progresso: 0,
      diagnostico_inicial: pdiData.diagnostico_inicial || '',
      carreira_objetivo: pdiData.carreira_objetivo || '',
      observacoes: pdiData.observacoes || '',
      objetivos: (pdiData.objetivos || []).map(o => ({ ...o, id: o.id || generateId(), pdi_id: id })),
      acoes: (pdiData.acoes || []).map(a => ({ ...a, id: a.id || generateId(), pdi_id: id })),
      competencias: (pdiData.competencias || []).map(c => ({ ...c, id: c.id || generateId(), pdi_id: id })),
      feedbacks: (pdiData.feedbacks || []).map(f => ({ ...f, id: f.id || generateId(), pdi_id: id })),
      reconhecimentos: (pdiData.reconhecimentos || []).map(r => ({ ...r, id: r.id || generateId(), pdi_id: id })),
      resultado_final: pdiData.resultado_final,
      avaliacao_final_comentario: pdiData.avaliacao_final_comentario,
      data_encerramento: pdiData.data_encerramento,
      created_at: pdiData.created_at || now,
      updated_at: now
    };

    // Recalcula progresso e status
    pdi.progresso = calculatePdiOverallProgress(pdi);
    pdi.status = calculateDynamicPdiStatus(pdi);

    // 1. Salvar no Supabase se disponível
    if (supabase) {
      try {
        const { objetivos, acoes, competencias, feedbacks, reconhecimentos, ...masterRecord } = pdi;
        await supabase.from('pdis').upsert(masterRecord, { onConflict: 'id' });

        if (objetivos.length > 0) {
          await supabase.from('pdi_objetivos').upsert(objetivos, { onConflict: 'id' });
        }
        if (acoes.length > 0) {
          await supabase.from('pdi_acoes').upsert(acoes, { onConflict: 'id' });
        }
        if (competencias.length > 0) {
          await supabase.from('pdi_competencias').upsert(competencias, { onConflict: 'id' });
        }
        if (feedbacks.length > 0) {
          await supabase.from('pdi_feedbacks').upsert(feedbacks, { onConflict: 'id' });
        }
        if (reconhecimentos.length > 0) {
          await supabase.from('pdi_reconhecimentos').upsert(reconhecimentos, { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('[PdiService] Falha ao sincronizar PDI no Supabase. Mantendo local:', e);
      }
    }

    // 2. Salvar no LocalStorage
    const list = loadFromStorage();
    const index = list.findIndex(p => p.id === pdi.id);
    if (index >= 0) {
      list[index] = pdi;
    } else {
      list.unshift(pdi);
    }
    saveToStorage(list);

    return pdi;
  }

  // Atualiza uma Ação (ex: operador marca concluída ou adiciona evidência)
  static async updateAction(
    supabase: SupabaseClient | null,
    pdiId: string,
    actionId: string,
    updates: Partial<PDIAction>
  ): Promise<PDI | null> {
    const list = loadFromStorage();
    const pdi = list.find(p => p.id === pdiId);
    if (!pdi) return null;

    const action = pdi.acoes.find(a => a.id === actionId);
    if (!action) return null;

    Object.assign(action, updates);
    if (updates.status === 'Concluído' && !action.data_conclusao) {
      action.data_conclusao = new Date().toISOString().split('T')[0];
    }

    // Recalcula progresso geral do PDI
    pdi.progresso = calculatePdiOverallProgress(pdi);
    pdi.status = calculateDynamicPdiStatus(pdi);
    pdi.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('pdi_acoes').update(action).eq('id', actionId);
        await supabase.from('pdis').update({ progresso: pdi.progresso, status: pdi.status }).eq('id', pdiId);
      } catch (e) {
        console.warn('[PdiService] Erro ao sincronizar update de ação com Supabase:', e);
      }
    }

    saveToStorage(list);
    return pdi;
  }

  // Adiciona Feedback ao PDI
  static async addFeedback(
    supabase: SupabaseClient | null,
    pdiId: string,
    feedbackData: Omit<PDIFeedback, 'id' | 'pdi_id' | 'data'>
  ): Promise<PDI | null> {
    const list = loadFromStorage();
    const pdi = list.find(p => p.id === pdiId);
    if (!pdi) return null;

    const newFeedback: PDIFeedback = {
      ...feedbackData,
      id: generateId(),
      pdi_id: pdiId,
      data: new Date().toISOString()
    };

    pdi.feedbacks.unshift(newFeedback);
    pdi.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('pdi_feedbacks').insert(newFeedback);
      } catch (e) {
        console.warn('[PdiService] Erro ao sincronizar feedback no Supabase:', e);
      }
    }

    saveToStorage(list);
    return pdi;
  }

  // Adiciona Reconhecimento / Conquista
  static async addRecognition(
    supabase: SupabaseClient | null,
    pdiId: string,
    operatorRegistration: string,
    recognitionData: Omit<PDIRecognition, 'id' | 'pdi_id' | 'operator_registration' | 'data'>
  ): Promise<PDIRecognition> {
    const newRecognition: PDIRecognition = {
      ...recognitionData,
      id: generateId(),
      pdi_id: pdiId,
      operator_registration: operatorRegistration,
      data: new Date().toISOString()
    };

    const list = loadFromStorage();
    const pdi = list.find(p => p.id === pdiId);
    if (pdi) {
      pdi.reconhecimentos.unshift(newRecognition);
      pdi.updated_at = new Date().toISOString();
      saveToStorage(list);
    }

    if (supabase) {
      try {
        await supabase.from('pdi_reconhecimentos').insert(newRecognition);
      } catch (e) {
        console.warn('[PdiService] Erro ao sincronizar reconhecimento no Supabase:', e);
      }
    }

    return newRecognition;
  }

  // Encerra ciclo de PDI com Avaliação Final
  static async finishPdiCycle(
    supabase: SupabaseClient | null,
    pdiId: string,
    resultadoFinal: PDIResult,
    comentario: string
  ): Promise<PDI | null> {
    const list = loadFromStorage();
    const pdi = list.find(p => p.id === pdiId);
    if (!pdi) return null;

    pdi.status = 'Concluído';
    pdi.resultado_final = resultadoFinal;
    pdi.avaliacao_final_comentario = comentario;
    pdi.data_encerramento = new Date().toISOString();
    pdi.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('pdis').update({
          status: 'Concluído',
          resultado_final: resultadoFinal,
          avaliacao_final_comentario: comentario,
          data_encerramento: pdi.data_encerramento,
          updated_at: pdi.updated_at
        }).eq('id', pdiId);
      } catch (e) {
        console.warn('[PdiService] Erro ao finalizar PDI no Supabase:', e);
      }
    }

    saveToStorage(list);
    return pdi;
  }

  // Deleta PDI
  static async deletePdi(supabase: SupabaseClient | null, pdiId: string): Promise<boolean> {
    let list = loadFromStorage();
    list = list.filter(p => p.id !== pdiId);
    saveToStorage(list);

    if (supabase) {
      try {
        await supabase.from('pdis').delete().eq('id', pdiId);
      } catch (e) {
        console.warn('[PdiService] Erro ao deletar PDI no Supabase:', e);
      }
    }

    return true;
  }

  // Calcula estatísticas para o dashboard de supervisão
  static calculateStats(pdis: PDI[]): PDISummaryStats {
    const total = pdis.length;
    let emEvolucao = 0;
    let emAtencao = 0;
    let criticos = 0;
    let concluidos = 0;
    let acoesAtrasadas = 0;
    let somaProgresso = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    pdis.forEach(p => {
      const dynamicStatus = calculateDynamicPdiStatus(p);
      if (dynamicStatus === 'Em evolução') emEvolucao++;
      else if (dynamicStatus === 'Atenção') emAtencao++;
      else if (dynamicStatus === 'Crítico') criticos++;
      else if (dynamicStatus === 'Concluído') concluidos++;

      somaProgresso += (p.progresso || 0);

      p.acoes.forEach(a => {
        if (a.status !== 'Concluído' && a.status !== 'Cancelado') {
          const limit = new Date(a.data_limite);
          limit.setHours(0, 0, 0, 0);
          if (limit < today) acoesAtrasadas++;
        }
      });
    });

    const taxaMediaProgresso = total > 0 ? Math.round(somaProgresso / total) : 0;

    return {
      total,
      emEvolucao,
      emAtencao,
      criticos,
      concluidos,
      acoesAtrasadas,
      taxaMediaProgresso
    };
  }
}
