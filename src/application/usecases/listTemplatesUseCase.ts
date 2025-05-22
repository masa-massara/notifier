// src/application/usecases/listTemplatesUseCase.ts
import type { Template } from '../../domain/entities/template';
import type { TemplateRepository } from '../../domain/repositories/templateRepository';

// ユースケースの入力 (今回はなし)
// export interface ListTemplatesInput {} // 必要なら将来的に定義

// ユースケースの出力 (テンプレートの配列)
export type ListTemplatesOutput = Template[];

export class ListTemplatesUseCase {
    constructor(private readonly templateRepository: TemplateRepository) {}
  
    async execute(): Promise<ListTemplatesOutput> {
      console.log('ListTemplatesUseCase: Attempting to execute findAll...'); // ★ログ追加
      const templates = await this.templateRepository.findAll();
      console.log(`ListTemplatesUseCase: Found ${templates.length} templates.`); // ★ログ追加
      return templates;
    }
  }
