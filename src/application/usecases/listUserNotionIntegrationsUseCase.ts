import { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';
import { ListUserNotionIntegrationsInput, ListUserNotionIntegrationsOutput, ListUserNotionIntegrationsOutputItem } from '../dtos/userNotionIntegrationDTOs';

export class ListUserNotionIntegrationsUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository
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
