import type { Template } from '../entities/template';

export interface TemplateRepository {
  // 新しいテンプレートを保存する、または既存のテンプレートを更新する
  save(template: Template): Promise<void>;

  // IDを指定してテンプレートを1件取得する。見つからなければnullを返す
  findById(id: string): Promise<Template | null>;

  // NotionのデータベースIDを指定して、関連するテンプレートを全て取得する
  findByNotionDatabaseId(notionDatabaseId: string): Promise<Template[]>;

  // IDを指定してテンプレートを削除する
  deleteById(id: string): Promise<void>;

  // （オプション）全てのテンプレートを取得する
  findAll(): Promise<Template[]>;
}
