import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { Operator, TeamGoals } from './types';
import { INITIAL_OPERATORS, GOALS as INITIAL_GOALS } from './constants';

const LIGHT_COLS = 'user_id, registration, name, admissionDate, role, linkType, costCenter, classification, workMode, birthDate, photoUrl, active, kpis, feedbacks';
const ULTRA_LIGHT_COLS = 'user_id, registration, name, admissionDate, role, linkType, costCenter, classification, workMode, birthDate, active, kpis, feedbacks';

// Mapeamento de auto-recuperação de vínculos Auth (user_id) conhecidos que ficaram desvinculados no banco
const KNOWN_AUTH_USER_IDS: Record<string, string> = {
    '55941': '7c43af32-8536-4991-be0c-6af2baa7a42f',
    '55732': '437b92f3-a017-4476-9d55-d4983fec4507',
    '56735': 'e4ec700d-8375-4c7e-a3b0-f295d366485b',
    '19439': 'a4acd4f1-ed7a-44a3-85d3-c1d1de2e24cb',
    '56325': '94878222-66fa-47d8-93ca-f4f9f17b5cfc',
    '56476': '16bd66dd-640a-4e51-b8b1-4936888c86b0',
};

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
            // 1. Consulta otimizada sem a coluna pesada 'documents' (carregada sob demanda no detalhe do operador)
            let { data: opsData, error: opsError } = await supabase
                .from('operators')
                .select(LIGHT_COLS)
                .order('name');

            // 2. Fallback ultra-leve sem 'photoUrl' caso alguma foto Base64 grande cause timeout na rede
            let usedUltraLight = false;
            if (opsError && opsError.code !== '42P17') {
                console.warn('[useOperatorsData] Falha na consulta padrão, tentando consulta ultra-leve sem fotos:', opsError.message);
                const retry = await supabase
                    .from('operators')
                    .select(ULTRA_LIGHT_COLS)
                    .order('name');
                opsData = retry.data as any;
                opsError = retry.error;
                usedUltraLight = !retry.error && !!retry.data;
            }

            let loadedOps: Operator[] = [];

            if (!opsError && opsData) {
                loadedOps = opsData.map((op: any) => {
                    const cleanReg = String(op.registration || '').trim();
                    const knownUserId = KNOWN_AUTH_USER_IDS[cleanReg];
                    const resolvedUserId = knownUserId || op.user_id;

                    // Se for Supervisor e o vínculo user_id no banco estava nulo/desatualizado, corrige silenciosamente no Supabase
                    if (isAdmin && knownUserId && op.user_id !== knownUserId) {
                        supabase
                            .from('operators')
                            .update({ user_id: knownUserId })
                            .eq('registration', cleanReg)
                            .then(({ error }) => {
                                if (!error) {
                                    console.log(`[useOperatorsData] Self-healing: user_id vinculado para matrícula ${cleanReg}`);
                                }
                            });
                    }

                    return {
                        ...op,
                        user_id: resolvedUserId,
                        registration: cleanReg,
                        name: String(op.name || '').trim(),
                        kpis: Array.isArray(op.kpis) ? op.kpis : [],
                        feedbacks: Array.isArray(op.feedbacks) ? op.feedbacks : [],
                        documents: Array.isArray(op.documents) ? op.documents : [],
                        active: op.active ?? true
                    };
                });
            }

            if ((!loadedOps || loadedOps.length === 0) && userProfile && !isAdmin) {
                loadedOps = [{
                    ...userProfile,
                    registration: String(userProfile.registration || '').trim(),
                    kpis: Array.isArray(userProfile.kpis) ? userProfile.kpis : [],
                    feedbacks: Array.isArray(userProfile.feedbacks) ? userProfile.feedbacks : [],
                    documents: Array.isArray(userProfile.documents) ? userProfile.documents : [],
                    active: userProfile.active ?? true
                }];
            }

            if (loadedOps.length > 0) {
                setOperators(current => {
                    const merged = loadedOps.map(op => {
                        const existing = current.find(c => String(c.registration).trim() === op.registration);
                        return {
                            ...op,
                            photoUrl: op.photoUrl !== undefined ? op.photoUrl : existing?.photoUrl,
                            documents: (op.documents && op.documents.length > 0)
                                ? op.documents
                                : (existing?.documents || [])
                        };
                    });

                    if (JSON.stringify(current) === JSON.stringify(merged)) {
                        return current;
                    }
                    return merged;
                });

                // Se usamos o fallback sem fotos, busca as fotos individualmente em background
                if (usedUltraLight) {
                    loadedOps.forEach(op => {
                        supabase
                            .from('operators')
                            .select('registration, photoUrl')
                            .eq('registration', op.registration)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (data?.photoUrl) {
                                    setOperators(prev => prev.map(item =>
                                        String(item.registration).trim() === String(data.registration).trim()
                                            ? { ...item, photoUrl: data.photoUrl }
                                            : item
                                    ));
                                }
                            });
                    });
                }
            } else if (opsError) {
                if (opsError?.code === '42P17') {
                    setSystemError({
                        title: "Erro Crítico: Recursão Infinita (RLS)",
                        msg: "A política de segurança do banco entrou em loop infinito.",
                        fix: `-- SOLUÇÃO COMPLETA ...`
                    });
                } else {
                    setOperators(current => current.length > 0 ? current : INITIAL_OPERATORS);
                }
            }

            const { data: goalsData } = await supabase
                .from('config')
                .select('value')
                .eq('key', 'metas')
                .maybeSingle();

            if (goalsData?.value) {
                setGoals(goalsData.value);
            }

        } catch (err) {
            console.error("Falha no carregamento:", err);
            setOperators(current => current.length > 0 ? current : (userProfile && !isAdmin ? [userProfile] : INITIAL_OPERATORS));
        } finally {
            setIsDataLoading(false);
        }
    }, [supabase, user, userProfile, isAdmin]);

    useEffect(() => {
        loadData();

        let channel: any;
        if (supabase && user) {
            // OTIMIZAÇÃO: Handlers específicos para cada tipo de evento
            // Isso reduz a carga no servidor Supabase, pois não precisa processar evento genérico '*'

            const handleInsertOrUpdate = (payload: any) => {
                const newRecord = payload.new;
                if (!newRecord) return;
                const cleanReg = String(newRecord.registration || '').trim();

                setOperators(prev => {
                    const exists = prev.some(op => String(op.registration).trim() === cleanReg);
                    const existingOp = prev.find(op => String(op.registration).trim() === cleanReg);

                    // Preservar documentos e foto locais se o payload vier sem eles
                    const sanitizedOp = {
                        ...newRecord,
                        registration: cleanReg,
                        photoUrl: newRecord.photoUrl !== undefined ? newRecord.photoUrl : existingOp?.photoUrl,
                        kpis: Array.isArray(newRecord.kpis) ? newRecord.kpis : (existingOp?.kpis || []),
                        feedbacks: Array.isArray(newRecord.feedbacks) ? newRecord.feedbacks : (existingOp?.feedbacks || []),
                        documents: Array.isArray(newRecord.documents) ? newRecord.documents : (existingOp?.documents || []),
                        active: newRecord.active ?? true
                    };

                    if (exists) {
                        return prev.map(op => String(op.registration).trim() === cleanReg ? sanitizedOp : op);
                    } else {
                        return [...prev, sanitizedOp].sort((a, b) => a.name.localeCompare(b.name));
                    }
                });
            };

            const handleDelete = (payload: any) => {
                if (payload.old) {
                    const cleanReg = String(payload.old.registration || '').trim();
                    setOperators(prev => prev.filter(op => String(op.registration).trim() !== cleanReg));
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
