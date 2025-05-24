// src/application/dtos/notionDatabaseDTOs.ts

// DTOs for List Accessible Notion Databases API
export interface ListNotionDatabasesInput {
  integrationId: string;
  userId: string;
}

export interface NotionDatabaseOutputItem {
  id: string;
  name: string;
}

export interface ListNotionDatabasesOutput extends Array<NotionDatabaseOutputItem> {}

// DTOs for Get Specific Notion Database Properties API
export interface GetNotionDatabasePropertiesInput {
  databaseId: string;
  userId: string;
  integrationId?: string; // Strongly recommended, will be treated as mandatory by use case
}

export interface NotionPropertyOption {
  id: string;
  name: string;
  color?: string;
}

export interface NotionPropertyOutputItem {
  id: string;
  name: string;
  type: string;
  options?: NotionPropertyOption[];
}

export interface GetNotionDatabasePropertiesOutput extends Array<NotionPropertyOutputItem> {}
