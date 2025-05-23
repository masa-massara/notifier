import { UserNotionIntegration } from '../../domain/entities/userNotionIntegration';
import { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';
import { EncryptionService } from '../../domain/services/encryptionService';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserNotionIntegrationInput {
  userId: string;
  integrationName: string;
  notionIntegrationToken: string;
}

export interface CreateUserNotionIntegrationOutput {
  id: string;
  integrationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateUserNotionIntegrationUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(input: CreateUserNotionIntegrationInput): Promise<CreateUserNotionIntegrationOutput> {
    const id = uuidv4();
    const encryptedToken = await this.encryptionService.encrypt(input.notionIntegrationToken);

    const newIntegration = new UserNotionIntegration(
      id,
      input.userId,
      input.integrationName,
      encryptedToken, // Store the encrypted token
    );

    await this.userNotionIntegrationRepository.save(newIntegration);

    return {
      id: newIntegration.id,
      integrationName: newIntegration.integrationName,
      createdAt: newIntegration.createdAt,
      updatedAt: newIntegration.updatedAt,
    };
  }
}
