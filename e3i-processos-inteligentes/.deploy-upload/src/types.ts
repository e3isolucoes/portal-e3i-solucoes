export type UserRole = 'E3I_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  avatar?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  lastLogin?: string;
  mustChangePassword?: boolean;
}

export interface OrganizationSettings {
  legalName: string;
  tradingName: string;
  document: string;
  segment: string;
  size: string;
  employeeCount: number;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  language: string;
  currency: string;
  status: string;
}

export interface BrandingSettings {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  lightMode: boolean;
  darkMode: boolean;
  productName: string;
}

export interface Tenant {
  id: string;
  name: string; // "Nome da Empresa" (idiot-proof)
  tradeName: string; // Nome fantasia
  document: string; // CNPJ formatado
  plan: 'Enterprise' | 'Professional' | 'Starter';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  usersCount: number;
  createdAt: string;
  customLogoUrl?: string;
  settings?: OrganizationSettings;
  branding?: BrandingSettings;
  toolAccess?: string[];
}

export interface ClientTool {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  granted: boolean;
  internal?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  roles: UserRole[];
}

export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  horizon: string;
  owner?: string;
  indicatorId?: string;
  confidence: number;
  source: string;
  status: 'INFERRED' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';
}

export interface StrategicPriority {
  id: string;
  title: string;
  level: 'Alta' | 'Média' | 'Baixa';
  order: number;
}

export interface StrategicIndicator {
  id: string;
  name: string;
  target?: string;
  current?: string;
  objectiveId?: string;
  isMissing: boolean;
  isSuggestion: boolean;
  status: 'CONFIRMED' | 'SUGGESTION' | 'NEEDS_REVIEW';
}

export interface ValueChainStep {
  step: string;
  description: string;
  source: string;
}

export interface StrategicRisk {
  id: string;
  category: 'estratégico' | 'operacional' | 'financeiro' | 'comercial' | 'pessoas' | 'tecnologia' | 'compliance';
  description: string;
  origin: string;
  estimatedImpact: string;
  confidence: number;
  status: 'CONFIRMED' | 'INFERRED' | 'NEEDS_REVIEW';
}

export interface StrategicHypothesis {
  id: string;
  statement: string;
  confidence: number;
  status: 'ACTIVE' | 'CONFIRMED' | 'REJECTED';
}

export interface StrategicGap {
  id: string;
  description: string;
  element: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StrategicAlignment {
  objectiveId: string;
  area: string;
  macroprocess: string;
  indicatorId?: string;
  hasGap: boolean;
}

export interface StrategyCanvas {
  id: string;
  tenantId: string;
  version: string;
  direction: {
    mission?: string;
    vision?: string;
    mainObjective: string;
    horizon: string;
    focus: string;
    isSuggestion: boolean;
    status: 'CONFIRMED' | 'SUGGESTION' | 'NEEDS_REVIEW';
  };
  objectives: StrategicObjective[];
  priorities: StrategicPriority[];
  indicators: StrategicIndicator[];
  valueChain: ValueChainStep[];
  risks: StrategicRisk[];
  hypotheses: StrategicHypothesis[];
  gaps: StrategicGap[];
  alignments: StrategicAlignment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationArea {
  id: string;
  nome: string;
  objetivo: string;
  responsavel: string;
  parentAreaId?: string | null;
  status: string;
  confidence: number;
  source: string;
  validationStatus: 'INFERRED' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';
}

export interface OrganizationalRole {
  id: string;
  nome: string;
  area: string;
  responsabilidades: string[];
  nivel: 'Estratégico' | 'Tático' | 'Operacional';
  responsavelAtual: string;
  substituto?: string;
  criticidade: 'Alta' | 'Média' | 'Baixa';
  confidence: number;
  validationStatus: 'INFERRED' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';
}

export interface OrganizationalPerson {
  id: string;
  tenantId: string;
  nome: string;
  cargo: string;
  email: string;
  departamento: string;
  userId?: string | null;
  isUser: boolean;
  confidence: number;
}

export interface Responsibility {
  id: string;
  responsavel: string;
  responsabilidade: string;
  condicao?: string;
  confidence: number;
  validationStatus: 'INFERRED' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';
}

export interface ReportingRelationship {
  id: string;
  fromId: string;
  fromType: 'person' | 'role';
  toId: string;
  toType: 'person' | 'role';
  relationshipType: 'reportsTo' | 'coordinates' | 'supports' | 'approves' | 'replaces';
  status: string;
}

export interface OrganizationalDependency {
  id: string;
  fromType: 'person' | 'role' | 'area' | 'system';
  fromId: string;
  toType: 'person' | 'role' | 'area' | 'system';
  toId: string;
  dependencyType: 'person_person' | 'role_role' | 'area_area' | 'area_system' | 'role_system';
  description: string;
  confidence: number;
}

export interface OrganizationalGap {
  id: string;
  type: 'MISSING_RESPONSIBLE' | 'STRATEGIC_OBJECTIVE_WITHOUT_AREA' | 'CRITICAL_ROLE_WITHOUT_SUBSTITUTE' | 'OWNERLESS_RESPONSIBILITY' | 'OVERLAPPING_RESPONSIBILITY' | 'CONCENTRATED_DECISION' | 'INCOMPATIBLE_ROLE';
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'RESOLVED';
}

export interface OrganizationMap {
  id: string;
  tenantId: string;
  version: string;
  areas: OrganizationArea[];
  roles: OrganizationalRole[];
  people: OrganizationalPerson[];
  responsibilities: Responsibility[];
  reportingRelationships: ReportingRelationship[];
  dependencies: OrganizationalDependency[];
  gaps: OrganizationalGap[];
  updatedAt: string;
}
