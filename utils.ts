
import { KPI } from './types';

export const tmaToSeconds = (tma: string | null | undefined): number => {
  if (!tma || tma === '00:00:00') return 0;
  const parts = tma.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
};

export const secondsToTma = (seconds: number): string => {
  if (!seconds && seconds !== 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const formatDecimal = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

/**
 * Filtra uma lista de KPIs para manter apenas o lançamento mais recente de cada mês.
 */
export const getLatestKPIsPerMonth = (kpis: KPI[]): KPI[] => {
  if (!kpis || kpis.length === 0) return [];

  // Agrupa por mês
  const groups: { [key: string]: KPI } = {};

  // Ordena por data de criação para garantir que o último pegue (ou se não tiver, mantém o último encontrado no array)
  // Como as regras novas adicionam createdAt, vamos usá-lo.
  const sortedKpis = [...kpis].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB; // Ordem crescente para o último sobrescrever
  });

  sortedKpis.forEach(k => {
    groups[k.month] = k;
  });

  return Object.values(groups);
};

export const calculateAverageKPIs = (kpis: KPI[]) => {
  if (!kpis || kpis.length === 0) return { tma: '00:00:00', nps: 0, monitoria: 0 };

  let tmaSum = 0;
  let tmaCount = 0;
  let npsSum = 0;
  let npsCount = 0;
  let monSum = 0;
  let monCount = 0;

  kpis.forEach(k => {
    if (k.tma && k.tma !== '00:00:00') {
      tmaSum += tmaToSeconds(k.tma);
      tmaCount++;
    }
    if (k.nps !== null && k.nps !== undefined) {
      npsSum += k.nps;
      npsCount++;
    }
    if (k.monitoria !== null && k.monitoria !== undefined) {
      monSum += k.monitoria;
      monCount++;
    }
  });

  return {
    tma: tmaCount > 0 ? secondsToTma(tmaSum / tmaCount) : '00:00:00',
    nps: npsCount > 0 ? Number((npsSum / npsCount).toFixed(2)) : 0,
    monitoria: monCount > 0 ? Number((monSum / monCount).toFixed(2)) : 0,
  };
};

export const getStatusColor = (value: number | string | null, goal: number | string, type: 'lower' | 'higher' = 'higher') => {
  if (value === null || value === undefined || value === '-' || value === '00:00:00' || value === 0) return 'text-gray-400';

  if (type === 'higher') {
    return Number(value) >= Number(goal) ? 'text-green-600' : 'text-red-600';
  } else {
    // For TMA, lower is better
    return tmaToSeconds(String(value)) <= tmaToSeconds(String(goal)) ? 'text-green-600' : 'text-red-600';
  }
};

export const generateSystemEmail = (registration: string) => {
  // Usa @example.com para garantir compatibilidade total com validadores de e-mail (RFC 2606)
  const cleanReg = String(registration || '').trim().replace(/[^a-zA-Z0-9]/g, '');
  return `op${cleanReg}@example.com`;
};
