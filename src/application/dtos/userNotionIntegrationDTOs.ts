// --- CreateUserNotionIntegration DTOs ---
export interface CreateUserNotionIntegrationInput {
  integrationName: string;
  notionIntegrationToken: string;
  userId: string; // Typically from authenticated user context
}

export interface CreateUserNotionIntegrationOutput {
  id: string;
  integrationName: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- ListUserNotionIntegrations DTOs ---
export interface ListUserNotionIntegrationsInput {
  userId: string; // Typically from authenticated user context
}

export interface ListUserNotionIntegrationsOutputItem {
  id: string;
  integrationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ListUserNotionIntegrationsOutput = ListUserNotionIntegrationsOutputItem[];

// --- DeleteUserNotionIntegration DTOs ---
export interface DeleteUserNotionIntegrationInput {
  integrationId: string;
  userId: string; // Typically from authenticated user context
}

// Output can be a simple success message or void, so no specific interface for now.
// For example, a successful deletion might return a 204 No Content HTTP status.
export interface DeleteUserNotionIntegrationOutput {
  success: boolean;
  message?: string;
}
