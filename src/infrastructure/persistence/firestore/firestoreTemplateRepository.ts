// src/infrastructure/persistence/firestore/firestoreTemplateRepository.ts
import { Template } from "../../../domain/entities/template";
import type { TemplateRepository } from "../../../domain/repositories/templateRepository";
import { initializeApp, cert, getApps, App } from "firebase-admin/app"; // App 型もインポート
import {
	getFirestore,
	type Firestore,
	type QueryDocumentSnapshot,
} from "firebase-admin/firestore"; // Firestore 型もインポート

// Firestoreのコレクション名
const TEMPLATES_COLLECTION = "templates";

export class FirestoreTemplateRepository implements TemplateRepository {
	private db: Firestore; //型を Firestore に

	constructor() {
		// getApps() を使って初期化済みか確認
		if (!getApps().length) {
			// admin.apps.length の代わりに getApps().length を使う
			const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
			if (!serviceAccountPath) {
				throw new Error(
					"GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.",
				);
			}
			initializeApp({
				// admin.initializeApp の代わりに initializeApp を使う
				credential: cert(serviceAccountPath), // admin.credential.cert の代わりに cert を使う
			});
			console.log(
				"Firebase Admin SDK initialized by FirestoreTemplateRepository.",
			);
		}
		this.db = getFirestore(); // admin.firestore() の代わりに getFirestore() を使う
		console.log("FirestoreTemplateRepository instance created.");
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
			createdAt: template.createdAt, // FirestoreはDateをTimestamp型に自動変換する
			updatedAt: template.updatedAt,
		});
		console.log(`Template saved to Firestore with ID: ${template.id}`);
	}

	async findById(id: string): Promise<Template | null> {
		console.log(`Firestore: Attempting to find template with ID: ${id}`); // ログ追加
		const docRef = this.db.collection(TEMPLATES_COLLECTION).doc(id);
		const docSnap = await docRef.get();

		if (!docSnap.exists) {
			console.log(`Firestore: Template with ID: ${id} not found.`); // ログ追加
			return null;
		}

		const data = docSnap.data();
		console.log(`Firestore: Found data for ID ${id}:`, data); // 取得したデータもログに出してみる
		if (!data) return null;

		return new Template(
			data.id,
			data.name,
			data.notionDatabaseId,
			data.body,
			data.conditions,
			data.destinationId,
			data.createdAt.toDate
				? data.createdAt.toDate()
				: new Date(data.createdAt),
			data.updatedAt.toDate
				? data.updatedAt.toDate()
				: new Date(data.updatedAt),
		);
	}

	async findByNotionDatabaseId(notionDatabaseId: string): Promise<Template[]> {
		const snapshot = await this.db
			.collection(TEMPLATES_COLLECTION)
			.where("notionDatabaseId", "==", notionDatabaseId)
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
				data.createdAt.toDate
					? data.createdAt.toDate()
					: new Date(data.createdAt),
				data.updatedAt.toDate
					? data.updatedAt.toDate()
					: new Date(data.updatedAt),
			);
		});
	}

	async deleteById(id: string): Promise<void> {
		await this.db.collection(TEMPLATES_COLLECTION).doc(id).delete();
		console.log(`Template with ID: ${id} deleted from Firestore.`);
	}

	async findAll(): Promise<Template[]> {
		console.log('Firestore: Attempting to find all templates...');
		const snapshot = await this.db.collection(TEMPLATES_COLLECTION).get(); // ← .limit(1) は一旦外して、全件取得に戻してみる
	  
		if (snapshot.empty) {
		  console.log('Firestore: No templates found in collection.');
		  return [];
		}
	  
		console.log(`Firestore: Found ${snapshot.docs.length} template documents. Starting mapping...`);
		const templates: Template[] = []; // ★★★ 一旦空の配列を用意
		for (let i = 0; i < snapshot.docs.length; i++) { // ★★★ map の代わりに for ループを使ってみる
		  const doc = snapshot.docs[i];
		  const data = doc.data();
		  console.log(`Firestore: Mapping document <span class="math-inline">\{i \+ 1\}/</span>{snapshot.docs.length}, ID: ${doc.id}`); // ★どのドキュメントを処理中かログ
		  // console.log(`Firestore: Raw data for doc ID ${doc.id}:`, JSON.stringify(data, null, 2)); // ★必要なら生データもログ出し
	  
		  try {
			const template = new Template(
			  data.id as string,
			  data.name as string,
			  data.notionDatabaseId as string,
			  data.body as string,
			  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
			  data.conditions as any,
			  data.destinationId as string,
			  data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt), // ?. を使って toDate がなくてもエラーにならないように
			  data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)  // 同上
			);
			templates.push(template); // ★成功したら配列に追加
			// console.log(`Firestore: Successfully mapped document ID: ${doc.id}`); // ★成功ログ
		  } catch (error) {
			console.error(`Firestore: Error mapping document ID: ${doc.id}, Data:`, JSON.stringify(data, null, 2), 'Error:', error); // ★エラーになったドキュメントのデータとエラー内容をログ出し
			// エラーになったデータはスキップするか、あるいはここで処理を中断するかは設計次第
			// 今回はスキップして、他の正常なデータは返すようにしてみる
		  }
		}
		console.log(`Firestore: Finished mapping. Total mapped templates: ${templates.length}`);
		return templates;
	  }
}
