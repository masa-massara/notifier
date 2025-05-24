// src/infrastructure/persistence/firestore/firestoreTemplateRepository.ts
import { Template } from "../../../domain/entities/template";
import type { TemplateRepository } from "../../../domain/repositories/templateRepository";
// initializeApp, cert, getApps は main.ts で一元管理するのでここでは不要
import {
	getFirestore,
	type Firestore,
	type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

// Firestoreのコレクション名
const TEMPLATES_COLLECTION = "templates";

export class FirestoreTemplateRepository implements TemplateRepository {
	private db: Firestore;

	constructor() {
		// Firebase Admin SDKの初期化はmain.tsで行うため、ここでは呼び出さない
		this.db = getFirestore();
		console.log(
			"FirestoreTemplateRepository instance created, using centrally initialized Firebase Admin SDK.",
		);
	}

	async save(template: Template): Promise<void> {
		const docRef = this.db.collection(TEMPLATES_COLLECTION).doc(template.id);
		await docRef.set({
			id: template.id,
			name: template.name,
			notionDatabaseId: template.notionDatabaseId,
			body: template.body,
			conditions: template.conditions,
			destinationId: template.destinationId,
			userId: template.userId,
			userNotionIntegrationId: template.userNotionIntegrationId || null, // Save, ensuring null if undefined
			createdAt: template.createdAt,
			updatedAt: template.updatedAt,
		});
		console.log(
			`Template saved to Firestore with ID: ${template.id} for user ${template.userId}`,
		);
	}

	async findById(id: string, userId: string): Promise<Template | null> {
		console.log(
			`Firestore: Attempting to find template with ID: ${id} for user ${userId}`,
		);
		const docRef = this.db.collection(TEMPLATES_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.log(`Firestore: Template with ID: ${id} not found.`);
			return null;
		}

		const data = docSnap.data();
		if (!data) return null;

		if (data.userId !== userId) {
			console.warn(
				`Firestore: Template with ID: ${id} found, but does not belong to user ${userId}.`,
			);
			return null;
		}

		console.log(
			`Firestore: Found data for ID ${id} owned by user ${userId}:`,
			data,
		);
		return new Template(
			data.id,
			data.name,
			data.notionDatabaseId,
			data.body,
			data.conditions,
			data.destinationId,
			data.userId,
			data.userNotionIntegrationId || null, // Populate, defaulting to null
			data.createdAt.toDate
				? data.createdAt.toDate()
				: new Date(data.createdAt),
			data.updatedAt.toDate
				? data.updatedAt.toDate()
				: new Date(data.updatedAt),
		);
	}

	async findByNotionDatabaseId(
		notionDatabaseId: string,
		userId: string,
	): Promise<Template[]> {
		console.log(
			`Firestore: Finding templates by notionDatabaseId: ${notionDatabaseId} for user ${userId}`,
		);
		const snapshot = await this.db
			.collection(TEMPLATES_COLLECTION)
			.where("notionDatabaseId", "==", notionDatabaseId)
			.where("userId", "==", userId)
			.get();

		if (snapshot.empty) {
			return [];
		}

		return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
			const data = doc.data();
			return new Template(
				data.id,
				data.name,
				data.notionDatabaseId,
				data.body,
				data.conditions,
				data.destinationId,
				data.userId,
			data.userNotionIntegrationId || null, // Populate, defaulting to null
				data.createdAt.toDate
					? data.createdAt.toDate()
					: new Date(data.createdAt),
				data.updatedAt.toDate
					? data.updatedAt.toDate()
					: new Date(data.updatedAt),
			);
		});
	}

	// ★★★ 新しいメソッドの実装を追加 ★★★
	async findAllByNotionDatabaseId(
		notionDatabaseId: string,
	): Promise<Template[]> {
		console.log(
			`Firestore: Finding all templates by notionDatabaseId: ${notionDatabaseId} (regardless of user)`,
		);
		const snapshot = await this.db
			.collection(TEMPLATES_COLLECTION)
			.where("notionDatabaseId", "==", notionDatabaseId) // notionDatabaseIdのみでフィルタリング
			.get();

		if (snapshot.empty) {
			console.log(
				`Firestore: No templates found for notionDatabaseId: ${notionDatabaseId}.`,
			);
			return [];
		}

		console.log(
			`Firestore: Found ${snapshot.docs.length} template documents for notionDatabaseId: ${notionDatabaseId}. Starting mapping...`,
		);
		const templates: Template[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			try {
				// Webhook処理では、取得したテンプレートのuserIdも重要になるので、正しくマッピングする
				if (!data.userId) {
					console.warn(
						`Firestore: Document ID ${doc.id} is missing userId. Skipping.`,
					);
					continue;
				}
				const template = new Template(
					data.id as string,
					data.name as string,
					data.notionDatabaseId as string,
					data.body as string,
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					data.conditions as any,
					data.destinationId as string,
					data.userId as string, // userIdをマッピング
					data.userNotionIntegrationId || null, // Populate, defaulting to null
					data.createdAt?.toDate
						? data.createdAt.toDate()
						: new Date(data.createdAt),
					data.updatedAt?.toDate
						? data.updatedAt.toDate()
						: new Date(data.updatedAt),
				);
				templates.push(template);
			} catch (error) {
				console.error(
					`Firestore: Error mapping document ID: ${doc.id}, Data:`,
					JSON.stringify(data, null, 2),
					"Error:",
					error,
				);
			}
		}
		console.log(
			`Firestore: Finished mapping. Total mapped templates for notionDatabaseId ${notionDatabaseId}: ${templates.length}`,
		);
		return templates;
	}
	// ★★★ ここまで追加 ★★★

	async deleteById(id: string, userId: string): Promise<void> {
		console.log(
			`Firestore: Attempting to delete template with ID: ${id} for user ${userId}`,
		);
		const docRef = this.db.collection(TEMPLATES_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.warn(
				`Firestore: Template with ID: ${id} not found. Cannot delete.`,
			);
			return;
		}

		const data = docSnap.data();
		if (!data || data.userId !== userId) {
			console.warn(
				`Firestore: Template with ID: ${id} does not belong to user ${userId}. Cannot delete.`,
			);
			return;
		}

		await docRef.delete();
		console.log(
			`Template with ID: ${id} for user ${userId} deleted from Firestore.`,
		);
	}

	async findAll(userId: string): Promise<Template[]> {
		console.log(
			`Firestore: Attempting to find all templates for user ${userId}...`,
		);
		const snapshot = await this.db
			.collection(TEMPLATES_COLLECTION)
			.where("userId", "==", userId)
			.get();

		if (snapshot.empty) {
			console.log(
				`Firestore: No templates found in collection for user ${userId}.`,
			);
			return [];
		}

		console.log(
			`Firestore: Found ${snapshot.docs.length} template documents for user ${userId}. Starting mapping...`,
		);
		const templates: Template[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			try {
				const template = new Template(
					data.id as string,
					data.name as string,
					data.notionDatabaseId as string,
					data.body as string,
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					data.conditions as any,
					data.destinationId as string,
					data.userId as string,
					data.userNotionIntegrationId || null, // Populate, defaulting to null
					data.createdAt?.toDate
						? data.createdAt.toDate()
						: new Date(data.createdAt),
					data.updatedAt?.toDate
						? data.updatedAt.toDate()
						: new Date(data.updatedAt),
				);
				templates.push(template);
			} catch (error) {
				console.error(
					`Firestore: Error mapping document ID: ${doc.id}, Data:`,
					JSON.stringify(data, null, 2),
					"Error:",
					error,
				);
			}
		}
		console.log(
			`Firestore: Finished mapping. Total mapped templates for user ${userId}: ${templates.length}`,
		);
		return templates;
	}
}
