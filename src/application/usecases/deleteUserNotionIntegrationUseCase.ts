import { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';

export interface DeleteUserNotionIntegrationInput {
  integrationId: string;
  userId: string;
}

export class DeleteUserNotionIntegrationUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository,
  ) {}

  async execute(input: DeleteUserNotionIntegrationInput): Promise<void> {
    await this.userNotionIntegrationRepository.deleteById(input.integrationId, input.userId);
  }
}
