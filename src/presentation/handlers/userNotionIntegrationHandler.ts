import { Context } from 'hono';
import {
  CreateUserNotionIntegrationUseCase,
  CreateUserNotionIntegrationInput,
  CreateUserNotionIntegrationOutput,
} from '../../application/usecases/createUserNotionIntegrationUseCase';
import {
  ListUserNotionIntegrationsUseCase,
  ListUserNotionIntegrationsInput,
  ListUserNotionIntegrationsOutput,
} from '../../application/usecases/listUserNotionIntegrationsUseCase';
import {
  DeleteUserNotionIntegrationUseCase,
  DeleteUserNotionIntegrationInput,
} from '../../application/usecases/deleteUserNotionIntegrationUseCase';

export function createUserNotionIntegrationHandlerFactory(
  useCase: CreateUserNotionIntegrationUseCase,
) {
  return async (c: Context) => {
    try {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { integrationName, notionIntegrationToken } = body;

      if (!integrationName || !notionIntegrationToken) {
        return c.json({ error: 'Missing integrationName or notionIntegrationToken' }, 400);
      }

      const input: CreateUserNotionIntegrationInput = {
        userId,
        integrationName,
        notionIntegrationToken,
      };

      const output = await useCase.execute(input);
      return c.json(output, 201);
    } catch (error: any) {
      console.error('Error creating Notion integration:', error);
      // Consider more specific error handling based on error types
      if (error.message && error.message.includes('environment variable')) {
         return c.json({ error: 'Server configuration error' }, 500);
      }
      return c.json({ error: 'Failed to create Notion integration' }, 500);
    }
  };
}

export function listUserNotionIntegrationsHandlerFactory(
  useCase: ListUserNotionIntegrationsUseCase,
) {
  return async (c: Context) => {
    try {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const input: ListUserNotionIntegrationsInput = { userId };
      const output = await useCase.execute(input);
      return c.json(output, 200);
    } catch (error: any) {
      console.error('Error listing Notion integrations:', error);
      return c.json({ error: 'Failed to list Notion integrations' }, 500);
    }
  };
}

export function deleteUserNotionIntegrationHandlerFactory(
  useCase: DeleteUserNotionIntegrationUseCase,
) {
  return async (c: Context) => {
    try {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const integrationId = c.req.param('integrationId');
      if (!integrationId) {
        return c.json({ error: 'Missing integrationId parameter' }, 400);
      }

      const input: DeleteUserNotionIntegrationInput = {
        userId,
        integrationId,
      };

      await useCase.execute(input);
      return c.body(null, 204);
    } catch (error: any) {
      console.error('Error deleting Notion integration:', error);
      // Consider specific error handling, e.g., if integration not found
      return c.json({ error: 'Failed to delete Notion integration' }, 500);
    }
  };
}
