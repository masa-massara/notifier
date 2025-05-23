#!/bin/bash

# --- .env ファイルの読み込み ---
# スクリプトと同じディレクトリにある .env ファイルを読み込む
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
ENV_FILE="${SCRIPT_DIR}/.env"

if [ -f "${ENV_FILE}" ]; then
  echo ".env ファイルを読み込みます: ${ENV_FILE}" >&2
  # dotenv-like behavior: export all non-comment, non-empty lines
  # This simple version doesn't handle complex values (multiline, special chars in unquoted values well)
  # For robust parsing, a dedicated tool or more complex awk/sed might be needed.
  # However, for simple KEY=VALUE pairs, this should work.
  set -o allexport # Automatically export all variables defined by 'source'
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +o allexport # Disable auto-export
  echo ".env ファイルの読み込み完了。" >&2
else
  echo "警告: .env ファイルが見つかりません: ${ENV_FILE}" >&2
  echo "環境変数が別途シェルに設定されていることを期待して処理を続行します。" >&2
fi

# --- 設定値 (一部は .env から上書きされることを期待) ---
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}" # .env にあればそれを使う、なければデフォルト
NOTION_DATABASE_ID="${NOTION_DATABASE_ID:-1f7638e1-46d5-8094-9529-d23e169af4e7}" # .env にあればそれを使う

# Discord Webhook URL と Destination名
# これらも .env に書くことができる。なければ以下のデフォルト値が使われる。
DESTINATION_WEBHOOK_URL="${DESTINATION_WEBHOOK_URL:-https://discord.com/api/webhooks/1375244466671325256/C8AueIzYzZfci5rU7RANf4qNCCY3IIeUamsLbwXKFm3YSUVZ0bFXLouPodSPXT2BOxY4}"
DESTINATION_NAME="${DESTINATION_NAME:-テスト用Discordチャンネル (.env優先)}"

# --- 環境変数の必須チェック ---
# これらの変数は .env から読み込まれるか、このスクリプト実行前に export されてる必要がある
: "${TEST_USER_EMAIL?エラー: 環境変数 TEST_USER_EMAIL が設定されていません。 (.env ファイルに記述するか、export してください)}"
: "${TEST_USER_PASSWORD?エラー: 環境変数 TEST_USER_PASSWORD が設定されていません。 (.env ファイルに記述するか、export してください)}"
: "${TEST_USER_MOCK_NOTION_TOKEN?エラー: 環境変数 TEST_USER_MOCK_NOTION_TOKEN が設定されていません。 (.env ファイルに記述するか、export してください)}"
: "${NOTION_DATABASE_ID?エラー: 環境変数 NOTION_DATABASE_ID が設定されていません。 (.env ファイルに記述するか、スクリプト内で定義してください)}"
: "${DESTINATION_WEBHOOK_URL?エラー: 環境変数 DESTINATION_WEBHOOK_URL が設定されていません。 (.env ファイルに記述するか、スクリプト内で定義してください)}"


# --- 前準備: jqコマンドの確認 ---
if ! command -v jq &> /dev/null
then
    echo "エラー: jq コマンドが見つかりません。このスクリプトの実行には jq が必要です。" >&2
    echo "Dev Container内であれば、 sudo apt-get update && sudo apt-get install -y jq でインストールしてください。" >&2
    exit 1
fi

# --- IDトークンの取得 ---
echo "IDトークンを取得中 (ユーザー: ${TEST_USER_EMAIL})..."
# getIdToken.ts のパスは、あんたの環境に合わせてな（scripts/getIdToken.ts が正しいことが多い）
# `getIdToken.ts` は環境変数 TEST_USER_EMAIL と TEST_USER_PASSWORD を参照する
ID_TOKEN_OUTPUT_FROM_SCRIPT=$(bun scripts/getIdToken.ts) # プロジェクトルートからの相対パスで指定

# bun の終了コードを確認
if [ $? -ne 0 ]; then
  echo "エラー: IDトークンの取得スクリプト (getIdToken.ts) がエラーで終了しました。" >&2
  echo "getIdToken.ts の実行時の出力/エラー:" >&2
  echo "${ID_TOKEN_OUTPUT_FROM_SCRIPT}" >&2 # bun実行時のエラー出力が含まれる
  exit 1
fi

# 取得した生の出力から、JWT（eyJで始まる行）だけを抽出する
ID_TOKEN=$(echo "${ID_TOKEN_OUTPUT_FROM_SCRIPT}" | grep "eyJ" | head -n 1)

if [ -z "${ID_TOKEN}" ]; then
  echo "エラー: IDトークンの取得に失敗しました (取得したトークンが空か、JWT形式の文字列が見つかりませんでした)。" >&2
  echo "getIdToken.ts の出力を確認してください:" >&2
  echo "--- getIdToken.tsの生出力 ---" >&2
  echo "${ID_TOKEN_OUTPUT_FROM_SCRIPT}" >&2
  echo "--- ここまで ---" >&2
  exit 1
else
  echo "IDトークンを正常に抽出しました。"
fi

# --- 設定値の最終確認 (Webhook URLがプレースホルダーでないか) ---
if [[ "${DESTINATION_WEBHOOK_URL}" == *"YOUR_"* || "${DESTINATION_WEBHOOK_URL}" == *"YOURACTUALWEBHOOKURL"* ]]; then # より一般的なプレースホルダーチェック
  echo "エラー: スクリプト内の DESTINATION_WEBHOOK_URL を実際の有効なDiscord Webhook URLに設定してください。(.envファイルを確認してください)" >&2
  exit 1
fi
if [[ "${TEST_USER_MOCK_NOTION_TOKEN}" == *"mock_secret_this_is_not_real"* || "${TEST_USER_MOCK_NOTION_TOKEN}" == *"YOUR_NOTION_TOKEN"* ]]; then
  echo "警告: TEST_USER_MOCK_NOTION_TOKEN がダミーのままか、プレースホルダーのようです。" >&2
  echo "テンプレート作成時のNotion API検証でエラーになる可能性があります。" >&2
  # ここで exit 1 しても良い
fi


# --- 関数定義 ---

# Destinationを作成する関数
create_destination() {
  echo "送信先 (Destination) を作成中 (名前: ${DESTINATION_NAME})..." >&2
  temp_response_file=$(mktemp)
  # シェル変数内のJSON特殊文字をエスケープする必要があるかもしれないが、通常はシングルクォートで囲めば大丈夫
  json_payload=$(printf '{"name": "%s", "webhookUrl": "%s"}' "${DESTINATION_NAME}" "${DESTINATION_WEBHOOK_URL}")

  http_code=$(curl -v -s -o "$temp_response_file" -w "%{http_code}" -X POST "${BASE_URL}/destinations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -d "${json_payload}")
  body=$(cat "$temp_response_file")
  rm "$temp_response_file"

  if [ "$http_code" -eq 201 ]; then
    destination_id=$(echo "$body" | jq -r .id)
    if [ -z "$destination_id" ] || [ "$destination_id" == "null" ]; then
        echo "送信先の作成レスポンスからIDの抽出に失敗しました。" >&2
        echo "レスポンスボディ: ${body}" >&2
        return 1
    fi
    echo "送信先を作成しました。ID: ${destination_id}" >&2
    echo "${destination_id}" # 成功時のみIDを標準出力へ
  else
    echo "送信先の作成に失敗しました。HTTPステータス: ${http_code}" >&2
    echo "送信されたリクエストヘッダとボディの詳細は curl -v の出力を確認してください（上記に出力されています）。" >&2
    echo "レスポンスボディ: ${body}" >&2
    return 1
  fi
}

# User Notion Integration を作成する関数
create_user_notion_integration() {
  echo "User Notion Integration を作成中..." >&2
  temp_response_file=$(mktemp)
  json_payload_user_notion=$(printf '{"integrationName": "Mock User Integration (auto-created from .env)", "notionIntegrationToken": "%s"}' "${TEST_USER_MOCK_NOTION_TOKEN}")

  http_code=$(curl -v -s -o "$temp_response_file" -w "%{http_code}" -X POST "${BASE_URL}/me/notion-integrations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -d "${json_payload_user_notion}")
  body=$(cat "$temp_response_file")
  rm "$temp_response_file"

  if [ "$http_code" -eq 201 ]; then
    integration_id=$(echo "$body" | jq -r .id)
    if [ -z "$integration_id" ] || [ "$integration_id" == "null" ]; then
        echo "User Notion Integration の作成レスポンスからIDの抽出に失敗しました。" >&2
        echo "レスポンスボディ: ${body}" >&2
        return 1
    fi
    echo "User Notion Integration を作成しました。ID: ${integration_id}" >&2
    echo "${integration_id}" # 成功時のみIDを標準出力へ
  else
    echo "User Notion Integration の作成に失敗しました。HTTPステータス: ${http_code}" >&2
    echo "送信されたリクエストヘッダとボディの詳細は curl -v の出力を確認してください（上記に出力されています）。" >&2
    echo "レスポンスボディ: ${body}" >&2
    return 1
  fi
}

# Templateを作成する関数
# $1: Destination ID
# $2: User Notion Integration ID
create_template() {
  local dest_id=$1
  local user_notion_integration_id=$2
  if [ -z "$dest_id" ]; then
    echo "Template作成エラー: Destination IDが指定されていません。" >&2
    return 1
  fi
  if [ -z "$user_notion_integration_id" ]; then
    echo "Template作成エラー: User Notion Integration IDが指定されていません。" >&2
    return 1
  fi

  echo "通知テンプレートを作成中 (Destination ID: ${dest_id}, User Notion Integration ID: ${user_notion_integration_id})..." >&2
  temp_response_file_template=$(mktemp)
  # JSONペイロードを heredoc で作成して、変数を埋め込む
  json_payload_template=$(cat <<EOF
{
  "name": "自動作成テンプレート (${NOTION_DATABASE_ID})",
  "notionDatabaseId": "${NOTION_DATABASE_ID}",
  "body": "Notionページ「{名前}」が更新されましたで！\\nマルチセレクト: {マルチセレクト}\\nURL: {_pageUrl}\\n送信時刻: {_now}",
  "conditions": [
    {
      "propertyId": "マルチセレクト",
      "operator": "is_not_empty",
      "value": null
    }
  ],
  "destinationId": "${dest_id}",
  "userNotionIntegrationId": "${user_notion_integration_id}"
}
EOF
)

  http_code_template=$(curl -v -s -o "$temp_response_file_template" -w "%{http_code}" -X POST "${BASE_URL}/templates" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -d "${json_payload_template}")
  body_template=$(cat "$temp_response_file_template")
  rm "$temp_response_file_template"

  if [ "$http_code_template" -eq 201 ]; then
    template_id=$(echo "$body_template" | jq -r .id)
    if [ -z "$template_id" ] || [ "$template_id" == "null" ]; then
        echo "テンプレート作成レスポンスからIDの抽出に失敗しました。" >&2
        echo "レスポンスボディ: ${body_template}" >&2
        return 1
    fi
    echo "通知テンプレートを作成しました。ID: ${template_id}" >&2
  else
    echo "通知テンプレートの作成に失敗しました。HTTPステータス: ${http_code_template}" >&2
    echo "送信されたリクエストヘッダとボディの詳細は curl -v の出力を確認してください（上記に出力されています）。" >&2
    echo "レスポンスボディ: ${body_template}" >&2
    return 1
  fi
}


# --- メイン処理 ---

echo "モックデータの作成を開始します..."

# 1. 送信先を作成し、IDを取得
if ! created_destination_id=$(create_destination); then
  echo "Destinationの作成に失敗したため、処理を中止します。" >&2
  exit 1
fi
# created_destination_id の空チェックは create_destination 関数内でIDが取れなかった場合に return 1 するので、
# ここの ! created_destination_id=$(...) のチェックで基本的にはカバーされるが、念のため残しても良い。
if [ -z "$created_destination_id" ]; then
  echo "Destination IDが取得できませんでした (空です)。処理を中止します。" >&2
  exit 1
fi

# 2. User Notion Integration を作成し、IDを取得
if ! created_user_notion_integration_id=$(create_user_notion_integration); then
  echo "User Notion Integration の作成に失敗したため、Templateの作成を中止します。" >&2
  exit 1
fi
if [ -z "$created_user_notion_integration_id" ]; then
  echo "User Notion Integration IDが取得できませんでした (空です)。Templateの作成を中止します。" >&2
  exit 1
fi

# 3. 取得したIDを使ってテンプレートを作成
if ! create_template "${created_destination_id}" "${created_user_notion_integration_id}"; then
    echo "Templateの作成に失敗しました。" >&2
    # ここで exit 1 するか、処理を続けるか選択。今回はエラーが出ても最後まで実行する。
fi

echo "モックデータの作成が完了しました。"
