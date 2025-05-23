// src/infrastructure/persistence/firestore/firestoreDestinationRepository.ts
import { Destination } from "../../../domain/entities/destination";
import type { DestinationRepository } from "../../../domain/repositories/destinationRepository";
// initializeApp, cert, getApps は main.ts で一元管理するのでここでは不要
import {
	getFirestore,
	type Firestore,
	type QueryDocumentSnapshot, // QueryDocumentSnapshot は findAll で使うので残す
} from "firebase-admin/firestore";

const DESTINATIONS_COLLECTION = "destinations";

export class FirestoreDestinationRepository implements DestinationRepository {
	private db: Firestore;

	constructor() {
		// Firebase Admin SDKの初期化はmain.tsで行うため、ここでは呼び出さない
		this.db = getFirestore();
		console.log(
			"FirestoreDestinationRepository instance created, using centrally initialized Firebase Admin SDK.",
		);
	}

	async save(destination: Destination): Promise<void> {
		const docRef = this.db
			.collection(DESTINATIONS_COLLECTION)
			.doc(destination.id);
		await docRef.set({
			id: destination.id,
			name: destination.name, // name はオプショナルなので、undefined の場合は保存されない（Firestoreの挙動）
			webhookUrl: destination.webhookUrl,
			userId: destination.userId, // ★ userId を保存データに追加
			createdAt: destination.createdAt,
			updatedAt: destination.updatedAt,
		});
		console.log(
			`Destination saved to Firestore with ID: ${destination.id} for user ${destination.userId}`,
		);
	}

	async findById(id: string, userId: string): Promise<Destination | null> {
		// ★ userId を引数に追加
		console.log(
			`Firestore: Attempting to find destination with ID: ${id} for user ${userId}`,
		);
		const docRef = this.db.collection(DESTINATIONS_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.log(`Firestore: Destination with ID: ${id} not found.`);
			return null;
		}

		const data = docSnap.data();
		if (!data) return null;

		// ★ 取得したデータのuserIdと引数のuserIdが一致するか確認
		if (data.userId !== userId) {
			console.warn(
				`Firestore: Destination with ID: ${id} found, but does not belong to user ${userId}.`,
			);
			return null; // 所有者でなければnullを返す
		}

		console.log(
			`Firestore: Found destination data for ID ${id} owned by user ${userId}`,
		);
		return new Destination(
			data.id as string,
			data.webhookUrl as string,
			data.userId as string, // ★ userId をエンティティにマッピング (コンストラクタの引数順に注意)
			data.name as string | undefined,
			data.createdAt?.toDate
				? data.createdAt.toDate()
				: new Date(data.createdAt),
			data.updatedAt?.toDate
				? data.updatedAt.toDate()
				: new Date(data.updatedAt),
		);
	}

	async findAll(userId: string): Promise<Destination[]> {
		// ★ userId を引数に追加
		console.log(
			`Firestore: Attempting to find all destinations for user ${userId}...`,
		);
		const snapshot = await this.db
			.collection(DESTINATIONS_COLLECTION)
			.where("userId", "==", userId) // ★ userId でフィルタリング
			.get();

		if (snapshot.empty) {
			console.log(`Firestore: No destinations found for user ${userId}.`);
			return [];
		}

		console.log(
			`Firestore: Found ${snapshot.docs.length} destination documents for user ${userId}. Starting mapping...`,
		);
		const destinations: Destination[] = [];
		for (const doc of snapshot.docs) {
			// map の代わりに for ループ (元のコードに合わせて)
			const data = doc.data();
			// console.log(`Firestore: Mapping destination document ID: ${doc.id}`); // ログは必要に応じて調整
			try {
				destinations.push(
					new Destination(
						data.id as string,
						data.webhookUrl as string,
						data.userId as string, // ★ userId をエンティティにマッピング
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
					`Firestore: Error mapping destination document ID: ${doc.id}, Data:`,
					JSON.stringify(data, null, 2),
					"Error:",
					error,
				);
			}
		}
		console.log(
			`Firestore: Finished mapping destinations. Total for user ${userId}: ${destinations.length}`,
		);
		return destinations;
	}

	async deleteById(id: string, userId: string): Promise<void> {
		// ★ userId を引数に追加
		console.log(
			`Firestore: Attempting to delete destination with ID: ${id} for user ${userId}`,
		);
		const docRef = this.db.collection(DESTINATIONS_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.warn(
				`Firestore: Destination with ID: ${id} not found. Cannot delete.`,
			);
			return; // もしくはエラーを投げる
		}

		const data = docSnap.data();
		if (!data || data.userId !== userId) {
			console.warn(
				`Firestore: Destination with ID: ${id} does not belong to user ${userId}. Cannot delete.`,
			);
			// ここでエラーを投げるのがより厳密かもしれない (例: throw new Error("Permission denied"))
			return;
		}

		await docRef.delete();
		console.log(
			`Destination with ID: ${id} for user ${userId} deleted from Firestore.`,
		);
	}
}
