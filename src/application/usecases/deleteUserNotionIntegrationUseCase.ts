import { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';
import { DeleteUserNotionIntegrationInput, DeleteUserNotionIntegrationOutput } from '../dtos/userNotionIntegrationDTOs';

export class DeleteUserNotionIntegrationUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository
  ) {}

  async execute(input: DeleteUserNotionIntegrationInput): Promise<DeleteUserNotionIntegrationOutput> {
    const integration = await this.userNotionIntegrationRepository.findById(input.integrationId, input.userId);

    if (!integration) {
      return {
        success: false,
        message: `Notion integration with ID ${input.integrationId} not found or user does not have permission.`,
      };
    }

    await this.userNotionIntegrationRepository.deleteById(input.integrationId, input.userId);
    
    return {
      success: true,
      message: 'Notion integration deleted successfully.',
    };
  }
}
