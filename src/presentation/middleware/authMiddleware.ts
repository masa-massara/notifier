// src/presentation/middleware/authMiddleware.ts (ログ追加版)

import type { MiddlewareHandler } from "hono";
import { getAuth } from "firebase-admin/auth";
// Honoの型拡張が src/hono.env.d.ts などで定義されている前提
// declare module 'hono' {
//   interface ContextVariableMap {
//     userId: string;
//   }
// }

export const authMiddleware: MiddlewareHandler = async (c, next) => {
	console.log("======== authMiddleware: Entered ========"); // ★ 追加：ミドルウェア開始ログ

	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		console.error("authMiddleware: Authorization header missing or invalid."); // ★ 追加：エラーログ
		return c.json(
			{ error: "Unauthorized", message: "Bearer token is missing or invalid." },
			401,
		);
	}

	const idToken = authHeader.split("Bearer ")[1];
	console.log(
		"authMiddleware: Extracted ID token (first 15 chars):",
		`${idToken.substring(0, 15)}...`,
	); // ★ 追加：トークン確認

	try {
		const decodedToken = await getAuth().verifyIdToken(idToken);
		console.log("authMiddleware: ID token verified successfully."); // ★ 追加：検証成功ログ

		if (!decodedToken || !decodedToken.uid) {
			console.error(
				"authMiddleware: Decoded token is invalid or UID is missing.",
				decodedToken,
			); // ★ 追加：デコード結果確認
			return c.json(
				{ error: "Unauthorized", message: "Invalid token credentials." },
				401,
			);
		}

		const uid = decodedToken.uid;
		console.log(`authMiddleware: UID from token is: [${uid}]`); // ★ 追加：UID確認

		c.set("userId", uid);
		console.log(
			`authMiddleware: "userId" has been set in context with value: [${c.get("userId")}]`,
		); // ★ 追加：セット後の値確認
		console.log("authMiddleware: Keys in c.var after set:", Object.keys(c.var)); // ★ 追加：c.varの中身確認
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (error: any) {
		console.error("authMiddleware: Error verifying ID token:", error.message); // ★ 追加：検証エラー詳細
		if (error.code === "auth/id-token-expired") {
			return c.json(
				{ error: "Unauthorized", message: "Token has expired." },
				401,
			);
		}
		return c.json(
			{ error: "Unauthorized", message: "Invalid or expired token." },
			401,
		); // メッセージを少し具体的に
	}

	console.log("======== authMiddleware: Calling next() ========"); // ★ 追加：next()呼び出し前ログ
	await next();
	console.log("======== authMiddleware: Returned from next() ========"); // ★ 追加：next()呼び出し後ログ
};
