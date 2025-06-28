import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import mermaid from 'mermaid';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;

// WebSocketサーバーを作成
const server = createServer(app);
const wss = new WebSocketServer({ server });

// グローバル変数
let currentMermaidContent = '';
let currentGraphData = null;
let currentPngPath = null;

// Mermaid.jsの初期化
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Arial, sans-serif'
});

// 一時ファイル用ディレクトリ
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// ミドルウェアの設定
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mermaid-system-graph-viewer'
  });
});

// 現在のグラフデータ取得エンドポイント
app.get('/api/graph', (req, res) => {
  res.json({
    mermaidContent: currentMermaidContent,
    graphData: currentGraphData,
    pngPath: currentPngPath,
    timestamp: new Date().toISOString()
  });
});

// PNG画像取得エンドポイント
app.get('/api/graph-image', (req, res) => {
  if (!currentPngPath || !fs.existsSync(currentPngPath)) {
    return res.status(404).json({
      error: 'Graph image not found'
    });
  }
  
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(currentPngPath).pipe(res);
});

// ファイル更新通知エンドポイント
app.post('/api/update', async (req, res) => {
  try {
    const { mermaid_content, file_path, timestamp } = req.body;
    
    if (!mermaid_content) {
      return res.status(400).json({
        error: 'mermaid_content is required'
      });
    }

    // 新しいMermaidコンテンツを保存
    currentMermaidContent = mermaid_content;
    
    // 一時ファイル名を生成
    const timestampStr = new Date().getTime();
    const inputFile = path.join(tempDir, `input_${timestampStr}.mmd`);
    const outputFile = path.join(tempDir, `output_${timestampStr}.png`);
    
    try {
      // Mermaidテキストを一時ファイルに保存
      fs.writeFileSync(inputFile, mermaid_content, 'utf8');
      
      // Mermaid.jsとPuppeteerを使用してPNGを生成
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        protocolTimeout: 60000
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 3000, height: 2000 });
      
      // HTMLページを作成（Mermaid.jsをブラウザで実行）
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: #1a1a1a; 
              font-family: Arial, sans-serif;
            }
            svg { 
              width: 100%; 
              height: 100%; 
              background: #1a1a1a;
            }
          </style>
        </head>
        <body>
          <div class="mermaid">
            ${mermaid_content}
          </div>
          <script>
            mermaid.initialize({
              startOnLoad: true,
              theme: 'dark',
              securityLevel: 'loose',
              fontFamily: 'Arial, sans-serif'
            });
            mermaid.init();
          </script>
        </body>
        </html>
      `;
      
      const htmlFile = path.join(tempDir, `temp_${timestampStr}.html`);
      fs.writeFileSync(htmlFile, htmlContent, 'utf8');
      
      // ページを読み込んでPNGを生成
      await page.goto(`file://${htmlFile}`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Mermaid.jsの初期化完了を待機
      await page.waitForFunction(() => {
        return document.querySelector('.mermaid svg') !== null;
      }, { timeout: 15000 });
      
      // SVGが完全に描画されるまで待機
      await page.waitForFunction(() => {
        const svg = document.querySelector('.mermaid svg');
        return svg && svg.getBoundingClientRect().width > 0;
      }, { timeout: 10000 });
      
      await page.screenshot({ 
        path: outputFile, 
        fullPage: true,
        omitBackground: false
      });
      
      await browser.close();
      
      // 一時HTMLファイルを削除
      if (fs.existsSync(htmlFile)) {
        fs.unlinkSync(htmlFile);
      }
      
      // 古いPNGファイルを削除
      if (currentPngPath && fs.existsSync(currentPngPath)) {
        fs.unlinkSync(currentPngPath);
      }
      
      // 古い入力ファイルを削除
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }
      
      currentPngPath = outputFile;
      currentGraphData = {
        mermaidContent: mermaid_content,
        pngPath: `/api/graph-image`,
        timestamp: timestamp || new Date().toISOString()
      };
      
      // WebSocketでクライアントに通知
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'graph_updated',
            data: currentGraphData
          }));
        }
      });
      
      console.log('Graph updated successfully - PNG generated');
      res.json({
        success: true,
        message: 'Graph updated successfully',
        pngPath: '/api/graph-image',
        timestamp: new Date().toISOString()
      });
      
    } catch (renderError) {
      console.error('Mermaid render error:', renderError);
      
      // 一時ファイルをクリーンアップ
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
      
      res.status(500).json({
        error: 'Failed to render Mermaid diagram',
        details: renderError.message
      });
    }
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// WebSocket接続処理
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // 現在のグラフデータを送信
  if (currentGraphData) {
    ws.send(JSON.stringify({
      type: 'current_graph',
      data: currentGraphData
    }));
  }
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// メインページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 専用ビューワーページ
app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// サーバー起動
server.listen(PORT, () => {
  console.log(`Mermaid System Graph Viewer running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Main page: http://localhost:${PORT}/`);
  console.log(`Viewer page: http://localhost:${PORT}/viewer`);
  console.log(`Graph image: http://localhost:${PORT}/api/graph-image`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 