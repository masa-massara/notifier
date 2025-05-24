import { Firestore, CollectionReference, DocumentData } from '@google-cloud/firestore';
import { UserNotionIntegration } from '../../../domain/entities/userNotionIntegration';
import { UserNotionIntegrationRepository } from '../../../domain/repositories/userNotionIntegrationRepository';

export class FirestoreUserNotionIntegrationRepository implements UserNotionIntegrationRepository {
  private readonly collection: CollectionReference;

  constructor(firestore: Firestore) {
    this.collection = firestore.collection('userNotionIntegrations');
  }

  async save(integration: UserNotionIntegration): Promise<void> {
    const data = {
      id: integration.id,
      userId: integration.userId,
      integrationName: integration.integrationName,
      notionIntegrationToken: integration.notionIntegrationToken, // Stored encrypted
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
    await this.collection.doc(integration.id).set(data);
  }

  async findById(id: string, userId: string): Promise<UserNotionIntegration | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as DocumentData;
    if (data.userId !== userId) { // Ensure the integration belongs to the user
      return null;
    }
    return new UserNotionIntegration(
      data.userId,
      data.integrationName,
      data.notionIntegrationToken,
      data.id,
      data.createdAt.toDate(),
      data.updatedAt.toDate()
    );
  }

  async findAllByUserId(userId: string): Promise<UserNotionIntegration[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return new UserNotionIntegration(
        data.userId,
        data.integrationName,
        data.notionIntegrationToken,
        data.id,
        data.createdAt.toDate(),
        data.updatedAt.toDate()
      );
    });
  }

  async deleteById(id: string, userId: string): Promise<void> {
    // Optional: Verify userId before deleting to ensure user owns this integration
    const integration = await this.findById(id, userId);
    if (!integration) {
      // Or throw an error indicating not found or not authorized
      console.warn(`Integration with id ${id} not found for user ${userId} or user is not authorized to delete.`);
      return;
    }
    await this.collection.doc(id).delete();
  }
}
