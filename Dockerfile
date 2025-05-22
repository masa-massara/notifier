# Dockerfile
FROM oven/bun:1

# アプリケーションの作業ディレクトリを設定
WORKDIR /usr/src/app

# ホストのファイルをコンテナにコピーしない (docker-compose.ymlでマウントするため)
# ポートを公開 (docker-compose.ymlでも指定する)
EXPOSE 3000

# コンテナ起動時のデフォルトコマンド (開発時はdocker-compose.ymlで上書きすることが多い)
CMD ["bun", "run", "src/main.ts"]
