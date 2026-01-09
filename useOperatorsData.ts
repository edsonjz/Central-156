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
                setOperators(loadedOps);
            } else if (opsError) {
                if (opsError?.code === '42P17') {
                    setSystemError({
                        title: "Erro Crítico: Recursão Infinita (RLS)",
                        msg: "A política de segurança do banco entrou em loop infinito.",
                        fix: `-- SOLUÇÃO COMPLETA ...` // Simplified for brevity in this hook
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
    }, [supabase, user, userProfile, isAdmin]);

    useEffect(() => {
        loadData();

        let channel: any;
        if (supabase && user) {
            channel = supabase
                .channel('operators-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, async (payload: any) => {
                    if (payload.eventType === 'DELETE' && payload.old) {
                        setOperators(prev => prev.filter(op => op.registration !== payload.old.registration));
                    } else if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
                        const reg = payload.new.registration;
                        const { data: freshOp } = await supabase.from('operators').select('*').eq('registration', reg).single();
                        if (freshOp) {
                            const sanitizedOp = { ...freshOp, kpis: freshOp.kpis || [], feedbacks: freshOp.feedbacks || [], documents: freshOp.documents || [], active: freshOp.active ?? true };
                            setOperators(prev => {
                                const exists = prev.some(op => op.registration === reg);
                                return exists ? prev.map(op => op.registration === reg ? sanitizedOp : op) : [...prev, sanitizedOp].sort((a, b) => a.name.localeCompare(b.name));
                            });
                        }
                    }
                })
                .subscribe();
        }

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible' && supabase) {
                supabase.from('operators').select('*').order('name').then(({ data }) => {
                    if (data) {
                        const loadedOps = data.map((op: any) => ({ ...op, kpis: op.kpis || [], feedbacks: op.feedbacks || [], documents: op.documents || [], active: op.active ?? true }));
                        setOperators(current => JSON.stringify(current) !== JSON.stringify(loadedOps) ? loadedOps : current);
                    }
                });
            }
        }, 10000); // Increased to 10s for better performance

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
