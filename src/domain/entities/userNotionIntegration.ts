import { v4 as uuidv4 } from 'uuid';

export class UserNotionIntegration {
  id: string;
  userId: string;
  integrationName: string;
  notionIntegrationToken: string; // This will be the encrypted string
  createdAt: Date;
  updatedAt: Date;

  constructor(
    userId: string,
    integrationName: string,
    notionIntegrationToken: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id || uuidv4();
    this.userId = userId;
    this.integrationName = integrationName;
    this.notionIntegrationToken = notionIntegrationToken;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  updateIntegrationName(newName: string): void {
    this.integrationName = newName;
    this.updatedAt = new Date();
  }

  updateNotionIntegrationToken(newToken: string): void {
    this.notionIntegrationToken = newToken;
    this.updatedAt = new Date();
  }
}
