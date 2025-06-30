# Node.js 18 Alpine ベースイメージを使用
FROM node:18-alpine

# Chromeの依存関係をインストール
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteerの環境変数を設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install --omit=dev

# Mermaid CLIをグローバルインストール
RUN npm install -g @mermaid-js/mermaid-cli

# アプリケーションコードをコピー
COPY . .

# 動的ポートを公開（環境変数PORTで指定、デフォルト8080）
EXPOSE ${PORT:-8080}

# ヘルスチェックを設定（動的ポートに対応）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "import('node-fetch').then(fetch => fetch.default(\`http://localhost:\${process.env.PORT || 8080}/api/health\`)).then(res => { if (!res.ok) process.exit(1) }).catch(() => process.exit(1))"

# アプリケーションを起動
CMD ["npm", "start"] 