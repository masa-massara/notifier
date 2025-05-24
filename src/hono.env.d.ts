// src/hono.env.d.ts
import "hono";

declare module "hono" {
	// HonoのContextの var プロパティに入る変数の型を拡張する
	interface ContextVariableMap {
		userId: string; // authMiddleware によってセットされる userId は文字列型で必須
	}
}
