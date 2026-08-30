export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  systemRole?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  save(user: UserEntity): Promise<void>;
  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'PENDING'): Promise<void>;
}
