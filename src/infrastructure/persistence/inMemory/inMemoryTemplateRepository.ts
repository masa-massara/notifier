// src/infrastructure/persistence/inMemory/inMemoryTemplateRepository.ts
import type { Template } from "../../../domain/entities/template"; // ドメイン層のエンティティをインポート
import type { TemplateRepository } from "../../../domain/repositories/templateRepository"; // ドメイン層のリポジトリインターフェースをインポート
import { v4 as uuidv4 } from "uuid"; // ID生成用にuuidライブラリを使う（あとでインストールする）

export class InMemoryTemplateRepository implements TemplateRepository {
	// テンプレートを保存するためのプライベートな配列
	private readonly templates: Template[] = [];

	async save(template: Template): Promise<void> {
		// まず、同じIDのテンプレートが既に存在するかどうかを確認
		const existingIndex = this.templates.findIndex((t) => t.id === template.id);

		if (existingIndex > -1) {
			// 存在する場合は、既存のテンプレートを更新する
			this.templates[existingIndex] = template;
		} else {
			// 存在しない場合は、新しいテンプレートとして追加する
			// もしtemplateにIDがなければ、ここで新たにIDを振っても良い
			// (今回はエンティティのコンストラクタでIDが必須になっている前提)
			this.templates.push(template);
		}
		// インメモリなので、Promiseを返すために `Promise.resolve()` を使う
		return Promise.resolve();
	}

	async findById(id: string): Promise<Template | null> {
		const template = this.templates.find((t) => t.id === id);
		return Promise.resolve(template || null);
	}

	async findByNotionDatabaseId(notionDatabaseId: string): Promise<Template[]> {
		const foundTemplates = this.templates.filter(
			(t) => t.notionDatabaseId === notionDatabaseId,
		);
		return Promise.resolve(foundTemplates);
	}

	async deleteById(id: string): Promise<void> {
		const index = this.templates.findIndex((t) => t.id === id);
		if (index > -1) {
			this.templates.splice(index, 1); // 配列から削除
		}
		return Promise.resolve();
	}

	// findAllもインターフェースに合わせて実装
	async findAll(): Promise<Template[]> {
		return Promise.resolve([...this.templates]); // 配列のコピーを返すのが安全
	}

	// (テスト用、またはデバッグ用) 配列をクリアするメソッド
	clear(): void {
		this.templates.length = 0; // 配列を空にする
	}
}
