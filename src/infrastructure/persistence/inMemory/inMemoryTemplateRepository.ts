// src/infrastructure/persistence/inMemory/inMemoryTemplateRepository.ts
import type { Template } from "../../../domain/entities/template";
import type { TemplateRepository } from "../../../domain/repositories/templateRepository";
// uuidのインポートは元のファイルにあればそのまま使う
// import { v4 as uuidv4 } from "uuid";

export class InMemoryTemplateRepository implements TemplateRepository {
	private readonly templates: Template[] = [];

	async save(template: Template): Promise<void> {
		const existingIndex = this.templates.findIndex((t) => t.id === template.id);
		if (existingIndex > -1) {
			this.templates[existingIndex] = template;
		} else {
			this.templates.push(template);
		}
		return Promise.resolve();
	}

	async findById(id: string, userId: string): Promise<Template | null> {
		// userId を引数に追加 (インターフェースに合わせて)
		const template = this.templates.find(
			(t) => t.id === id && t.userId === userId,
		);
		return Promise.resolve(template || null);
	}

	async findByNotionDatabaseId(
		notionDatabaseId: string,
		userId: string,
	): Promise<Template[]> {
		// userId を引数に追加
		const foundTemplates = this.templates.filter(
			(t) => t.notionDatabaseId === notionDatabaseId && t.userId === userId,
		);
		return Promise.resolve(foundTemplates);
	}

	// ★★★ 新しいメソッドの実装を追加 ★★★
	async findAllByNotionDatabaseId(
		notionDatabaseId: string,
	): Promise<Template[]> {
		console.log(
			`InMemory: Finding all templates by notionDatabaseId: ${notionDatabaseId} (regardless of user)`,
		);
		const foundTemplates = this.templates.filter(
			(t) => t.notionDatabaseId === notionDatabaseId,
		);
		return Promise.resolve(foundTemplates);
	}
	// ★★★ ここまで追加 ★★★

	async deleteById(id: string, userId: string): Promise<void> {
		// userId を引数に追加
		const index = this.templates.findIndex(
			(t) => t.id === id && t.userId === userId,
		);
		if (index > -1) {
			this.templates.splice(index, 1);
		}
		return Promise.resolve();
	}

	async findAll(userId: string): Promise<Template[]> {
		// userId を引数に追加
		const foundTemplates = this.templates.filter((t) => t.userId === userId);
		return Promise.resolve([...foundTemplates]); // 配列のコピーを返す
	}

	clear(): void {
		this.templates.length = 0;
	}
}
