export type MembershipRole = 'ORGANIZATION_ADMIN' | 'PROCESS_MANAGER' | 'VIEWER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'AUDITOR';

export interface OrganizationMembershipEntity {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  joinedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationMembershipRepository {
  findById(id: string): Promise<OrganizationMembershipEntity | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembershipEntity | null>;
  findByUserId(userId: string): Promise<OrganizationMembershipEntity[]>;
  findByOrganizationId(organizationId: string): Promise<OrganizationMembershipEntity[]>;
  save(membership: OrganizationMembershipEntity): Promise<void>;
  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void>;
}
