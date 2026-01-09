
export enum Role {
  SUPERVISOR = 'Supervisor',
  OPERATOR = 'Operador'
}

export enum WorkMode {
  PRESENTIAL = 'Presencial',
  HOME_OFFICE = 'Home Office'
}

export enum LinkType {
  EFETIVO = 'Efetivo',
  TEMPORARIO = 'Temporário',
  APRENDIZ = 'Aprendiz'
}

export interface KPI {
  id: string;
  month: string; // YYYY-MM
  tma: string | null; // hh:mm:ss ou null
  nps: number | null; // ou null
  monitoria: number | null; // ou null
  [key: string]: any;
}

export interface Feedback {
  id: string;
  date: string;
  supervisorId: string;
  supervisorName: string;
  comment: string;
  operatorResponse?: string;
  isRead?: boolean; // Novo campo para alertas visuais
  actionPlan?: string;
}

export interface Operator {
  user_id?: string; // Vínculo com auth.users.id
  registration: string; // Cadastro (Unique Key)
  name: string;
  admissionDate: string;
  role: string;
  linkType: LinkType;
  costCenter: string;
  workMode: WorkMode;
  birthDate: string;
  photoUrl?: string;
  active: boolean;
  kpis: KPI[];
  feedbacks: Feedback[];
  documents: Array<{ id: string; name: string; type: string; url: string; date: string }>;
}

export interface TeamGoals {
  tma: string;
  nps: number;
  monitoria: number;
}

export interface CloudConfig {
  url: string;
  key: string;
  enabled: boolean;
}