# Mochimaki System Graph Viewer

Mochimakiプロジェクト用のMermaid.jsベースシステムグラフビューワーです。システム構成図をインタラクティブに表示・操作できます。

## 機能

- **リアルタイムグラフ表示**: Mermaid.jsによる美しいシステム構成図の描画
- **インタラクティブ操作**: ズーム・パン・検索・ハイライト機能
- **リアルタイム更新**: WebSocketによる即座のグラフ更新
- **エクスポート機能**: PNG・SVG形式でのグラフ保存
- **テーマ切り替え**: ダーク・ライト・フォレスト・ニュートラルテーマ
- **レスポンシブデザイン**: モバイル・デスクトップ対応
- **全画面表示**: フルスクリーンモードでの表示

## 技術スタック

- **Node.js**: サーバーサイド実行環境
- **Express.js**: Webサーバーフレームワーク
- **Mermaid.js**: グラフ描画エンジン
- **WebSocket**: リアルタイム通信
- **Docker**: コンテナ化

## クイックスタート

### Dockerを使用した起動

```bash
# コンテナをビルド
docker build -t mochimaki-mermaid-system-graph-viewer .

# コンテナを起動
docker run -d \
  --name mochimaki-mermaid-system-graph-viewer \
  -p 8080:8080 \
  mochimaki-mermaid-system-graph-viewer
```

### ローカル開発

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# 本番サーバーを起動
npm start
```

## API仕様

### エンドポイント

#### GET /api/health
ヘルスチェックエンドポイント

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "mermaid-system-graph-viewer"
}
```

#### GET /api/graph
現在のグラフデータを取得

**レスポンス:**
```json
{
  "mermaidContent": "%%{init: {'theme': 'dark'}}%%\ngraph TD\n    A[Start] --> B[End]",
  "graphData": {
    "svg": "<svg>...</svg>",
    "mermaidContent": "%%{init: {'theme': 'dark'}}%%\ngraph TD\n    A[Start] --> B[End]",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### POST /api/update
グラフデータの更新通知

**リクエスト:**
```json
{
  "mermaid_content": "%%{init: {'theme': 'dark'}}%%\ngraph TD\n    A[Start] --> B[End]",
  "file_path": "/path/to/output_mermaid.txt",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Graph updated successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### WebSocket

#### 接続
```
ws://localhost:8080/ws/graph-updates
```

#### メッセージ形式

**グラフ更新通知:**
```json
{
  "type": "graph_updated",
  "data": {
    "svg": "<svg>...</svg>",
    "mermaidContent": "%%{init: {'theme': 'dark'}}%%\ngraph TD\n    A[Start] --> B[End]",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**現在のグラフ:**
```json
{
  "type": "current_graph",
  "data": {
    "svg": "<svg>...</svg>",
    "mermaidContent": "%%{init: {'theme': 'dark'}}%%\ngraph TD\n    A[Start] --> B[End]",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**エラー通知:**
```json
{
  "type": "error",
  "message": "エラーメッセージ"
}
```

## 使用方法

### メインページ (/)
完全なインタラクティブ機能付きのグラフビューワー

**機能:**
- ズーム・パン操作
- ノード検索・ハイライト
- テーマ切り替え
- PNG・SVGエクスポート
- 全画面表示
- リアルタイム更新

### 専用ビューワー (/viewer)
シンプルなグラフ表示専用ページ

**機能:**
- 基本的なグラフ表示
- 更新・全画面・エクスポート
- 軽量で高速

## キーボードショートカット

### メインページ
- `Ctrl/Cmd + +`: 拡大
- `Ctrl/Cmd + -`: 縮小
- `Ctrl/Cmd + 0`: ビューのリセット
- `Ctrl/Cmd + F`: 検索フォーカス
- `Escape`: 検索クリア
- `F11`: 全画面切り替え

### 専用ビューワー
- `Ctrl/Cmd + R`: グラフ更新
- `Ctrl/Cmd + F`: 全画面切り替え
- `Ctrl/Cmd + S`: エクスポート
- `F5`: グラフ更新
- `F11`: 全画面切り替え

## 設定

### 環境変数

- `PORT`: サーバーポート (デフォルト: 8080)
- `NODE_ENV`: 実行環境 (development/production)

### Mermaid.js設定

`server.js`でMermaid.jsの設定をカスタマイズできます：

```javascript
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis'
  },
  securityLevel: 'loose'
});
```

## 開発

### プロジェクト構造

```
mermaid-container/
├── Dockerfile              # Docker設定
├── package.json            # 依存関係
├── server.js               # Express.jsサーバー
├── public/                 # 静的ファイル
│   ├── index.html         # メインページ
│   ├── viewer.html        # 専用ビューワー
│   ├── style.css          # スタイルシート
│   └── script.js          # インタラクティブ機能
└── README.md              # ドキュメント
```

### 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（ホットリロード）
npm run dev

# 本番ビルド
npm start

# テスト実行
npm test
```

### デバッグ

開発時は`nodemon`を使用してホットリロードが有効になります。

```bash
npm run dev
```

## トラブルシューティング

### よくある問題

1. **グラフが表示されない**
   - ブラウザのコンソールでエラーを確認
   - Mermaid.jsの構文エラーをチェック
   - WebSocket接続状態を確認

2. **WebSocket接続エラー**
   - ファイアウォール設定を確認
   - ポート8080が開放されているか確認
   - プロキシ設定を確認

3. **パフォーマンス問題**
   - 大きなグラフの場合は段階的描画を検討
   - ブラウザのメモリ使用量を監視
   - 不要なアニメーションを無効化

### ログ

サーバーログで詳細な情報を確認できます：

```bash
# Dockerログ
docker logs mochimaki-mermaid-system-graph-viewer

# ローカルログ
npm start
```

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 更新履歴

### v1.0.0
- 初期リリース
- 基本的なグラフ表示機能
- インタラクティブ操作
- リアルタイム更新
- エクスポート機能 