 
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// 設定資料夾路徑 (預設為腳本所在目錄)
const wavDir = __dirname;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 播放音樂的函式
function playAudio(filePath) {
    // 使用 cvlc (console VLC)，播放完自動退出，並把多餘的輸出隱藏
    exec(`cvlc --play-and-exit "${filePath}" > /dev/null 2>&1`, (error) => {
        if (error) {
            // 如果沒裝 vlc 或 cvlc，這邊會報錯
            // console.error("播放失敗，請確認已安裝 vlc");
        }
    });
}

async function processFiles() {
    // 取得所有 .wav 檔並按照檔名排序 (001.wav, 002.wav...)
    const files = fs.readdirSync(wavDir)
        .filter(file => file.endsWith('.wav'))
        .sort();

    if (files.length === 0) {
        console.log("找不到任何 .wav 檔案！");
        rl.close();
        return;
    }

    console.log(`🎶 找到 ${files.length} 個音檔，準備開始打軸！`);
    console.log(`提示: 輸入 'r' 可以重聽一次，輸入 'skip' 可以跳過當前檔案。`);

    for (const file of files) {
        const txtFile = file.replace('.wav', '.txt');
        const txtPath = path.join(wavDir, txtFile);
        const wavPath = path.join(wavDir, file);

        // 如果 .txt 已經存在就跳過，這樣你隨時中斷腳本下次還能接續打
        if (fs.existsSync(txtPath)) {
            console.log(`\n⏭️  [跳過] ${txtFile} 已經存在。`);
            continue;
        }

        console.log(`\n================================`);
        console.log(`▶️  正在處理: ${file}`);

        // 播放音檔
        playAudio(wavPath);

        // 等待使用者輸入
        let userInput = await new Promise(resolve => {
            rl.question(`✏️  請輸入羅馬音: `, resolve);
        });

        userInput = userInput.trim();

        // 處理特殊指令
        while (userInput.toLowerCase() === 'r') {
            console.log(`🔄 重新播放 ${file}...`);
            playAudio(wavPath);
            userInput = await new Promise(resolve => {
                rl.question(`✏️  請輸入羅馬音 (或 'r' 重聽): `, resolve);
            });
            userInput = userInput.trim();
        }

        if (userInput.toLowerCase() === 'skip') {
            console.log(`⏩ 已跳過 ${file}`);
            continue;
        }

        // 儲存到 .txt 檔案
        fs.writeFileSync(txtPath, userInput, 'utf8');
        console.log(`✅ 已儲存 -> ${txtFile}: [ ${userInput} ]`);
    }

    console.log('\n🎉 太神啦！所有檔案都處理完畢了！');
    rl.close();
}

// 執行主程式
processFiles();
