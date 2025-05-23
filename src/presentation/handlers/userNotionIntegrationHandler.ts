import { Context } from 'hono';
import { CreateUserNotionIntegrationUseCase } from '../../application/usecases/createUserNotionIntegrationUseCase';
import { ListUserNotionIntegrationsUseCase } from '../../application/usecases/listUserNotionIntegrationsUseCase';
import { DeleteUserNotionIntegrationUseCase } from '../../application/usecases/deleteUserNotionIntegrationUseCase';
import { CreateUserNotionIntegrationInput, DeleteUserNotionIntegrationInput } from '../../application/dtos/userNotionIntegrationDTOs';
import { HTTPException } from 'hono/http-exception';

// Assuming c.var.user.id is populated by an auth middleware
interface AuthenticatedContext extends Context {
  var: {
    user: {
      id: string;
    };
  };
}

export function createUserNotionIntegrationHandlers(
  createUseCase: CreateUserNotionIntegrationUseCase,
  listUseCase: ListUserNotionIntegrationsUseCase,
  deleteUseCase: DeleteUserNotionIntegrationUseCase
) {
  const createIntegrationHandler = async (c: AuthenticatedContext) => {
    try {
      const { integrationName, notionIntegrationToken } = await c.req.json<{ integrationName: string; notionIntegrationToken: string }>();
      const userId = c.var.user.id;

      if (!integrationName || !notionIntegrationToken) {
        throw new HTTPException(400, { message: 'integrationName and notionIntegrationToken are required' });
      }

      const input: CreateUserNotionIntegrationInput = {
        userId,
        integrationName,
        notionIntegrationToken,
      };

      const output = await createUseCase.execute(input);
      return c.json(output, 201);
    } catch (error: any) {
      console.error('Error in createIntegrationHandler:', error);
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: 'Failed to create Notion integration', cause: error });
    }
  };

  const listIntegrationsHandler = async (c: AuthenticatedContext) => {
    try {
      const userId = c.var.user.id;
      const output = await listUseCase.execute({ userId });
      return c.json(output, 200);
    } catch (error: any) {
      console.error('Error in listIntegrationsHandler:', error);
      throw new HTTPException(500, { message: 'Failed to list Notion integrations', cause: error });
    }
  };

  const deleteIntegrationHandler = async (c: AuthenticatedContext) => {
    try {
      const integrationId = c.req.param('integrationId');
      const userId = c.var.user.id;

      if (!integrationId) {
        throw new HTTPException(400, { message: 'integrationId path parameter is required' });
      }

      const input: DeleteUserNotionIntegrationInput = {
        integrationId,
        userId,
      };

      const result = await deleteUseCase.execute(input);

      if (!result.success) {
        throw new HTTPException(404, { message: result.message || `Notion integration with ID ${integrationId} not found.` });
      }
      // Consider 204 No Content for successful deletions where no body is returned.
      // If returning a body (like a success message), 200 OK is appropriate.
      return c.json({ message: result.message }, 200); 
    } catch (error: any) {
      console.error('Error in deleteIntegrationHandler:', error);
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: 'Failed to delete Notion integration', cause: error });
    }
  };

  return {
    createIntegrationHandler,
    listIntegrationsHandler,
    deleteIntegrationHandler,
  };
}
