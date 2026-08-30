export interface SessionEntity {
  id: string;
  userId: string;
  currentOrganizationId?: string;
  currentMembershipId?: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface SessionRepository {
  findById(id: string): Promise<SessionEntity | null>;
  findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  save(session: SessionEntity): Promise<void>;
  revoke(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
