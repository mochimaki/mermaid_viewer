import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// テスト用のMermaidコンテンツ（output_mermaid.txtの内容）
const testMermaidContent = `%%{init: {'theme': 'dark'}}%%
graph TD
    N0["Host Machine"]
    class N0 section;
    N1["App: Pattern_Generator_host"]
    class N1 host_app;
    N2["Data: C:\\Users\\cbr60\\Documents\\Docker_projects\\m2k\\m2k-app19\\data\\pkl_files"]
    class N2 data;
    N3["Data: C:\\Users\\cbr60\\Documents\\Docker_projects\\m2k\\m2k-app20\\data\\csv_files"]
    class N3 data;
    N4["Device: m2k (Target: 192.168.3.2)"]
    class N4 device;
    N5["Device: some_device (Target: 192.168.3.2)"]
    class N5 device;
    N6["App: Function_Generator_host"]
    class N6 host_app;
    N7["Device: some_device (Target: 192.168.3.3)"]
    class N7 device;
    N8["App: Pomodoro_Timer_host"]
    class N8 host_app;
    N9["Docker"]
    class N9 docker_section;
    N10["Container: fg_pg (Image: m2k:app20)"]
    class N10 container;
    N11["App: Pattern_Generator_fg_pg (Port: 8550)"]
    class N11 app;
    N12["Data: C:\\Users\\cbr60\\Documents\\Docker_projects\\m2k\\m2k-app20\\data\\pkl_files"]
    class N12 data;
    N13["Device: m2k (Target: 192.168.3.1)"]
    class N13 device;
    N14["App: Function_Generator_fg_pg (Port: 8551)"]
    class N14 app;
    N15["Container: fg_pg_pt (Image: m2k:app20)"]
    class N15 container;
    N16["App: Pattern_Generator_fg_pg_pt (Port: 8550)"]
    class N16 app;
    N17["App: Function_Generator_fg_pg_pt (Port: 8551)"]
    class N17 app;
    N18["App: Pomodoro_Timer_fg_pg_pt (Port: 8552)"]
    class N18 app;
    N0 --> N1
    N1 --> N2
    N1 --> N3
    N1 --> N4
    N1 --> N5
    N0 --> N6
    N6 --> N4
    N6 --> N7
    N0 --> N8
    N8 --> N7
    N9 --> N10
    N10 --> N11
    N11 --> N12
    N11 --> N3
    N11 --> N13
    N11 --> N5
    N10 --> N14
    N14 --> N4
    N14 --> N5
    N9 --> N15
    N15 --> N16
    N16 --> N12
    N16 --> N3
    N16 --> N13
    N16 --> N5
    N15 --> N17
    N17 --> N13
    N17 --> N5
    N15 --> N18
    N18 --> N5
    classDef host fill:#2d3748,stroke:#e2e8f0,stroke-width:2px,color:#ffffff;
    classDef section fill:#38a169,stroke:#e2e8f0,stroke-width:3px,color:#ffffff;
    classDef docker_section fill:#3182ce,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;
    classDef app fill:#805ad5,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;
    classDef host_app fill:#805ad5,stroke:#e2e8f0,stroke-width:3px,color:#ffffff;
    classDef device fill:#d69e2e,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;
    classDef container fill:#38a169,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;
    classDef data fill:#2f855a,stroke:#e2e8f0,stroke-width:1px,color:#ffffff;`;

// Mermaidコンテナにデータを送信する関数
async function sendMermaidUpdate(mermaidContent, serverUrl = 'http://localhost:8080') {
    try {
        const response = await fetch(`${serverUrl}/api/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mermaid_content: mermaidContent,
                file_path: '../output_mermaid.txt',
                timestamp: new Date().toISOString()
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ グラフ更新成功:', result.message);
            console.log('📊 ブラウザで確認: http://localhost:8080');
            console.log('📱 シンプルビュー: http://localhost:8080/viewer');
        } else {
            console.error('❌ グラフ更新失敗:', result.error);
        }
        
        return result;
    } catch (error) {
        console.error('❌ 通信エラー:', error.message);
        return null;
    }
}

// ヘルスチェック関数
async function checkHealth(serverUrl = 'http://localhost:8080') {
    try {
        const response = await fetch(`${serverUrl}/api/health`);
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ サーバー正常:', result.status);
            return true;
        } else {
            console.error('❌ サーバー異常:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ サーバー接続エラー:', error.message);
        return false;
    }
}

// メイン実行関数
async function main() {
    console.log('🚀 Mermaidコンテナテスト開始...\n');
    
    // サーバーのヘルスチェック
    console.log('📡 サーバーヘルスチェック中...');
    const isHealthy = await checkHealth();
    
    if (!isHealthy) {
        console.log('\n💡 サーバーが起動していない可能性があります。');
        console.log('   以下のコマンドでサーバーを起動してください:');
        console.log('   npm start');
        console.log('   または');
        console.log('   docker run -d --name mochimaki-mermaid-system-graph-viewer -p 8080:8080 mochimaki-mermaid-system-graph-viewer');
        return;
    }
    
    // テストデータの送信
    console.log('\n📤 テストデータを送信中...');
    await sendMermaidUpdate(testMermaidContent);
    
    console.log('\n🎉 テスト完了！');
    console.log('📖 使用方法:');
    console.log('   - メインページ: http://localhost:8080');
    console.log('   - シンプルビュー: http://localhost:8080/viewer');
    console.log('   - API ヘルスチェック: http://localhost:8080/api/health');
}

// スクリプトが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {
    sendMermaidUpdate,
    checkHealth,
    testMermaidContent
}; 