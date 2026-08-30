export interface AuditEventEntity {
  id: string;
  timestamp: string;
  organizationId: string;
  actorUserId: string;
  action: string;
  module: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details?: string;
}

export interface AuditRepository {
  log(event: AuditEventEntity): Promise<void>;
  findByOrganization(organizationId: string, limit?: number): Promise<AuditEventEntity[]>;
  findAll(limit?: number): Promise<AuditEventEntity[]>;
}
