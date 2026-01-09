
import { LinkType, WorkMode, Operator } from './types';

export const INITIAL_OPERATORS: Operator[] = [
  { registration: '19195', name: 'Sabrina Brito De Carvalho', admissionDate: '05/10/2024', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.HOME_OFFICE, birthDate: '09/08/1986', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19186', name: 'Vera Lucia V. Garroni Dos Santos', admissionDate: '05/10/2024', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.HOME_OFFICE, birthDate: '21/05/1986', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19191', name: 'Taise Cristina Da Conceição Alcantara', admissionDate: '05/10/2024', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.HOME_OFFICE, birthDate: '22/08/1976', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19439', name: 'Francisco Alexandre Morais Junior', admissionDate: '13/10/2025', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '04/05/1993', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19453', name: 'Gustavo Seevald Weyne Marques', admissionDate: '07/11/2025', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.HOME_OFFICE, birthDate: '24/12/1995', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19336', name: 'Lucas Rafael Aires Da Silva', admissionDate: '07/04/2025', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '23/07/1998', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '19454', name: 'Wagner Gonçalves', admissionDate: '07/11/2025', role: 'Op. Receptivo 1', linkType: LinkType.EFETIVO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '10/09/1983', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '55615', name: 'Andrize Martins Da Silva', admissionDate: '04/04/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '25/09/1980', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56325', name: 'Benjamin Pietro Arrelias Lisboa', admissionDate: '18/08/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '18/02/1996', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56476', name: 'Kleiton Ferraz De Souza', admissionDate: '26/09/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '21/10/1985', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56714', name: 'Maike Dos Santos Almeida', admissionDate: '03/11/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '19/07/1991', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56322', name: 'Marcelly Ribeiro Martins', admissionDate: '18/08/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '19/06/2003', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '55941', name: 'Maria Eduarda Rocha Da Silva', admissionDate: '02/06/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '09/12/1997', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '55732', name: 'Marilia De Souza Maciel', admissionDate: '23/04/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '18/03/2002', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56982', name: 'Patricia Dos Santos Boeira', admissionDate: '08/06/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '23/07/1986', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56725', name: 'Sabrina Araujo Mendes Fortes', admissionDate: '03/11/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '18/02/1997', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56735', name: 'Shaiana Meireles De Souza', admissionDate: '23/04/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '23/11/1989', active: true, kpis: [], feedbacks: [], documents: [] },
  { registration: '56323', name: 'Tania Cristina Machado Flores', admissionDate: '18/08/2025', role: 'Op. Receptivo 1', linkType: LinkType.TEMPORARIO, costCenter: 'CENTRAL 156', workMode: WorkMode.PRESENTIAL, birthDate: '04/10/1971', active: true, kpis: [], feedbacks: [], documents: [] },
];

export const GOALS = {
  tma: '00:04:30',
  nps: 75,
  monitoria: 85
};

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
