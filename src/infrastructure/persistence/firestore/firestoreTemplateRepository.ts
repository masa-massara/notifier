// src/infrastructure/persistence/firestore/firestoreTemplateRepository.ts
import { Template, TemplateCondition } from "../../../domain/entities/template"; // Added TemplateCondition
import type { TemplateRepository } from "../../../domain/repositories/templateRepository";
import {
	type Firestore,
	type QueryDocumentSnapshot,
	collection, // Added
	query, // Added
	where, // Added
	getDocs, // Added
	doc, // Added for save, findById, deleteById
	setDoc, // Added for save
	getDoc, // Added for findById
	deleteDoc // Added for deleteById
} from "firebase-admin/firestore";

// Firestoreのコレクション名
const TEMPLATES_COLLECTION = "templates"; // Kept for consistency, but this.collectionName will be used

export class FirestoreTemplateRepository implements TemplateRepository {
	private db: Firestore;
	private readonly collectionName = TEMPLATES_COLLECTION; // Added

	constructor(db: Firestore) { // db passed in constructor
		this.db = db;
		console.log(
			"FirestoreTemplateRepository instance created with provided Firestore instance.",
		);
	}

	async save(template: Template): Promise<void> {
		const docRef = doc(this.db, this.collectionName, template.id); // Use doc()
		await setDoc(docRef, { // Use setDoc()
			id: template.id,
			name: template.name,
			notionDatabaseId: template.notionDatabaseId,
			body: template.body,
			conditions: template.conditions,
			destinationId: template.destinationId,
			userId: template.userId,
			userNotionIntegrationId: template.userNotionIntegrationId, // Added this field
			createdAt: template.createdAt, // Firestore will convert to Timestamp
			updatedAt: template.updatedAt, // Firestore will convert to Timestamp
		});
		console.log(
			`Template saved to Firestore with ID: ${template.id} for user ${template.userId}`,
		);
	}

	async findById(id: string, userId: string): Promise<Template | null> {
		console.log(
			`Firestore: Attempting to find template with ID: ${id} for user ${userId}`,
		);
		const docRef = doc(this.db, this.collectionName, id); // Use doc()
		const docSnap = await getDoc(docRef); // Use getDoc()

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
			// Firestore Timestamps are assumed to be converted to Date by the SDK or here
			data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
			data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
			data.userNotionIntegrationId || null // Add this new field
		);
	}

	async findByNotionDatabaseId(
		notionDatabaseId: string,
		userId: string,
	): Promise<Template[]> {
		console.log(
			`Firestore: Finding templates by notionDatabaseId: ${notionDatabaseId} for user ${userId}`,
		);
		const q = query( // Use query()
			collection(this.db, this.collectionName), // Use collection()
			where("notionDatabaseId", "==", notionDatabaseId),
			where("userId", "==", userId),
		);
		const querySnapshot = await getDocs(q); // Use getDocs()

		if (querySnapshot.empty) {
			return [];
		}

		return querySnapshot.docs.map((docSnap: QueryDocumentSnapshot) => { // Use docSnap
			const data = docSnap.data();
			// Ensure data.conditions is properly typed or cast
			const conditions = (data.conditions || []) as TemplateCondition[];
			return new Template(
				docSnap.id, // Use docSnap.id
				data.name,
				data.notionDatabaseId,
				data.body,
				conditions,
				data.destinationId,
				data.userId,
				data.createdAt?.toDate(),
				data.updatedAt?.toDate(),
				data.userNotionIntegrationId || null // Add this new field
			);
		});
	}

	async findAllByNotionDatabaseId(notionDatabaseId: string): Promise<Template[]> {
		const q = query(
			collection(this.db, this.collectionName),
			where("notionDatabaseId", "==", notionDatabaseId)
		);
		const querySnapshot = await getDocs(q);
		const templates: Template[] = [];
		querySnapshot.forEach((docSnap) => {
			if (docSnap.exists()) {
				const data = docSnap.data();
				// Ensure data.conditions is properly typed or cast
				const conditions = (data.conditions || []) as TemplateCondition[];
				templates.push(new Template(
					docSnap.id,
					data.name,
					data.notionDatabaseId,
					data.body,
					conditions, // Make sure this aligns with how conditions are stored
					data.destinationId,
					data.userId,
					data.createdAt?.toDate(), // Convert Firestore Timestamp to Date
					data.updatedAt?.toDate(), // Convert Firestore Timestamp to Date
					data.userNotionIntegrationId || null // Add this new field
				));
			}
		});
		return templates;
	}

	async deleteById(id: string, userId: string): Promise<void> {
		console.log(
			`Firestore: Attempting to delete template with ID: ${id} for user ${userId}`,
		);
		const docRef = doc(this.db, this.collectionName, id); // Use doc()
		const docSnap = await getDoc(docRef); // Use getDoc()

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

		await deleteDoc(docRef); // Use deleteDoc()
		console.log(
			`Template with ID: ${id} for user ${userId} deleted from Firestore.`,
		);
	}

	async findAll(userId: string): Promise<Template[]> {
		console.log(
			`Firestore: Attempting to find all templates for user ${userId}...`,
		);
		const q = query(collection(this.db, this.collectionName), where("userId", "==", userId)); // Use query()
		const querySnapshot = await getDocs(q); // Use getDocs()

		if (querySnapshot.empty) {
			console.log(
				`Firestore: No templates found in collection for user ${userId}.`,
			);
			return [];
		}

		console.log(
			`Firestore: Found ${querySnapshot.docs.length} template documents for user ${userId}. Starting mapping...`,
		);
		const templates: Template[] = [];
		querySnapshot.forEach((docSnap: QueryDocumentSnapshot) => { // Use forEach and docSnap
			const data = docSnap.data();
			// Ensure data.conditions is properly typed or cast
			const conditions = (data.conditions || []) as TemplateCondition[];
			try {
				const template = new Template(
					docSnap.id, // Use docSnap.id
					data.name as string,
					data.notionDatabaseId as string,
					data.body as string,
					conditions,
					data.destinationId as string,
					data.userId as string,
					data.createdAt?.toDate(),
					data.updatedAt?.toDate(),
					data.userNotionIntegrationId || null // Add this new field
				);
				templates.push(template);
			} catch (error) {
				console.error(
					`Firestore: Error mapping document ID: ${docSnap.id}, Data:`,
					JSON.stringify(data, null, 2),
					"Error:",
					error,
				);
			}
		});
		console.log(
			`Firestore: Finished mapping. Total mapped templates for user ${userId}: ${templates.length}`,
		);
		return templates;
	}
}
