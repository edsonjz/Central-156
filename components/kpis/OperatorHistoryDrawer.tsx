import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Calendar,
  Clock,
  Heart,
  CheckCircle,
  ExternalLink,
  Loader2,
  UserCheck,
  Award,
  MessageSquare
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SupabaseClient } from '@supabase/supabase-js';
import { MonthlyKpiRecord, MonthlySemaphoreGoals } from '../../types/monthlyKpi';
import {
  fetchOperatorMonthlyHistory,
  getCompetenciaLabel,
  evaluateMetricSemaphore
} from '../../services/monthlyKpiService';
import { formatDecimal, secondsToTma } from '../../utils';

interface OperatorHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supabase: SupabaseClient | null;
  operadorChave: string | null;
  operadorNome: string;
  matricula?: string | null;
  semaphoreGoals: MonthlySemaphoreGoals;
  onNavigateProfile?: (matricula: string) => void;
}

const SEMAPHORE_BADGE_CLASSES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-50 text-slate-500 border-slate-200'
};

export const OperatorHistoryDrawer: React.FC<OperatorHistoryDrawerProps> = ({
  isOpen,
  onClose,
  supabase,
  operadorChave,
  operadorNome,
  matricula,
  semaphoreGoals,
  onNavigateProfile
}) => {
  const [history, setHistory] = useState<MonthlyKpiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !operadorChave) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchOperatorMonthlyHistory(supabase, operadorChave).then(({ data, error: err }) => {
      if (cancelled) return;
      setHistory(data || []);
      setError(err);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, operadorChave, supabase]);

  const summary = useMemo(() => {
    if (history.length === 0) {
      return { totalMonths: 0, avgMonitoria: null, avgNps: null, avgTma: null, avgAbs: null };
    }
    const monVals = history.map(h => h.monitoria).filter((v): v is number => v !== null && v !== undefined);
    const npsVals = history.map(h => h.nps).filter((v): v is number => v !== null && v !== undefined);
    const tmaVals = history.map(h => h.tma_segundos).filter((v): v is number => v !== null && v !== undefined && v > 0);
    const absVals = history.map(h => h.abs).filter((v): v is number => v !== null && v !== undefined);

    return {
      totalMonths: history.length,
      avgMonitoria: monVals.length ? monVals.reduce((a, b) => a + b, 0) / monVals.length : null,
      avgNps: npsVals.length ? npsVals.reduce((a, b) => a + b, 0) / npsVals.length : null,
      avgTma: tmaVals.length ? secondsToTma(tmaVals.reduce((a, b) => a + b, 0) / tmaVals.length) : null,
      avgAbs: absVals.length
        ? absVals.reduce((a, b) => a + (b <= 1.5 ? b * 100 : b), 0) / absVals.length
        : null
    };
  }, [history]);

  const chartData = useMemo(() => {
    return history.map(h => ({
      competencia: getCompetenciaLabel(h.ano, h.mes),
      Monitoria: h.monitoria,
      NPS: h.nps
    }));
  }, [history]);

  if (!isOpen || !operadorChave) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-lg font-black text-blue-200">
              {operadorNome.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{operadorNome}</h2>
                {matricula && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-blue-200">
                    #{matricula}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Histórico Comparativo de Indicadores por Competência Mensal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {matricula && onNavigateProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateProfile(matricula);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-blue-200 border border-white/15 transition-all"
              >
                <span>Perfil Completo</span>
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-sm font-bold">Carregando histórico evolutivo do operador no Supabase...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
              Erro ao buscar histórico: {error}
            </div>
          ) : (
            <>
              {/* Historical Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                    <Calendar size={13} className="text-blue-600" />
                    <span>Competências</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {summary.totalMonths} <span className="text-xs font-semibold text-slate-500">meses</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                    <Clock size={13} className="text-indigo-600" />
                    <span>TMA Histórico</span>
                  </div>
                  <p className="text-2xl font-black font-mono text-slate-900 mt-1">
                    {summary.avgTma || '-'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                    <Heart size={13} className="text-blue-600" />
                    <span>Média NPS</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {summary.avgNps !== null ? formatDecimal(summary.avgNps) : '-'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                    <CheckCircle size={13} className="text-emerald-600" />
                    <span>Média Monitoria</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {summary.avgMonitoria !== null ? `${formatDecimal(summary.avgMonitoria)}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Evolution Chart */}
              {chartData.length > 1 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-600" />
                    <span>Curva de Evolução Mensal (Monitoria e NPS)</span>
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="competencia" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                        <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                        <Line
                          type="monotone"
                          dataKey="Monitoria"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="NPS"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Month-by-Month Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Award size={15} className="text-blue-600" />
                    <span>Snapshots Mensais Registrados ({history.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Meses sem registro indicam ausência na escala / férias / outra equipe
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 uppercase font-black border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Mês / Ano</th>
                        <th className="px-3 py-3 text-center">Status no Mês</th>
                        <th className="px-3 py-3 text-center">TMA</th>
                        <th className="px-3 py-3 text-center">NPS</th>
                        <th className="px-3 py-3 text-center">Monitoria</th>
                        <th className="px-3 py-3 text-center">ABS</th>
                        <th className="px-4 py-3">Equipe / Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...history].reverse().map(rec => {
                        const tmaSem = evaluateMetricSemaphore('tma', rec.tma, semaphoreGoals);
                        const npsSem = evaluateMetricSemaphore('nps', rec.nps, semaphoreGoals);
                        const monSem = evaluateMetricSemaphore('monitoria', rec.monitoria, semaphoreGoals);
                        return (
                          <tr key={`${rec.ano}-${rec.mes}`} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-black text-slate-800">
                              {getCompetenciaLabel(rec.ano, rec.mes)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                {rec.status_mes || 'Ativo'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-mono font-black px-2 py-1 rounded-lg border ${SEMAPHORE_BADGE_CLASSES[tmaSem]}`}>
                                {rec.tma || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-black px-2 py-1 rounded-lg border ${SEMAPHORE_BADGE_CLASSES[npsSem]}`}>
                                {rec.nps !== null && rec.nps !== undefined ? formatDecimal(rec.nps) : '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-black px-2 py-1 rounded-lg border ${SEMAPHORE_BADGE_CLASSES[monSem]}`}>
                                {rec.monitoria !== null && rec.monitoria !== undefined ? `${formatDecimal(rec.monitoria)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-600">
                              {rec.abs !== null && rec.abs !== undefined
                                ? `${formatDecimal(rec.abs <= 1.5 ? rec.abs * 100 : rec.abs)}%`
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="font-bold text-slate-700">{rec.equipe_turno || 'Central 156'}</div>
                              {rec.observacoes && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MessageSquare size={11} />
                                  <span>{rec.observacoes}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
