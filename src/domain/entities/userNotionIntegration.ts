export class UserNotionIntegration {
  public readonly id: string;
  public readonly userId: string;
  public readonly integrationName: string;
  public readonly encryptedNotionIntegrationToken: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    integrationName: string,
    encryptedNotionIntegrationToken: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.integrationName = integrationName;
    this.encryptedNotionIntegrationToken = encryptedNotionIntegrationToken;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }
}
