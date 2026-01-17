import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    Cell,
    LineChart,
    Line
} from 'recharts';
import {
    Download,
    BarChart3,
    Filter,
    Calendar,
    Users,
    User,
    TrendingUp,
    Award,
    FileSpreadsheet
} from 'lucide-react';
import { PerformanceEvaluation, EVALUATION_CRITERIA_CONFIG, Operator } from '../types';
import { useAuth } from '../AuthContext';

interface EvaluationDashboardProps {
    operators: Operator[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const SCORE_COLORS = {
    5: '#10b981',
    4: '#22c55e',
    3: '#f59e0b',
    2: '#f97316',
    1: '#ef4444'
};

const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({ operators }) => {
    const { supabase } = useAuth();

    // Estado dos filtros
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        now.setMonth(now.getMonth() - 6);
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedOperatorFilter, setSelectedOperatorFilter] = useState('all');

    // Estado dos dados
    const [allEvaluations, setAllEvaluations] = useState<PerformanceEvaluation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar todas as avaliações
    const loadAllEvaluations = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('performance_evaluations')
                .select('*')
                .gte('period', startDate)
                .lte('period', endDate);

            if (selectedOperatorFilter !== 'all') {
                query = query.eq('operator_registration', selectedOperatorFilter);
            }

            const { data, error } = await query.order('period', { ascending: true });

            if (error) throw error;
            setAllEvaluations(data || []);
        } catch (err) {
            console.error('Erro ao carregar avaliações:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, startDate, endDate, selectedOperatorFilter]);

    useEffect(() => {
        loadAllEvaluations();
    }, [loadAllEvaluations]);

    // Calcular dados para os gráficos
    const criteriaAverages = EVALUATION_CRITERIA_CONFIG.map(c => {
        const values = allEvaluations
            .map(ev => (ev as any)[c.key])
            .filter(v => v !== null && v !== undefined) as number[];
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        return {
            criterio: c.label.split(' ').slice(0, 2).join(' '),
            fullLabel: c.label,
            media: Number(avg.toFixed(2)),
            total: values.length
        };
    });

    // Dados por operador
    const operatorAverages = operators
        .filter(op => op.active)
        .map(op => {
            const opEvals = allEvaluations.filter(ev => ev.operator_registration === op.registration);
            if (opEvals.length === 0) return null;

            const allScores: number[] = [];
            opEvals.forEach(ev => {
                EVALUATION_CRITERIA_CONFIG.forEach(c => {
                    const val = (ev as any)[c.key];
                    if (val) allScores.push(val);
                });
                if (ev.nota_tma) allScores.push(ev.nota_tma);
                if (ev.nota_nps) allScores.push(ev.nota_nps);
                if (ev.nota_monitoria) allScores.push(ev.nota_monitoria);
            });

            const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
            return {
                nome: op.name.split(' ')[0],
                fullName: op.name,
                registration: op.registration,
                media: Number(avg.toFixed(2)),
                avaliacoes: opEvals.length
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.media - a.media);

    // Dados para radar (média geral de todos critérios)
    const radarData = EVALUATION_CRITERIA_CONFIG.map(c => {
        const values = allEvaluations
            .map(ev => (ev as any)[c.key])
            .filter(v => v !== null && v !== undefined) as number[];
        return {
            criterio: c.label.split(' ').slice(0, 2).join(' '),
            valor: values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0,
            max: 5
        };
    });

    // KPIs automáticos
    const kpiData = [
        {
            nome: 'TMA',
            media: allEvaluations.length > 0
                ? Number((allEvaluations.filter(e => e.nota_tma).reduce((a, b) => a + (b.nota_tma || 0), 0) / allEvaluations.filter(e => e.nota_tma).length).toFixed(2))
                : 0
        },
        {
            nome: 'NPS',
            media: allEvaluations.length > 0
                ? Number((allEvaluations.filter(e => e.nota_nps).reduce((a, b) => a + (b.nota_nps || 0), 0) / allEvaluations.filter(e => e.nota_nps).length).toFixed(2))
                : 0
        },
        {
            nome: 'Monitoria',
            media: allEvaluations.length > 0
                ? Number((allEvaluations.filter(e => e.nota_monitoria).reduce((a, b) => a + (b.nota_monitoria || 0), 0) / allEvaluations.filter(e => e.nota_monitoria).length).toFixed(2))
                : 0
        }
    ];

    // Evolução mensal
    const monthlyData = Array.from(new Set(allEvaluations.map(e => e.period)))
        .sort()
        .map(period => {
            const monthEvals = allEvaluations.filter(e => e.period === period);
            const scores: number[] = [];
            monthEvals.forEach(ev => {
                EVALUATION_CRITERIA_CONFIG.forEach(c => {
                    const val = (ev as any)[c.key];
                    if (val) scores.push(val);
                });
            });
            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return {
                periodo: new Date(period + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                media: Number(avg.toFixed(2)),
                avaliacoes: monthEvals.length
            };
        });

    // Exportar para Excel (CSV)
    const exportToExcel = () => {
        if (allEvaluations.length === 0) {
            alert('Nenhuma avaliação para exportar!');
            return;
        }

        // Cabeçalhos
        const headers = [
            'Período',
            'Operador',
            'Matrícula',
            'Avaliador',
            'Data Avaliação',
            ...EVALUATION_CRITERIA_CONFIG.map(c => c.label),
            'Nota TMA (Auto)',
            'Nota NPS (Auto)',
            'Nota Monitoria (Auto)',
            'Média Geral',
            'Pontos Fortes',
            'Pontos de Melhoria',
            'Plano de Desenvolvimento'
        ];

        // Linhas de dados
        const rows = allEvaluations.map(ev => {
            const operador = operators.find(op => op.registration === ev.operator_registration);
            const scores = [
                ev.assiduidade, ev.qualidade_atendimento, ev.procedimentos,
                ev.conhecimento_tecnico, ev.produtividade, ev.organizacao,
                ev.comportamento, ev.trabalho_equipe, ev.adaptabilidade,
                ev.autonomia, ev.nota_tma, ev.nota_nps, ev.nota_monitoria
            ].filter(s => s !== null) as number[];
            const mediaGeral = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';

            return [
                ev.period,
                operador?.name || 'N/A',
                ev.operator_registration,
                ev.evaluator_name,
                ev.created_at ? new Date(ev.created_at).toLocaleDateString('pt-BR') : '',
                ev.assiduidade || '',
                ev.qualidade_atendimento || '',
                ev.procedimentos || '',
                ev.conhecimento_tecnico || '',
                ev.produtividade || '',
                ev.organizacao || '',
                ev.comportamento || '',
                ev.trabalho_equipe || '',
                ev.adaptabilidade || '',
                ev.autonomia || '',
                ev.nota_tma || '',
                ev.nota_nps || '',
                ev.nota_monitoria || '',
                mediaGeral,
                `"${(ev.pontos_fortes || '').replace(/"/g, '""')}"`,
                `"${(ev.pontos_melhoria || '').replace(/"/g, '""')}"`,
                `"${(ev.plano_desenvolvimento || '').replace(/"/g, '""')}"`
            ];
        });

        // Criar CSV
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `avaliacoes_desempenho_${startDate}_a_${endDate}.csv`;
        link.click();
    };

    // Estatísticas gerais
    const totalAvaliacoes = allEvaluations.length;
    const operadoresAvaliados = new Set(allEvaluations.map(e => e.operator_registration)).size;
    const mediaGeral = allEvaluations.length > 0
        ? Number((allEvaluations.reduce((acc, ev) => {
            const scores = [
                ev.assiduidade, ev.qualidade_atendimento, ev.procedimentos,
                ev.conhecimento_tecnico, ev.produtividade, ev.organizacao,
                ev.comportamento, ev.trabalho_equipe, ev.adaptabilidade,
                ev.autonomia, ev.nota_tma, ev.nota_nps, ev.nota_monitoria
            ].filter(s => s !== null) as number[];
            return acc + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
        }, 0) / allEvaluations.length).toFixed(2))
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com Filtros */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-blue-600" size={24} />
                        <div>
                            <h3 className="font-bold text-gray-900">Dashboard de Avaliações</h3>
                            <p className="text-xs text-gray-500">Visão consolidada do desempenho da equipe</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <select
                                value={selectedOperatorFilter}
                                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none max-w-[200px]"
                            >
                                <option value="all">Toda Equipe</option>
                                {operators
                                    .filter(op => op.active)
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(op => (
                                        <option key={op.registration} value={op.registration}>
                                            {op.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <input
                                type="month"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                            <span className="text-gray-400">até</span>
                            <input
                                type="month"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>

                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                        >
                            <FileSpreadsheet size={18} />
                            Exportar Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 opacity-80 text-sm font-medium">
                        <Calendar size={16} />
                        Avaliações
                    </div>
                    <p className="text-3xl font-black mt-2">{totalAvaliacoes}</p>
                    <p className="text-xs opacity-70 mt-1">no período selecionado</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 opacity-80 text-sm font-medium">
                        <Users size={16} />
                        Operadores
                    </div>
                    <p className="text-3xl font-black mt-2">{operadoresAvaliados}</p>
                    <p className="text-xs opacity-70 mt-1">avaliados</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 opacity-80 text-sm font-medium">
                        <TrendingUp size={16} />
                        Média Geral
                    </div>
                    <p className="text-3xl font-black mt-2">{mediaGeral}</p>
                    <p className="text-xs opacity-70 mt-1">de 5.0</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 opacity-80 text-sm font-medium">
                        <Award size={16} />
                        Critérios
                    </div>
                    <p className="text-3xl font-black mt-2">13</p>
                    <p className="text-xs opacity-70 mt-1">avaliados por operador</p>
                </div>
            </div>

            {allEvaluations.length === 0 ? (
                <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
                    <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="font-bold text-gray-700">Nenhuma avaliação no período</h3>
                    <p className="text-sm text-gray-400 mt-1">Ajuste os filtros de data ou realize novas avaliações</p>
                </div>
            ) : (
                <>
                    {/* Gráficos em Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Radar - Média por Critério */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Média por Critério</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={radarData}>
                                    <PolarGrid strokeDasharray="3 3" />
                                    <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <Radar
                                        name="Média"
                                        dataKey="valor"
                                        stroke="#3b82f6"
                                        fill="#3b82f6"
                                        fillOpacity={0.5}
                                    />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Barras - Critérios */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Desempenho por Critério</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={criteriaAverages} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="criterio" type="category" width={80} tick={{ fontSize: 9 }} />
                                    <Tooltip
                                        formatter={(value: number) => [value.toFixed(2), 'Média']}
                                        labelFormatter={(label) => criteriaAverages.find(c => c.criterio === label)?.fullLabel || label}
                                    />
                                    <Bar dataKey="media" radius={[0, 4, 4, 0]}>
                                        {criteriaAverages.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.media >= 4 ? '#10b981' : entry.media >= 3 ? '#f59e0b' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Ranking de Operadores */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Ranking de Operadores</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={operatorAverages.slice(0, 10)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value: number, name: string, props: any) => [
                                            `${value.toFixed(2)} (${props.payload.avaliacoes} aval.)`,
                                            'Média'
                                        ]}
                                        labelFormatter={(label) => operatorAverages.find((o: any) => o.nome === label)?.fullName || label}
                                    />
                                    <Bar dataKey="media" radius={[0, 4, 4, 0]}>
                                        {(operatorAverages as any[]).slice(0, 10).map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* KPIs Automáticos */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Indicadores Automáticos (KPIs)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={kpiData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(value: number) => [value.toFixed(2), 'Média']} />
                                    <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                                        {kpiData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.media >= 4 ? '#10b981' : entry.media >= 3 ? '#f59e0b' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Evolução Mensal */}
                    {monthlyData.length > 1 && (
                        <div className="bg-white rounded-2xl border shadow-sm p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Evolução Mensal da Média</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value: number, name: string, props: any) => [
                                            `${value.toFixed(2)} (${props.payload.avaliacoes} aval.)`,
                                            'Média'
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="media"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Tabela Resumo */}
                    <div className="bg-white rounded-2xl border shadow-sm p-6">
                        <h4 className="font-bold text-gray-900 mb-4">Resumo por Operador</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-bold text-gray-600">Operador</th>
                                        <th className="text-center py-3 px-2 font-bold text-gray-600">Avaliações</th>
                                        <th className="text-center py-3 px-2 font-bold text-gray-600">Média</th>
                                        {EVALUATION_CRITERIA_CONFIG.slice(0, 5).map(c => (
                                            <th key={c.key} className="text-center py-3 px-2 font-bold text-gray-600 text-[10px]">
                                                {c.label.split(' ')[0]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(operatorAverages as any[]).slice(0, 10).map((op, i) => {
                                        const opEvals = allEvaluations.filter(e => e.operator_registration === op.registration);
                                        return (
                                            <tr key={op.registration} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-gray-900">{op.fullName}</td>
                                                <td className="text-center py-3 px-2">{op.avaliacoes}</td>
                                                <td className="text-center py-3 px-2">
                                                    <span className={`px-2 py-1 rounded-lg font-bold text-white text-xs ${op.media >= 4 ? 'bg-green-500' : op.media >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}>
                                                        {op.media}
                                                    </span>
                                                </td>
                                                {EVALUATION_CRITERIA_CONFIG.slice(0, 5).map(c => {
                                                    const vals = opEvals.map(e => (e as any)[c.key]).filter(Boolean) as number[];
                                                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                                                    return (
                                                        <td key={c.key} className="text-center py-3 px-2 text-xs">
                                                            {avg > 0 ? avg.toFixed(1) : '-'}
                                                        </td>
                                                    );
                                                })}
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
    );
};

export default EvaluationDashboard;
