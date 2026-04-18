const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// ⚙️ 設定區
// ==========================================
const PADDING_SEC = 0.3; // 要增加的秒數 (0.3秒)
const HTK_OFFSET = PADDING_SEC * 10000000; // 轉換為 HTK 時間單位 (3,000,000)

const baseDir = __dirname;
const wavDir = path.join(baseDir, 'wav');
const labDir = path.join(baseDir, 'lab');

// 安全第一：輸出到新資料夾，絕不弄壞你的原檔
const outDir = path.join(baseDir, 'padded_dataset');
const outWavDir = path.join(outDir, 'wav');
const outLabDir = path.join(outDir, 'lab');

[outDir, outWavDir, outLabDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

console.log("🚀 開始執行頭尾補白與合併作業...");

const files = fs.readdirSync(labDir).filter(f => f.endsWith('.lab'));
let successCount = 0;

try {
    // 檢查有沒有裝 ffmpeg
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error("❌ 系統找不到 ffmpeg，請先執行: sudo apt install ffmpeg");
    process.exit(1);
}

files.forEach(file => {
    const baseName = file.replace('.lab', '');
    const inWav = path.join(wavDir, baseName + '.wav');
    const inLab = path.join(labDir, file);
    const outWav = path.join(outWavDir, baseName + '.wav');
    const outLab = path.join(outLabDir, file);

    if (!fs.existsSync(inWav)) {
        console.warn(`⚠️ 找不到對應的音檔 ${baseName}.wav，跳過。`);
        return;
    }

    // --------------------------------------------------
    // 1. 處理 Audio (利用 ffmpeg 頭尾各加 0.3 秒靜音)
    // adelay=300:all=1 代表開頭加 300ms 靜音 (所有聲道)
    // apad=pad_dur=0.3 代表結尾加 0.3 秒靜音
    // --------------------------------------------------
    try {
        execSync(`ffmpeg -y -i "${inWav}" -af "adelay=${PADDING_SEC * 1000}:all=1,apad=pad_dur=${PADDING_SEC}" "${outWav}"`, { stdio: 'ignore' });
    } catch (e) {
        console.error(`❌ 處理音檔失敗: ${baseName}.wav`);
        return;
    }

    // --------------------------------------------------
    // 2. 處理 Label (時間軸整體平移 + 邏輯合併)
    // --------------------------------------------------
    let lines = fs.readFileSync(inLab, 'utf8').trim().split('\n');
    let entries = lines.map(line => {
        let parts = line.trim().split(/\s+/);
        return { 
            start: parseInt(parts[0], 10) + HTK_OFFSET, // 全部往後推 0.3 秒
            end: parseInt(parts[1], 10) + HTK_OFFSET, 
            phone: parts[2] 
        };
    });

    if (entries.length === 0) return;

    // 處理【開頭】
    if (entries[0].phone === 'pau') {
        // 如果本來就有 pau，直接把它拉長到最前面 (從 0 開始)
        entries[0].start = 0;
    } else {
        // 如果沒有 pau，塞一個新的 0.3 秒 pau 在最前面
        entries.unshift({ start: 0, end: HTK_OFFSET, phone: 'pau' });
    }

    // 處理【結尾】
    let last = entries[entries.length - 1];
    if (last.phone === 'pau') {
        // 如果本來就有 pau，把它的結尾再往後延 0.3 秒
        last.end += HTK_OFFSET;
    } else {
        // 如果沒有 pau，塞一個新的 0.3 秒 pau 在最後面
        entries.push({ start: last.end, end: last.end + HTK_OFFSET, phone: 'pau' });
    }

    // 寫入新的 .lab 檔
    let output = entries.map(e => `${e.start} ${e.end} ${e.phone}`).join('\n') + '\n';
    fs.writeFileSync(outLab, output, 'utf8');

    successCount++;
    process.stdout.write(`\r✅ 已處理完成: ${successCount} / ${files.length}`);
});

console.log(`\n\n🎉 太完美了！成功為 ${successCount} 個檔案加上頭尾 0.3 秒的緩衝！`);
console.log(`📂 新的完美資料集已存放在: ${outDir}`);
console.log(`👉 下一步：我們終於可以把這包資料送進煉丹爐了！🔥`);