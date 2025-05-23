import { UserNotionIntegration } from '../../domain/entities/userNotionIntegration';
import { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';

export interface ListUserNotionIntegrationsInput {
  userId: string;
}

export type ListUserNotionIntegrationsOutput = Array<{
  id: string;
  integrationName: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export class ListUserNotionIntegrationsUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository,
  ) {}

  async execute(input: ListUserNotionIntegrationsInput): Promise<ListUserNotionIntegrationsOutput> {
    const integrations = await this.userNotionIntegrationRepository.findAllByUserId(input.userId);

    return integrations.map(integration => ({
      id: integration.id,
      integrationName: integration.integrationName,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    }));
  }
}
