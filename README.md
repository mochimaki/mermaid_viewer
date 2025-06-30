# Mermaid System Graph Viewer - 成果物

## 概要

Mochimakiプロジェクト向けのMermaid.jsベースシステムグラフ描画機能をDockerコンテナとして実装しました。このコンテナは、システム構成のMermaidテキストから高解像度PNG画像を生成し、インタラクティブなWeb UIで表示します。

## 🚨 重要な変更点

### 当初の仕様からの変更
**MERMAID_CONTAINER_DEVELOPMENT.md**ではSVGフォーマットでの描画を想定していましたが、Node.js環境でのSVG生成に技術的な制約があったため、**PNGフォーマット**での描画に変更しました。

### 変更理由
1. **Node.js環境の制約**: Mermaid.jsのSVG生成がNode.js環境で正常に動作しない
2. **Puppeteerの必要性**: 高品質な画像生成にはPuppeteer（Chrome）が必要
3. **実用性の向上**: PNG形式でも十分な品質と拡大表示が可能

## 🏗️ アーキテクチャ

### 技術スタック
- **バックエンド**: Node.js 18 + Express.js + WebSocket
- **描画エンジン**: Mermaid.js + Puppeteer
- **コンテナ化**: Docker (Alpine Linux)
- **フロントエンド**: HTML/CSS/JavaScript

### ファイル構造
```
mermaid-container/
├── Dockerfile                 # Chrome依存関係付きDocker設定
├── package.json              # Node.js依存関係（Puppeteer含む）
├── server.js                 # Express + WebSocket + PNG生成
├── public/
│   ├── index.html            # メイン表示ページ（ズーム・パン機能）
│   ├── viewer.html           # シンプルビューページ
│   ├── style.css             # PNG画像用スタイル
│   └── script.js             # インタラクティブ機能
├── test_update.js            # テストスクリプト
└── README.md                 # このファイル
```

## 🚀 機能

### 実装済み機能
1. **高解像度PNG生成**: 3000x2000ピクセルの高品質画像
2. **リアルタイム更新**: WebSocketによる即座の反映
3. **インタラクティブ表示**: ズーム・パン・移動機能
4. **ダークテーマ**: システムグラフに最適化された表示
5. **API エンドポイント**: ヘルスチェック、更新通知、画像取得
6. **エラーハンドリング**: 適切なエラー処理とクリーンアップ

### 表示方式
- **PNG画像ベース**: SVGの代わりに高解像度PNGを使用
- **img要素**: ブラウザ標準のimg要素で表示
- **カスタムズーム**: JavaScriptによる画像の拡大・縮小・移動
- **レスポンシブ**: 画面サイズに応じた表示調整

## 🔧 技術的実装

### PNG生成プロセス
1. **Mermaidテキスト受信**: HTTP POSTでMermaidコンテンツを受信
2. **HTML生成**: Mermaid.js CDNを含むHTMLページを作成
3. **Puppeteer実行**: ChromeでHTMLをレンダリング
4. **スクリーンショット**: 高解像度PNGとして保存
5. **ファイル管理**: 一時ファイルの自動クリーンアップ

### 環境設定
```dockerfile
# Chrome依存関係
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"
```

## 🌐 アクセス方法

### Web UI
- **メインページ**: http://localhost:8080
- **シンプルビュー**: http://localhost:8080/viewer
- **API ヘルスチェック**: http://localhost:8080/api/health
- **グラフ画像**: http://localhost:8080/api/graph-image

### API エンドポイント
```javascript
// グラフ更新
POST /api/update
{
  "mermaid_content": "graph TD\n    A[Start] --> B[End]",
  "file_path": "/path/to/output_mermaid.txt",
  "timestamp": "2024-01-01T12:00:00Z"
}

// 現在のグラフ取得
GET /api/graph

// ヘルスチェック
GET /api/health
```

## 🧪 テスト方法

### コンテナ起動
```bash
# イメージビルド
docker build -t mochimaki-mermaid-system-graph-viewer mermaid-container/

# コンテナ起動
docker run -d --name mochimaki-mermaid-system-graph-viewer -p 8080:8080 mochimaki-mermaid-system-graph-viewer

# テスト実行
docker exec -it mochimaki-mermaid-system-graph-viewer node test_update.js
```

### 期待される結果
```
🚀 Mermaidコンテナテスト開始...
📡 サーバーヘルスチェック中...
✅ サーバー正常: healthy
📤 テストデータを送信中...
✅ グラフ更新成功: Graph updated successfully
📊 ブラウザで確認: http://localhost:8080
```

## 🔄 Mochimakiプロジェクトとの統合

### 必要な実装
1. **通知関数**: `notify_mermaid_container()`の実装
2. **ブラウザ起動**: Fletアプリからのブラウザ起動機能
3. **ポート動的取得**: docker-compose psからのポート情報取得

### 統合ポイント
- **Mochimaki.py**: UI統合（ボタンクリック処理）
- **utils/**: 通知機能とコンテナ管理機能
- **auto_generate_mermaid_file()**: 呼び出し後の通知処理追加

## 📋 制限事項

### 現在の制限
1. **PNG形式**: SVGの代わりにPNGを使用（ベクター形式ではない）
2. **ファイルサイズ**: 高解像度のためファイルサイズが大きい
3. **生成時間**: Puppeteer起動のため数秒の処理時間が必要
4. **メモリ使用量**: Chromeプロセスのため比較的多いメモリを消費

### 将来の改善点
1. **SVG対応**: Node.js環境でのSVG生成技術の進歩を待つ
2. **キャッシュ機能**: 同じコンテンツの再生成を避ける
3. **非同期処理**: バックグラウンドでの画像生成
4. **最適化**: メモリ使用量と処理時間の改善

## 🎯 成果物の評価

### 達成した目標
- ✅ ローカル描画機能の実現
- ✅ リアルタイム更新機能
- ✅ インタラクティブ操作（ズーム・パン）
- ✅ Dockerコンテナ化
- ✅ Web UI実装

### 技術的成果
- ✅ Node.js + Puppeteer環境でのMermaid.js描画
- ✅ 高解像度PNG生成
- ✅ WebSocketリアルタイム通信
- ✅ 適切なエラーハンドリング

## 📞 フィードバック要請

この成果物をMochimakiプロジェクトに適用するにあたり、以下の点についてフィードバックをお願いします：

1. **PNG形式での表示**: SVGの代わりにPNGを使用することの可否
2. **パフォーマンス**: 生成時間とメモリ使用量の許容範囲
3. **統合方法**: Fletアプリとの統合方式の確認
4. **追加機能**: 必要な追加機能の有無
5. **運用要件**: 本番環境での運用要件

---

**注意**: この成果物は技術的制約により当初の仕様から変更されています。Mochimakiプロジェクトへの適用前に、上記の変更点と制限事項を十分にご確認ください。

## 🎯 成果物の評価

### 達成した目標
- ✅ ローカル描画機能の実現
- ✅ リアルタイム更新機能
- ✅ インタラクティブ操作（ズーム・パン）
- ✅ Dockerコンテナ化
- ✅ Web UI実装

### 技術的成果
- ✅ Node.js + Puppeteer環境でのMermaid.js描画
- ✅ 高解像度PNG生成
- ✅ WebSocketリアルタイム通信
- ✅ 適切なエラーハンドリング

## 📞 フィードバック要請

この成果物をMochimakiプロジェクトに適用するにあたり、以下の点についてフィードバックをお願いします：

1. **PNG形式での表示**: SVGの代わりにPNGを使用することの可否
2. **パフォーマンス**: 生成時間とメモリ使用量の許容範囲
3. **統合方法**: Fletアプリとの統合方式の確認
4. **追加機能**: 必要な追加機能の有無
5. **運用要件**: 本番環境での運用要件

---

**注意**: この成果物は技術的制約により当初の仕様から変更されています。Mochimakiプロジェクトへの適用前に、上記の変更点と制限事項を十分にご確認ください。 