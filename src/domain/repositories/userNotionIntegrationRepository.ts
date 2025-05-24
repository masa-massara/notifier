import { UserNotionIntegration } from '../entities/userNotionIntegration';

export interface UserNotionIntegrationRepository {
  save(integration: UserNotionIntegration): Promise<void>;
  findById(id: string, userId: string): Promise<UserNotionIntegration | null>;
  findAllByUserId(userId: string): Promise<UserNotionIntegration[]>;
  deleteById(id: string, userId: string): Promise<void>;
}
