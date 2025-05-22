# Notifier App

Notionの更新をチャットツールへリアルタイムに通知する中継アプリケーションです。

## 必要なもの

* Docker
* Docker Compose

## 開発環境のセットアップと実行

1.  **リポジトリをクローンする**
    ```bash
    git clone <リポジトリのURL>
    cd notifier
    ```

2.  **開発サーバーの起動**
    プロジェクトのルートディレクトリで以下のコマンドを実行すると、必要なパッケージのインストール後、開発サーバーが起動します。
    ```bash
    docker-compose up --build
    ```
    初回起動時や `Dockerfile`、`docker-compose.yml` に変更があった場合は `--build` オプションを付けるのがおすすめです。普段は `docker-compose up` だけでOKです。

    サーバーが起動したら、ブラウザで `http://localhost:3000` を開くと、アプリケーションにアクセスできます。

## コード品質 (Biome)

コードのリンティング（構文チェック）とフォーマット（整形）には [Biome](https://biomejs.dev/) を使用しています。
以下のコマンドは、プロジェクトのルートディレクトリで実行してください。

* **チェックと自動修正 (推奨)**
    コードの構文エラーをチェックし、安全な場合は自動で修正します。
    ```bash
    docker-compose run --rm app sh -c "bun install && bun run check"
    ```
    *(注意: `package.json` の `scripts.check` は `bun biome check --write ./src` になっている想定です)*

* **リンティングのみ**
    構文エラーや改善点を報告します (自動修正なし)。
    ```bash
    docker-compose run --rm app sh -c "bun install && bun run lint"
    ```

* **フォーマットのみ**
    コードを整形します。
    ```bash
    docker-compose run --rm app sh -c "bun install && bun run format"
    ```

## 依存関係の管理

* **新しいパッケージの追加**
    ```bash
    docker-compose run --rm app bun add <パッケージ名>
    ```

* **新しい開発用パッケージの追加** (`devDependencies`)
    ```bash
    docker-compose run --rm app bun add -d <パッケージ名>
    ```
    上記コマンド実行後、`package.json` と `bun.lockb` が更新されます。

## トラブルシューティング

* **`Cannot find package ...` エラーが出る場合:**
    `docker-compose down` を実行してから、もう一度 `docker-compose up --build` を試してみてください。
    それでもダメな場合は、`docker-compose run --rm app bun install` を実行してから再度 `docker-compose up` を試してください。
