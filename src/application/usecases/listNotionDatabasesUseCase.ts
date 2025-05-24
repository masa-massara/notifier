// src/application/usecases/listNotionDatabasesUseCase.ts
import type { UserNotionIntegrationRepository } from '../../domain/repositories/userNotionIntegrationRepository';
import type { EncryptionService } from '../services/encryptionService';
import type { NotionApiService } from '../../domain/services/notionApiService';
import type { ListNotionDatabasesInput, ListNotionDatabasesOutput, NotionDatabaseOutputItem } from '../dtos/notionDatabaseDTOs';
import { HTTPException } from 'hono/http-exception';

export class ListNotionDatabasesUseCase {
  constructor(
    private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository,
    private readonly encryptionService: EncryptionService,
    private readonly notionApiService: NotionApiService,
  ) {}

  async execute(input: ListNotionDatabasesInput): Promise<ListNotionDatabasesOutput> {
    const { integrationId, userId } = input;

    // 1. Fetch UserNotionIntegration
    const integration = await this.userNotionIntegrationRepository.findById(integrationId, userId);
    if (!integration) {
      // Standard practice is to throw an error that the presentation layer can interpret.
      // Hono's HTTPException is suitable here.
      throw new HTTPException(404, { 
        message: `Notion integration with ID ${integrationId} not found or not accessible by user.`,
        cause: 'UserNotionIntegrationNotFound' 
      });
    }

    // 2. Decrypt notionIntegrationToken
    let decryptedToken: string;
    try {
      // Corrected property name based on src/domain/entities/userNotionIntegration.ts
      decryptedToken = await this.encryptionService.decrypt(integration.notionIntegrationToken); 
    } catch (error) {
      console.error(`Failed to decrypt token for integration ID ${integrationId}:`, error);
      throw new HTTPException(500, { 
        message: 'Failed to decrypt Notion integration token.',
        cause: 'DecryptionError'
      });
    }

    // 3. Call notionApiService.listAccessibleDatabases()
    try {
      const accessibleDatabases = await this.notionApiService.listAccessibleDatabases(decryptedToken);
      
      // 4. Map to ListNotionDatabasesOutput
      const output: ListNotionDatabasesOutput = accessibleDatabases.map(db => ({
        id: db.id,
        name: db.name,
      }));
      
      return output;
    } catch (error: any) {
      // Log the error from Notion API service
      console.error(`Error fetching accessible databases from Notion API for integration ID ${integrationId}:`, error);
      // Check if it's an HTTPException from a deeper layer (like NotionApiClient if it threw one)
      if (error instanceof HTTPException) {
        throw error;
      }
      // Otherwise, wrap it in a generic 500 error
      throw new HTTPException(500, { 
        message: 'An error occurred while fetching accessible databases from Notion.',
        cause: error.message || 'NotionApiError'
      });
    }
  }
}
