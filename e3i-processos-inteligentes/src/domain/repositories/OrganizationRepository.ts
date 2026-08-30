export interface OrganizationEntity {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  plan: 'Enterprise' | 'Professional' | 'Starter';
  usersCount: number;
  createdAt: string;
  updatedAt?: string;
  customLogoUrl?: string;
  settings?: any;
}

export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>;
  findAll(): Promise<OrganizationEntity[]>;
  save(org: OrganizationEntity): Promise<void>;
  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void>;
}
