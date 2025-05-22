// src/infrastructure/persistence/firestore/firestoreDestinationRepository.ts
import { Destination } from "../../../domain/entities/destination";
import type { DestinationRepository } from "../../../domain/repositories/destinationRepository";
import { initializeApp, cert, getApps, App } from "firebase-admin/app"; // App 型もインポート
import {
	getFirestore,
	type Firestore,
	QueryDocumentSnapshot,
} from "firebase-admin/firestore"; // Firestore 型と QueryDocumentSnapshot もインポート

const DESTINATIONS_COLLECTION = "destinations";

export class FirestoreDestinationRepository implements DestinationRepository {
	private db: Firestore;

	constructor() {
		// Firebase Admin SDKの初期化は既にFirestoreTemplateRepositoryで行われているはずなので、
		// ここでは getFirestore() を呼び出すだけでOK。
		// もし、admin.apps.length が0の場合のみinitializeAppするような共通の初期化処理を
		// アプリのどこか一箇所で行うのがより良い設計になる。
		if (!getApps().length) {
			const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
			if (!serviceAccountPath) {
				throw new Error(
					"GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.",
				);
			}
			initializeApp({
				credential: cert(serviceAccountPath),
			});
			console.log(
				"Firebase Admin SDK initialized by FirestoreDestinationRepository.",
			);
		}
		this.db = getFirestore();
		console.log("FirestoreDestinationRepository instance created.");
	}

	async save(destination: Destination): Promise<void> {
		const docRef = this.db
			.collection(DESTINATIONS_COLLECTION)
			.doc(destination.id);
		await docRef.set({
			id: destination.id,
			name: destination.name,
			webhookUrl: destination.webhookUrl,
			createdAt: destination.createdAt,
			updatedAt: destination.updatedAt,
		});
		console.log(`Destination saved to Firestore with ID: ${destination.id}`);
	}

	async findById(id: string): Promise<Destination | null> {
		console.log(`Firestore: Attempting to find destination with ID: ${id}`);
		const docRef = this.db.collection(DESTINATIONS_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.log(`Destination with ID: ${id} not found in Firestore.`);
			return null;
		}
		const data = docSnap.data();
		if (!data) return null;

		console.log(`Firestore: Found destination data for ID ${id}`);
		return new Destination(
			data.id as string,
			data.webhookUrl as string,
			data.name as string | undefined,
			data.createdAt?.toDate
				? data.createdAt.toDate()
				: new Date(data.createdAt),
			data.updatedAt?.toDate
				? data.updatedAt.toDate()
				: new Date(data.updatedAt),
		);
	}

	async findAll(): Promise<Destination[]> {
		console.log("Firestore: Attempting to find all destinations...");
		const snapshot = await this.db.collection(DESTINATIONS_COLLECTION).get();
		if (snapshot.empty) {
			console.log("Firestore: No destinations found.");
			return [];
		}
		console.log(
			`Firestore: Found ${snapshot.docs.length} destination documents. Starting mapping...`,
		);
		const destinations: Destination[] = [];
		for (const doc of snapshot.docs) {
			const data = doc.data();
			console.log(`Firestore: Mapping destination document ID: ${doc.id}`);
			try {
				destinations.push(
					new Destination(
						data.id as string,
						data.webhookUrl as string,
						data.name as string | undefined,
						data.createdAt?.toDate
							? data.createdAt.toDate()
							: new Date(data.createdAt),
						data.updatedAt?.toDate
							? data.updatedAt.toDate()
							: new Date(data.updatedAt),
					),
				);
			} catch (error) {
				console.error(
					`Firestore: Error mapping destination document ID: ${doc.id}`,
					error,
				);
			}
		}
		console.log(
			`Firestore: Finished mapping destinations. Total: ${destinations.length}`,
		);
		return destinations;
	}

	async deleteById(id: string): Promise<void> {
		await this.db.collection(DESTINATIONS_COLLECTION).doc(id).delete();
		console.log(`Destination with ID: ${id} deleted from Firestore.`);
	}
}
