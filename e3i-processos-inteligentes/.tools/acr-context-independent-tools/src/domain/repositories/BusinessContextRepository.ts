export interface BusinessContextEntity {
  id: string;
  organizationId: string;
  data: any;
  updatedAt: string;
}

export interface BusinessContextRepository {
  findByOrganizationId(organizationId: string): Promise<BusinessContextEntity | null>;
  save(context: BusinessContextEntity): Promise<void>;
}
