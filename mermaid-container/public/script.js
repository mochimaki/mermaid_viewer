// グローバル変数
let ws = null;
let currentGraphData = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let currentScale = 1;
let currentTranslate = { x: 0, y: 0 };
let searchResults = [];
let currentSearchIndex = 0;

// DOM要素
const graphContent = document.getElementById('graphContent');
const graphWrapper = document.getElementById('graphWrapper');
const tooltip = document.getElementById('tooltip');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearch');
const connectionStatus = document.getElementById('connectionStatus');
const graphInfo = document.getElementById('graphInfo');
const lastUpdate = document.getElementById('lastUpdate');
const nodeCount = document.getElementById('nodeCount');
const edgeCount = document.getElementById('edgeCount');
const themeSelect = document.getElementById('themeSelect');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    initializeEventListeners();
    loadInitialGraph();
});

// WebSocket接続の初期化
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/graph-updates`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        updateConnectionStatus(true);
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('WebSocket message parse error:', error);
        }
    };
    
    ws.onclose = () => {
        updateConnectionStatus(false);
        console.log('WebSocket disconnected');
        // 再接続を試行
        setTimeout(initializeWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
}

// WebSocketメッセージの処理
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'graph_updated':
        case 'current_graph':
            updateGraph(message.data);
            break;
        case 'error':
            showError(message.message);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

// 接続状態の更新
function updateConnectionStatus(connected) {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('span:last-child');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = '接続済み';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = '未接続';
    }
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // ズーム・パン機能
    graphContent.addEventListener('mousedown', startPan);
    graphContent.addEventListener('mousemove', pan);
    graphContent.addEventListener('mouseup', stopPan);
    graphContent.addEventListener('wheel', handleZoom);
    
    // ボタン機能
    document.getElementById('zoomIn').addEventListener('click', () => zoom(1.2));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(0.8));
    document.getElementById('resetZoom').addEventListener('click', resetView);
    document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('exportPNG').addEventListener('click', exportPNG);
    document.getElementById('exportSVG').addEventListener('click', exportSVG);
    
    // 検索機能
    searchBtn.addEventListener('click', performSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // テーマ変更
    themeSelect.addEventListener('change', changeTheme);
    
    // ツールチップ
    graphContent.addEventListener('mouseover', showTooltip);
    graphContent.addEventListener('mouseout', hideTooltip);
    graphContent.addEventListener('mousemove', moveTooltip);
}

// 初期グラフの読み込み
async function loadInitialGraph() {
    try {
        const response = await fetch('/api/graph');
        const data = await response.json();
        
        if (data.graphData) {
            updateGraph(data.graphData);
        } else {
            showLoadingMessage('グラフデータがありません');
        }
    } catch (error) {
        console.error('Failed to load initial graph:', error);
        showError('グラフの読み込みに失敗しました');
    }
}

// グラフの更新
async function updateGraph(graphData) {
    try {
        currentGraphData = graphData;
        
        if (graphData.pngPath) {
            // PNG画像を表示
            const img = document.createElement('img');
            img.src = graphData.pngPath + '?t=' + Date.now(); // キャッシュ回避
            img.alt = 'System Graph';
            img.className = 'graph-image';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.display = 'block';
            
            // 画像読み込み完了時の処理
            img.onload = () => {
                graphContent.innerHTML = '';
                graphContent.appendChild(img);
                addInteractiveFeatures();
                updateGraphInfo(graphData);
                updateFooterInfo(graphData);
                graphContent.classList.add('fade-in');
                setTimeout(() => graphContent.classList.remove('fade-in'), 500);
            };
            
            img.onerror = () => {
                showError('画像の読み込みに失敗しました');
            };
        } else {
            showLoadingMessage('グラフデータがありません');
        }
        
    } catch (error) {
        console.error('Failed to update graph:', error);
        showError('グラフの更新に失敗しました');
    }
}

// インタラクティブ機能の追加
function addInteractiveFeatures() {
    const img = graphContent.querySelector('.graph-image');
    if (!img) return;
    
    // 画像のクリックイベント
    img.addEventListener('click', (e) => {
        e.stopPropagation();
        // 画像クリック時の処理（必要に応じて実装）
    });
}

// パン機能
function startPan(e) {
    if (e.target.tagName === 'BUTTON') return;
    
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    graphContent.classList.add('panning');
    e.preventDefault();
}

function pan(e) {
    if (!isPanning) return;
    
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    
    currentTranslate.x += deltaX;
    currentTranslate.y += deltaY;
    
    panStart = { x: e.clientX, y: e.clientY };
    
    updateTransform();
}

function stopPan() {
    isPanning = false;
    graphContent.classList.remove('panning');
}

// ズーム機能
function handleZoom(e) {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = graphContent.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    zoom(zoomFactor, mouseX, mouseY);
}

function zoom(factor, centerX = null, centerY = null) {
    const oldScale = currentScale;
    currentScale *= factor;
    currentScale = Math.max(0.1, Math.min(5, currentScale));
    
    if (centerX !== null && centerY !== null) {
        const scaleRatio = currentScale / oldScale;
        currentTranslate.x = centerX - (centerX - currentTranslate.x) * scaleRatio;
        currentTranslate.y = centerY - (centerY - currentTranslate.y) * scaleRatio;
    }
    
    updateTransform();
}

// ビューのリセット
function resetView() {
    currentScale = 1;
    currentTranslate = { x: 0, y: 0 };
    updateTransform();
}

// トランスフォームの更新
function updateTransform() {
    const img = graphContent.querySelector('.graph-image');
    if (!img) return;
    
    img.style.transform = `translate(${currentTranslate.x}px, ${currentTranslate.y}px) scale(${currentScale})`;
}

// 全画面切り替え
function toggleFullscreen() {
    const container = document.querySelector('.container');
    
    if (container.classList.contains('fullscreen')) {
        container.classList.remove('fullscreen');
        document.exitFullscreen().catch(() => {});
    } else {
        container.classList.add('fullscreen');
        container.requestFullscreen().catch(() => {});
    }
}

// PNGエクスポート
async function exportPNG() {
    try {
        const img = graphContent.querySelector('.graph-image');
        if (!img) {
            showError('エクスポートするグラフがありません');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 画像の実際のサイズを取得
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        
        // 画像をキャンバスに描画
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
        
        // PNGとしてダウンロード
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mochimaki-system-graph-${new Date().toISOString().slice(0, 19)}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('PNG export error:', error);
        showError('PNGエクスポートに失敗しました');
    }
}

// SVGエクスポート（PNGの代替として）
function exportSVG() {
    try {
        const img = graphContent.querySelector('.graph-image');
        if (!img) {
            showError('エクスポートするグラフがありません');
            return;
        }
        
        // PNG画像をSVGとしてラップ
        const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}">
                <image href="${img.src}" width="${img.naturalWidth}" height="${img.naturalHeight}"/>
            </svg>
        `;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mochimaki-system-graph-${new Date().toISOString().slice(0, 19)}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('SVG export error:', error);
        showError('SVGエクスポートに失敗しました');
    }
}

// 検索機能（PNG画像では検索不可のため、簡易版）
function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    showError('PNG画像では検索機能は利用できません。元のMermaidテキストで検索してください。');
}

// 検索のクリア
function clearSearch() {
    searchInput.value = '';
    searchResults = [];
    currentSearchIndex = 0;
    updateSearchInfo();
}

// 検索情報の更新
function updateSearchInfo() {
    updateGraphInfo(currentGraphData);
}

// テーマ変更
function changeTheme() {
    const theme = themeSelect.value;
    showError(`テーマ変更にはサーバー側での再生成が必要です。現在のテーマ: ${theme}`);
}

// ツールチップ機能
function showTooltip(e) {
    const target = e.target;
    if (target.tagName === 'IMG') {
        tooltip.textContent = 'システムグラフ画像';
        tooltip.classList.add('show');
    }
}

function hideTooltip() {
    tooltip.classList.remove('show');
}

function moveTooltip(e) {
    if (tooltip.classList.contains('show')) {
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY - 10 + 'px';
    }
}

// グラフ情報の更新
function updateGraphInfo(graphData) {
    if (!graphData) {
        graphInfo.innerHTML = '<p>グラフが読み込まれていません</p>';
        return;
    }
    
    const img = graphContent.querySelector('.graph-image');
    if (!img) return;
    
    graphInfo.innerHTML = `
        <p>画像サイズ: ${img.naturalWidth} × ${img.naturalHeight}</p>
        <p>表示スケール: ${(currentScale * 100).toFixed(1)}%</p>
        <p>最終更新: ${new Date(graphData.timestamp || Date.now()).toLocaleString('ja-JP')}</p>
    `;
}

// フッター情報の更新
function updateFooterInfo(graphData) {
    if (!graphData) return;
    
    const img = graphContent.querySelector('.graph-image');
    if (!img) return;
    
    nodeCount.textContent = `画像サイズ: ${img.naturalWidth} × ${img.naturalHeight}`;
    edgeCount.textContent = `スケール: ${(currentScale * 100).toFixed(1)}%`;
    lastUpdate.textContent = `最終更新: ${new Date(graphData.timestamp || Date.now()).toLocaleString('ja-JP')}`;
}

// エラー表示
function showError(message) {
    console.error(message);
    alert(message);
}

// ローディングメッセージ表示
function showLoadingMessage(message) {
    graphContent.innerHTML = `<div class="loading">${message}</div>`;
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case '=':
            case '+':
                e.preventDefault();
                zoom(1.2);
                break;
            case '-':
                e.preventDefault();
                zoom(0.8);
                break;
            case '0':
                e.preventDefault();
                resetView();
                break;
            case 'f':
                e.preventDefault();
                searchInput.focus();
                break;
        }
    } else {
        switch (e.key) {
            case 'Escape':
                clearSearch();
                break;
            case 'F11':
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    }
}); 