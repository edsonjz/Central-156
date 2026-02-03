import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { Operator, TeamGoals } from './types';
import { INITIAL_OPERATORS, GOALS as INITIAL_GOALS } from './constants';

export const useOperatorsData = (supabase: SupabaseClient | null, user: User | null, userProfile: Operator | null, isAdmin: boolean) => {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [goals, setGoals] = useState<TeamGoals>(INITIAL_GOALS);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [systemError, setSystemError] = useState<{ title: string, msg: string, fix?: string } | null>(null);

    const loadData = useCallback(async () => {
        if (!supabase || !user) return;
        setIsDataLoading(true);
        setSystemError(null);

        try {
            const { data: opsData, error: opsError } = await supabase
                .from('operators')
                .select('*')
                .order('name');

            let loadedOps: Operator[] = [];

            if (!opsError && opsData) {
                loadedOps = opsData.map((op: any) => ({
                    ...op,
                    kpis: op.kpis || [],
                    feedbacks: op.feedbacks || [],
                    documents: op.documents || [],
                    active: op.active ?? true
                }));
            }

            if ((!loadedOps || loadedOps.length === 0) && userProfile && !isAdmin) {
                loadedOps = [userProfile];
            }

            if (loadedOps.length > 0) {
                setOperators(current => {
                    // OTIMIZAÇÃO: Comparação profunda para evitar re-render se os dados não mudaram
                    // Isso é crucial para evitar loops de efeito quando o AuthContext atualiza
                    if (JSON.stringify(current) === JSON.stringify(loadedOps)) {
                        return current;
                    }
                    return loadedOps;
                });
            } else if (opsError) {
                if (opsError?.code === '42P17') {
                    setSystemError({
                        title: "Erro Crítico: Recursão Infinita (RLS)",
                        msg: "A política de segurança do banco entrou em loop infinito.",
                        fix: `-- SOLUÇÃO COMPLETA ...`
                    });
                } else {
                    setOperators(INITIAL_OPERATORS);
                }
            }

            const { data: goalsData } = await supabase
                .from('config')
                .select('value')
                .eq('key', 'metas')
                .single();

            if (goalsData?.value) {
                setGoals(goalsData.value);
            }

        } catch (err) {
            console.error("Falha no carregamento:", err);
            setOperators(INITIAL_OPERATORS);
        } finally {
            setIsDataLoading(false);
        }
    }, [supabase, user, isAdmin]);

    useEffect(() => {
        loadData();

        let channel: any;
        if (supabase && user) {
            // OTIMIZAÇÃO: Handlers específicos para cada tipo de evento
            // Isso reduz a carga no servidor Supabase, pois não precisa processar evento genérico '*'

            const handleInsertOrUpdate = (payload: any) => {
                const newRecord = payload.new;
                if (!newRecord) return;

                setOperators(prev => {
                    const exists = prev.some(op => op.registration === newRecord.registration);
                    const existingOp = prev.find(op => op.registration === newRecord.registration);

                    // Preservar documentos locais se o payload vier sem eles
                    const sanitizedOp = {
                        ...newRecord,
                        kpis: newRecord.kpis || [],
                        feedbacks: newRecord.feedbacks || [],
                        documents: newRecord.documents || (existingOp ? existingOp.documents : []),
                        active: newRecord.active ?? true
                    };

                    if (exists) {
                        return prev.map(op => op.registration === newRecord.registration ? sanitizedOp : op);
                    } else {
                        return [...prev, sanitizedOp].sort((a, b) => a.name.localeCompare(b.name));
                    }
                });
            };

            const handleDelete = (payload: any) => {
                if (payload.old) {
                    setOperators(prev => prev.filter(op => op.registration !== payload.old.registration));
                }
            };

            channel = supabase
                .channel('operators-changes')
                // OTIMIZAÇÃO: Eventos específicos em vez de '*' genérico
                // Reduz processamento no servidor e melhora performance
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operators' }, handleInsertOrUpdate)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'operators' }, handleInsertOrUpdate)
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'operators' }, handleDelete)
                .subscribe();
        }

        // OTIMIZAÇÃO: Fallback polling estendido para 60 minutos
        // Apenas para edge cases onde Realtime pode falhar silenciosamente
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible' && supabase) {
                console.log('[useOperatorsData] Fallback polling triggered (60min)');
                supabase.from('operators')
                    .select('user_id, registration, name, admissionDate, role, linkType, costCenter, classification, workMode, birthDate, photoUrl, active, kpis, feedbacks')
                    .order('name')
                    .then(({ data }) => {
                        if (data) {
                            setOperators(current => {
                                const mergedOps = data.map((newOp: any) => {
                                    const existingOp = current.find(c => c.registration === newOp.registration);
                                    return {
                                        ...newOp,
                                        documents: existingOp ? existingOp.documents : [],
                                        kpis: newOp.kpis || [],
                                        feedbacks: newOp.feedbacks || [],
                                        active: newOp.active ?? true
                                    };
                                });

                                if (JSON.stringify(current.map(o => ({ ...o, documents: [] }))) === JSON.stringify(mergedOps.map(o => ({ ...o, documents: [] })))) {
                                    return current;
                                }

                                return mergedOps;
                            });
                        }
                    });
            }
        }, 3600000); // 60 minutes (was 30 minutes)

        return () => {
            if (channel) supabase?.removeChannel(channel);
            clearInterval(intervalId);
        };
    }, [supabase, user, loadData]);

    const handleUpdateGoals = async (newGoals: TeamGoals) => {
        setGoals(newGoals);
        if (supabase && isAdmin) {
            await supabase.from('config').upsert({ key: 'metas', value: newGoals });
        }
    };

    return { operators, setOperators, goals, isDataLoading, systemError, handleUpdateGoals, loadData };
};
