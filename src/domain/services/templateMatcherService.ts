// src/domain/services/templateMatcherService.ts
import type {
	Template,
	TemplateCondition,
	TemplateConditionOperator,
} from "../entities/template";
import type {
	NotionDatabaseSchema,
	NotionPropertySchema,
} from "./notionApiService";

// Notionのページプロパティの実際の値の型
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type NotionPagePropertyValue = any;
type NotionPageProperties = Record<string, NotionPagePropertyValue>;

/**
 * 指定されたページプロパティとテンプレート条件に一致するテンプレートをフィルタリングする
 */
export function findMatchingTemplates(
	pageProperties: NotionPageProperties,
	templates: Template[],
	databaseSchema: NotionDatabaseSchema,
): Template[] {
	console.log("TemplateMatcherService: Starting to find matching templates...");
	const matchedTemplates: Template[] = [];

	for (const template of templates) {
		if (!template.conditions || template.conditions.length === 0) {
			console.log(
				`TemplateMatcherService: Template ID ${template.id} has no conditions, matching by default.`,
			);
			matchedTemplates.push(template);
			continue;
		}

		let allConditionsMet = true;
		for (const condition of template.conditions) {
			const propertyNameInSchema = Object.keys(databaseSchema.properties).find(
				(key) =>
					databaseSchema.properties[key].id === condition.propertyId ||
					databaseSchema.properties[key].name === condition.propertyId,
			);

			if (!propertyNameInSchema) {
				console.warn(
					`TemplateMatcherService: Condition property "${condition.propertyId}" not found in database schema for template ID ${template.id}. Skipping this condition.`,
				);
				continue;
			}
			const propertySchema = databaseSchema.properties[propertyNameInSchema];
			const pagePropertyValueObject = pageProperties[propertySchema.name];

			if (pagePropertyValueObject === undefined) {
				console.log(
					`TemplateMatcherService: Property "${propertySchema.name}" not found in page data for template ID ${template.id}.`,
				);
				if (
					condition.operator === "!=" &&
					(condition.value === null ||
						condition.value === undefined ||
						condition.value === "")
				) {
					// 例: プロパティが存在しない != 空っぽ => 真
				} else if (condition.operator === "is_empty") {
					// is_empty が真
				} else if (condition.operator === "is_not_empty") {
					allConditionsMet = false;
					break;
				} else {
					allConditionsMet = false;
					break;
				}
				continue;
			}

			if (!checkCondition(pagePropertyValueObject, propertySchema, condition)) {
				allConditionsMet = false;
				break;
			}
		}

		if (allConditionsMet) {
			console.log(
				`TemplateMatcherService: Template ID ${template.id} matched all conditions!`,
			);
			matchedTemplates.push(template);
		} else {
			console.log(
				`TemplateMatcherService: Template ID ${template.id} did NOT match all conditions.`,
			);
		}
	}
	console.log(
		`TemplateMatcherService: Finished. Found ${matchedTemplates.length} matching templates.`,
	);
	return matchedTemplates;
}

/**
 * 個別のプロパティ値と条件を比較する
 */
function checkCondition(
	pagePropValueObject: NotionPagePropertyValue,
	propSchema: NotionPropertySchema,
	condition: TemplateCondition,
): boolean {
	console.log(
		`TemplateMatcherService: Checking condition for property "${propSchema.name}" (type: ${propSchema.type}), operator: "${condition.operator}", conditionValue: "${condition.value}"`,
	);
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let actualValue: any;

	switch (propSchema.type) {
		case "title":
		case "rich_text":
			actualValue = pagePropValueObject[propSchema.type]
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				?.map((rt: any) => rt.plain_text)
				.join("");
			break;
		case "number":
			actualValue = pagePropValueObject.number;
			break;
		case "select":
			actualValue = pagePropValueObject.select?.name;
			break;
		case "multi_select":
			actualValue = pagePropValueObject.multi_select?.map(
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				(opt: any) => opt.name,
			);
			break;
		case "status":
			actualValue = pagePropValueObject.status?.name;
			break;
		case "checkbox":
			actualValue = pagePropValueObject.checkbox;
			break;
		case "date":
			actualValue = pagePropValueObject.date?.start
				? new Date(pagePropValueObject.date.start)
				: null;
			break;
		default:
			console.warn(
				`TemplateMatcherService: checkCondition - Unhandled property type: ${propSchema.type}`,
			);
			return false;
	}
	console.log(
		`TemplateMatcherService: Actual page property value for "${propSchema.name}":`,
		actualValue,
	);

	const conditionValue = condition.value;
	switch (condition.operator) {
		case "=":
			if (Array.isArray(actualValue) && propSchema.type === "multi_select") {
				return actualValue.includes(conditionValue);
			}
			return String(actualValue) === String(conditionValue); // 文字列比較で統一してみる
		case "!=":
			if (Array.isArray(actualValue) && propSchema.type === "multi_select") {
				return !actualValue.includes(conditionValue);
			}
			return String(actualValue) !== String(conditionValue); // 文字列比較で統一
		case "in":
			if (!Array.isArray(conditionValue)) {
				console.warn(
					`TemplateMatcherService: 'in' operator requires an array value in condition. Condition value:`,
					conditionValue,
				);
				return false;
			}
			if (Array.isArray(actualValue)) {
				return actualValue.some((val) =>
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					(conditionValue as any[]).includes(val),
				);
			}
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			return (conditionValue as any[]).includes(actualValue);
		case "<":
			if (
				typeof actualValue === "number" &&
				typeof conditionValue === "number"
			) {
				return actualValue < conditionValue;
			}
			if (
				actualValue instanceof Date &&
				!Number.isNaN(new Date(conditionValue as string).valueOf())
			) {
				return actualValue < new Date(conditionValue as string);
			}
			return false;
		case ">":
			if (
				typeof actualValue === "number" &&
				typeof conditionValue === "number"
			) {
				return actualValue > conditionValue;
			}
			if (
				actualValue instanceof Date &&
				!Number.isNaN(new Date(conditionValue as string).valueOf())
			) {
				return actualValue > new Date(conditionValue as string);
			}
			return false;
		case "is_empty":
			if (
				actualValue === null ||
				actualValue === undefined ||
				actualValue === "" ||
				(Array.isArray(actualValue) && actualValue.length === 0)
			) {
				return true;
			}
			return false;
		case "is_not_empty":
			if (
				actualValue === null ||
				actualValue === undefined ||
				actualValue === "" ||
				(Array.isArray(actualValue) && actualValue.length === 0)
			) {
				return false;
			}
			return true;
		default:
			console.warn(
				`TemplateMatcherService: checkCondition - Unhandled operator: ${condition.operator}`,
			);
			return false;
	}
}
