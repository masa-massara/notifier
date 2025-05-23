import {
  Firestore,
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  Timestamp, // Import Timestamp
} from 'firebase/firestore';
import { UserNotionIntegration } from '../../../../domain/entities/userNotionIntegration';
import { UserNotionIntegrationRepository } from '../../../../domain/repositories/userNotionIntegrationRepository';
import { EncryptionService } from '../../../../domain/services/encryptionService';

export class FirestoreUserNotionIntegrationRepository implements UserNotionIntegrationRepository {
  private readonly collectionName = 'userNotionIntegrations';
  private readonly db: Firestore;
  private readonly encryptionService: EncryptionService;

  constructor(db: Firestore, encryptionService: EncryptionService) {
    this.db = db;
    this.encryptionService = encryptionService;
  }

  async save(integration: UserNotionIntegration): Promise<void> {
    const encryptedToken = await this.encryptionService.encrypt(integration.encryptedNotionIntegrationToken);
    const integrationData = {
      id: integration.id,
      userId: integration.userId,
      integrationName: integration.integrationName,
      encryptedNotionIntegrationToken: encryptedToken,
      createdAt: Timestamp.fromDate(integration.createdAt),
      updatedAt: Timestamp.fromDate(integration.updatedAt),
    };
    const docRef = doc(this.db, this.collectionName, integration.id);
    await setDoc(docRef, integrationData);
  }

  async findById(id: string, userId: string): Promise<UserNotionIntegration | null> {
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    if (data.userId !== userId) {
      // Security: Prevent leaking information about existence to unauthorized users
      return null;
    }

    const decryptedToken = await this.encryptionService.decrypt(data.encryptedNotionIntegrationToken);
    return new UserNotionIntegration(
      data.id,
      data.userId,
      data.integrationName,
      decryptedToken,
      (data.createdAt as Timestamp).toDate(),
      (data.updatedAt as Timestamp).toDate(),
    );
  }

  async findAllByUserId(userId: string): Promise<UserNotionIntegration[]> {
    const q = query(collection(this.db, this.collectionName), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const integrations: UserNotionIntegration[] = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const decryptedToken = await this.encryptionService.decrypt(data.encryptedNotionIntegrationToken);
      integrations.push(
        new UserNotionIntegration(
          data.id,
          data.userId,
          data.integrationName,
          decryptedToken,
          (data.createdAt as Timestamp).toDate(),
          (data.updatedAt as Timestamp).toDate(),
        ),
      );
    }
    return integrations;
  }

  async deleteById(id: string, userId: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().userId === userId) {
      await deleteDoc(docRef);
    } else if (!docSnap.exists()) {
      // Document not found, operation can be considered successful (idempotency)
      return;
    } else {
      // Document exists but userId does not match.
      // Throw an error or handle as per security policy.
      // For now, we'll just return, preventing deletion.
      // Consider logging this attempt for security monitoring.
      console.warn(`Attempt to delete integration ${id} by unauthorized user ${userId}.`);
      // Or throw new Error('Not found or insufficient permissions');
      return;
    }
  }
}
