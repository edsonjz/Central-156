import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Heart,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Target,
  MessageSquare,
  FileText,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Operator, TeamGoals, OperatorClassification } from '../types';
import { MonthlyKpiRecord } from '../types/monthlyKpi';
import {
  fetchMonthKpis,
  fetchYearKpis,
  resolveCanonicalOperator,
  MONTHLY_KPIS_UPDATED_EVENT
} from '../services/monthlyKpiService';
import { useAuth } from '../AuthContext';
import { calculateAverageKPIs, getStatusColor, formatDecimal, tmaToSeconds, getLatestKPIsPerMonth } from '../utils';
import { MONTHS } from '../constants';

const normalizeText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const StatCard = ({ title, value, subtitle, icon, trend, color, goal, unit = '', onClick, tooltip }: any) => {
  const isTmaCard = title === 'TMA Médio' || title === 'Meu TMA';
  const statusColor = getStatusColor(value, goal, isTmaCard ? 'lower' : 'higher');
  const isSuccess = statusColor === 'text-green-600';

  const colorVariants: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', ring: 'ring-indigo-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', ring: 'ring-rose-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' }
  };

  const theme = colorVariants[color] || colorVariants.blue;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
      title={onClick ? (tooltip || 'Clique para visualizar e ordenar na tela de Indicadores') : undefined}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${isSuccess ? 'bg-emerald-500' : goal ? 'bg-amber-500' : 'bg-blue-500'}`} />

      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} ring-1 ${theme.ring} group-hover:scale-105 transition-transform duration-300`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend > 0
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                : 'text-rose-700 bg-rose-50 border border-rose-200/60'
            }`}
          >
            {trend > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {typeof value === 'number' ? formatDecimal(value) : value}
            {unit}
          </span>
          {goal && (
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                isSuccess ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}
            >
              {isSuccess ? 'Na Meta' : 'Atenção'}
            </span>
          )}
        </div>

        {goal && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Meta Estipulada:</span>
            <span className="font-bold text-slate-700">
              {typeof goal === 'number' ? formatDecimal(goal) : goal}
              {unit}
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-2 font-medium">{subtitle}</p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ operators: Operator[]; goals: TeamGoals }> = ({ operators, goals }) => {
  const navigate = useNavigate();
  const { supabase, isAdmin, userProfile, user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [selectedClassification, setSelectedClassification] = useState<'all' | OperatorClassification>('all');
  const [snapshotRecords, setSnapshotRecords] = useState<MonthlyKpiRecord[]>([]);
  const [yearRecords, setYearRecords] = useState<MonthlyKpiRecord[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Escuta alterações feitas na aba Indicadores ou Ficha do Colaborador
  useEffect(() => {
    const handleUpdated = () => setRefreshTick(t => t + 1);
    window.addEventListener(MONTHLY_KPIS_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(MONTHLY_KPIS_UPDATED_EVENT, handleUpdated);
  }, []);

  // Identifica exclusivamente o operador logado quando !isAdmin
  const myOperator = useMemo(() => {
    if (isAdmin) return undefined;
    const cleanReg = userProfile?.registration ? String(userProfile.registration).trim() : '';
    if (cleanReg && cleanReg !== 'SUPERVISOR') {
      const byReg = operators.find(o => String(o.registration || '').trim() === cleanReg);
      if (byReg) return byReg;
    }
    if (user?.id) {
      const byUid = operators.find(o => o.user_id === user.id);
      if (byUid) return byUid;
    }
    if (operators.length === 1) return operators[0];
    if (userProfile && userProfile.registration !== 'SUPERVISOR') return userProfile;
    return undefined;
  }, [isAdmin, operators, userProfile, user?.id]);

  const myIdentity = useMemo(() => {
    if (!myOperator) return null;
    const reg = String(myOperator.registration || '').trim();
    const canonical = resolveCanonicalOperator(myOperator.name, reg);
    return {
      reg,
      chave: canonical.operador_chave,
      normName: normalizeText(myOperator.name),
      normCanonical: normalizeText(canonical.operador_nome)
    };
  }, [myOperator]);

  const isRecordMine = (rec: MonthlyKpiRecord) => {
    if (isAdmin) return true;
    if (!myIdentity) return false;
    const recMat = rec.matricula ? String(rec.matricula).trim() : '';
    if (myIdentity.reg && recMat && recMat === myIdentity.reg) return true;
    if (myIdentity.chave && rec.operador_chave === myIdentity.chave) return true;
    if (myIdentity.reg && rec.operador_chave === myIdentity.reg) return true;
    const recName = normalizeText(rec.operador_nome);
    if (recName && (recName === myIdentity.normName || recName === myIdentity.normCanonical)) return true;
    return false;
  };

  // Carrega o Snapshot Mensal do período selecionado
  useEffect(() => {
    let cancelled = false;
    fetchMonthKpis(supabase, Number(selectedYear), Number(selectedMonth), {
      isAdmin,
      forceRefresh: refreshTick > 0
    }).then(({ data }) => {
      if (!cancelled) {
        setSnapshotRecords(data || []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, isAdmin, selectedYear, selectedMonth, operators, refreshTick]);

  // Carrega o histórico real de todos os meses do ano selecionado (reflete Excel/edições manuais)
  useEffect(() => {
    let cancelled = false;
    fetchYearKpis(supabase, Number(selectedYear), {
      isAdmin,
      forceRefresh: refreshTick > 0
    }).then(({ data }) => {
      if (!cancelled) {
        setYearRecords(data || []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, isAdmin, selectedYear, operators, refreshTick]);

  // Mapa de operadores cadastrados na Equipe (por matrícula e por chave canônica)
  const operatorLookup = useMemo(() => {
    const byReg = new Map<string, Operator>();
    const byKey = new Map<string, Operator>();
    for (const op of operators) {
      const cleanReg = String(op.registration || '').trim();
      if (cleanReg) byReg.set(cleanReg, op);
      const canonical = resolveCanonicalOperator(op.name, cleanReg);
      byKey.set(canonical.operador_chave, op);
    }
    return { byReg, byKey };
  }, [operators]);

  // Para Supervisor: filtra operadores ATIVOS. Para Operador: APENAS seu próprio registro.
  const activeSnapshotOperators = useMemo(() => {
    if (!isAdmin) {
      const mine = snapshotRecords.filter(isRecordMine);
      if (mine.length > 0) return mine;

      const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
      const ownLatestKpis = getLatestKPIsPerMonth(myOperator?.kpis || []);
      const fallbackKpi = ownLatestKpis.find(k => k.month === targetKey);
      if (fallbackKpi && myOperator) {
        const canonical = resolveCanonicalOperator(myOperator.name, myOperator.registration);
        return [
          {
            ano: Number(selectedYear),
            mes: Number(selectedMonth),
            operador_chave: canonical.operador_chave,
            operador_nome: myOperator.name,
            matricula: myOperator.registration,
            tma: fallbackKpi.tma || null,
            tma_segundos: fallbackKpi.tma ? tmaToSeconds(fallbackKpi.tma) : null,
            nps: fallbackKpi.nps ?? null,
            monitoria: fallbackKpi.monitoria ?? null,
            abs: fallbackKpi.abs ?? null,
            status_mes: myOperator.active !== false ? 'Ativo' : 'Desligado'
          } as MonthlyKpiRecord
        ];
      }
      return [];
    }

    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth() + 1;
    const isCurrentCompetencia = Number(selectedYear) === nowYear && Number(selectedMonth) === nowMonth;

    return snapshotRecords.filter(rec => {
      // 1. No Snapshot Mensal, precisa estar com status_mes === 'Ativo'
      if (rec.status_mes && rec.status_mes !== 'Ativo') return false;

      // 2. Se vinculado a um operador na Gestão de Equipe:
      const linkedOp =
        (rec.matricula && operatorLookup.byReg.get(String(rec.matricula).trim())) ||
        operatorLookup.byKey.get(rec.operador_chave);

      // No mês atual, se o operador foi desativado na aba Equipe, não aparece
      if (isCurrentCompetencia && linkedOp && linkedOp.active === false) {
        return false;
      }

      // 3. Filtro por atribuição (SMF / Outros)
      if (selectedClassification !== 'all') {
        if (linkedOp) {
          if (linkedOp.classification !== selectedClassification) return false;
        } else {
          const teamUpper = (rec.equipe_turno || '').toUpperCase();
          if (selectedClassification === OperatorClassification.SMF && !teamUpper.includes('SMF')) return false;
          if (selectedClassification === OperatorClassification.OUTROS && teamUpper.includes('SMF')) return false;
        }
      }

      return true;
    });
  }, [isAdmin, snapshotRecords, operatorLookup, selectedClassification, selectedYear, selectedMonth, myOperator, myIdentity]);

  // KPIs do período selecionado
  const currentPeriodKPIs = useMemo(() => {
    const targetKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    return activeSnapshotOperators.map((rec, idx) => ({
      id: rec.id || `snap_${idx}`,
      month: targetKey,
      tma: rec.tma,
      nps: rec.nps,
      monitoria: rec.monitoria
    }));
  }, [activeSnapshotOperators, selectedMonth, selectedYear]);

  const operatorsWithKPIs = useMemo(() => {
    return activeSnapshotOperators.filter(
      r =>
        (r.tma && r.tma !== '00:00:00') ||
        (r.nps !== null && r.nps !== undefined) ||
        (r.monitoria !== null && r.monitoria !== undefined)
    ).length;
  }, [activeSnapshotOperators]);

  const teamStats = useMemo(() => {
    return calculateAverageKPIs(currentPeriodKPIs);
  }, [currentPeriodKPIs]);

  // Dados do gráfico: evolução de todos os meses do ano selecionado
  const chartData = useMemo(() => {
    const ownLatestKpis = !isAdmin ? getLatestKPIsPerMonth(myOperator?.kpis || []) : [];
    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth() + 1;

    return MONTHS.map((monthName, index) => {
      const monthNum = index + 1;
      const isSelectedM = monthNum === Number(selectedMonth);

      if (!isAdmin) {
        const mineInMonth = isSelectedM
          ? activeSnapshotOperators
          : yearRecords.filter(r => r.mes === monthNum && isRecordMine(r));

        const monthKey = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
        const kpiSource =
          mineInMonth.length > 0
            ? mineInMonth.map((r, i) => ({
                id: `${monthNum}_${i}`,
                month: monthKey,
                tma: r.tma,
                nps: r.nps,
                monitoria: r.monitoria
              }))
            : ownLatestKpis.filter(k => k.month === monthKey);

        const stats = calculateAverageKPIs(kpiSource);
        const tmaSeconds = stats.tma ? tmaToSeconds(stats.tma) : 0;
        return {
          name: monthName,
          NPS: stats.nps,
          Monitoria: stats.monitoria,
          TMA: tmaSeconds,
          tmaFormatted: stats.tma || '00:00:00'
        };
      }

      const isCurrentCompetencia = Number(selectedYear) === nowYear && monthNum === nowMonth;

      const sourceRows = isSelectedM
        ? activeSnapshotOperators
        : yearRecords.filter(r => r.mes === monthNum && (!r.status_mes || r.status_mes === 'Ativo'));

      const filteredRows = isSelectedM
        ? sourceRows
        : sourceRows.filter(rec => {
            const linkedOp =
              (rec.matricula && operatorLookup.byReg.get(String(rec.matricula).trim())) ||
              operatorLookup.byKey.get(rec.operador_chave);
            if (isCurrentCompetencia && linkedOp && linkedOp.active === false) return false;
            if (selectedClassification !== 'all') {
              if (linkedOp) {
                if (linkedOp.classification !== selectedClassification) return false;
              } else {
                const teamUpper = (rec.equipe_turno || '').toUpperCase();
                if (selectedClassification === OperatorClassification.SMF && !teamUpper.includes('SMF')) return false;
                if (selectedClassification === OperatorClassification.OUTROS && teamUpper.includes('SMF')) return false;
              }
            }
            return true;
          });

      const stats = calculateAverageKPIs(
        filteredRows.map((r, i) => ({
          id: `${monthNum}_${i}`,
          month: `${selectedYear}-${String(monthNum).padStart(2, '0')}`,
          tma: r.tma,
          nps: r.nps,
          monitoria: r.monitoria
        }))
      );

      const tmaSeconds = stats.tma ? tmaToSeconds(stats.tma) : 0;

      return {
        name: monthName,
        NPS: stats.nps,
        Monitoria: stats.monitoria,
        TMA: tmaSeconds,
        tmaFormatted: stats.tma || '00:00:00'
      };
    });
  }, [isAdmin, activeSnapshotOperators, yearRecords, selectedMonth, selectedYear, operatorLookup, selectedClassification, myOperator, myIdentity]);

  const topPerformers = useMemo(() => {
    if (!isAdmin) return [];
    return activeSnapshotOperators
      .map(rec => {
        const linkedOp =
          (rec.matricula && operatorLookup.byReg.get(String(rec.matricula).trim())) ||
          operatorLookup.byKey.get(rec.operador_chave);

        const metrics: number[] = [];
        if (rec.nps !== null && rec.nps !== undefined) metrics.push(Number(rec.nps));
        if (rec.monitoria !== null && rec.monitoria !== undefined) metrics.push(Number(rec.monitoria));
        if (metrics.length === 0) return null;

        const score = metrics.reduce((a, b) => a + b, 0) / metrics.length;

        return {
          name: rec.operador_nome,
          score,
          photoUrl: linkedOp?.photoUrl,
          tma: rec.tma || '-',
          monitoria: rec.monitoria,
          nps: rec.nps
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Number(b.score) - Number(a.score))
      .slice(0, 5);
  }, [isAdmin, activeSnapshotOperators, operatorLookup]);

  const myFeedbacksCount = myOperator?.feedbacks?.length || 0;
  const myPendingFeedbacksCount = (myOperator?.feedbacks || []).filter(f => !f.operatorResponse).length;
  const myDocsCount = myOperator?.documents?.length || 0;
  const myCurrentSnapshot = !isAdmin ? activeSnapshotOperators[0] : undefined;

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isAdmin ? 'Visão Geral da Operação' : 'Meu Painel de Desempenho'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? `Acompanhamento dos operadores ativos em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`
              : `${myOperator?.name || userProfile?.name || 'Operador'} • Seus indicadores individuais em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear}`}
          </p>
        </div>

        {/* Premium Filter Bar */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
            <Filter size={16} />
          </div>
          <select
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={String(idx + 1)}>
                {m}
              </option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200" />
          <select
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {isAdmin && (
            <>
              <div className="w-px h-5 bg-slate-200" />
              <select
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                value={selectedClassification}
                onChange={e => setSelectedClassification(e.target.value as any)}
              >
                <option value="all">Todas Atribuições</option>
                <option value={OperatorClassification.SMF}>SMF</option>
                <option value={OperatorClassification.OUTROS}>Outros</option>
              </select>
            </>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Operadores Ativos no Mês"
            value={operatorsWithKPIs}
            subtitle={`Ativos em ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear} • Clique p/ ordenar`}
            icon={<Calendar size={24} />}
            color="blue"
            onClick={() => navigate('/indicators?sort=name&dir=asc')}
          />
          <StatCard
            title="TMA Médio"
            value={teamStats.tma}
            goal={goals.tma}
            subtitle="Média dos ativos • Clique p/ ordenar"
            icon={<Clock size={24} />}
            color="indigo"
            onClick={() => navigate('/indicators?sort=tma&dir=desc')}
          />
          <StatCard
            title="NPS Geral"
            value={teamStats.nps}
            goal={goals.nps}
            subtitle="Satisfação dos ativos • Clique p/ ordenar"
            icon={<Heart size={24} />}
            color="rose"
            onClick={() => navigate('/indicators?sort=nps&dir=desc')}
          />
          <StatCard
            title="Monitoria"
            value={teamStats.monitoria}
            goal={goals.monitoria}
            subtitle="Qualidade dos ativos • Clique p/ ordenar"
            icon={<CheckCircle size={24} />}
            color="emerald"
            onClick={() => navigate('/indicators?sort=monitoria&dir=desc')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Meu TMA"
            value={teamStats.tma}
            goal={goals.tma}
            subtitle={myCurrentSnapshot ? `Competência ${MONTHS[Number(selectedMonth) - 1]}/${selectedYear} • Ver histórico` : 'Sem lançamento no mês • Ver histórico'}
            tooltip="Clique para abrir Meus Indicadores"
            icon={<Clock size={24} />}
            color="indigo"
            onClick={() => navigate('/my-profile')}
          />
          <StatCard
            title="Meu NPS"
            value={teamStats.nps}
            goal={goals.nps}
            subtitle="Sua nota de satisfação • Ver histórico"
            tooltip="Clique para abrir Meus Indicadores"
            icon={<Heart size={24} />}
            color="rose"
            onClick={() => navigate('/my-profile')}
          />
          <StatCard
            title="Minha Monitoria"
            value={teamStats.monitoria}
            goal={goals.monitoria}
            subtitle="Sua nota de qualidade • Ver histórico"
            tooltip="Clique para abrir Meus Indicadores"
            icon={<CheckCircle size={24} />}
            color="emerald"
            onClick={() => navigate('/my-profile')}
          />
          <StatCard
            title="Meus Feedbacks"
            value={myFeedbacksCount}
            subtitle={
              myPendingFeedbacksCount > 0
                ? `${myPendingFeedbacksCount} aguardando sua resposta • Clique p/ abrir`
                : `${myDocsCount} documento(s) anexado(s) • Clique p/ abrir`
            }
            tooltip="Clique para abrir seus Feedbacks"
            icon={<MessageSquare size={24} />}
            color="blue"
            onClick={() => navigate('/my-profile?tab=feedback')}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
                {isAdmin ? `Evolução dos Indicadores em ${selectedYear}` : `Minha Evolução em ${selectedYear}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Histórico consolidado mês a mês (Operadores Ativos)'
                  : 'Histórico individual mês a mês dos seus indicadores'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> NPS
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Monitoria
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> TMA
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorNPS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMonitoria" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTMA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 12px 32px -4px rgba(0,0,0,0.3)',
                    padding: '12px 16px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'TMA') {
                      return [props.payload.tmaFormatted, 'TMA'];
                    }
                    return [formatDecimal(value), name];
                  }}
                />
                <Area type="monotone" dataKey="NPS" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorNPS)" name="NPS" dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="Monitoria" stroke="#10b981" strokeWidth={2.5} fill="url(#colorMonitoria)" name="Monitoria" dot={false} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="TMA" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorTMA)" name="TMA" dot={false} activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isAdmin ? (
          /* Top 5 Ranking (Exclusivo Supervisor) */
          <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Destaques da Equipe</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {MONTHS[Number(selectedMonth) - 1]} / {selectedYear} (Apenas Ativos)
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                Top 5
              </span>
            </div>

            <div className="space-y-2.5">
              {topPerformers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Nenhum operador ativo com lançamento para este período.
                </div>
              ) : (
                topPerformers.map((op: any, index: number) => (
                  <div
                    key={op.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/80 hover:border-slate-200/80 transition-all group"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : index === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                      {op.photoUrl ? (
                        <img src={op.photoUrl} alt={op.name} className="w-full h-full object-cover" />
                      ) : (
                        op.name.charAt(0)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {op.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100/70 text-amber-800">
                          ⏱ {op.tma}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800">
                          ✓ {formatDecimal(op.monitoria)}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-800">
                          ♥ {formatDecimal(op.nps)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-1">
                      <span className="text-base font-extrabold text-slate-900">{formatDecimal(op.score)}</span>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">Média</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Portal Individual do Operador (sem dados ou ranking da equipe) */
          <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Meu Espaço</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Acesso exclusivo aos seus registros
                  </p>
                </div>
                {myOperator?.registration && (
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                    #{myOperator.registration}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/my-profile')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <TrendingUp size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Meus Indicadores</p>
                      <p className="text-[11px] text-slate-500">Histórico mensal de TMA, NPS e Monitoria</p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/my-pdi')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-100 hover:border-indigo-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <Target size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">Meu PDI 360°</p>
                      <p className="text-[11px] text-slate-500">Objetivos, ações e competências</p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/my-profile?tab=feedback')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <MessageSquare size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                        Meus Feedbacks ({myFeedbacksCount})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {myPendingFeedbacksCount > 0
                          ? `${myPendingFeedbacksCount} pendente(s) de ciência`
                          : 'Orientações e alinhamentos individuais'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/my-profile?tab=documents')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-100 hover:border-amber-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                      <FileText size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                        Meus Documentos ({myDocsCount})
                      </p>
                      <p className="text-[11px] text-slate-500">Atestados, declarações e anexos</p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
