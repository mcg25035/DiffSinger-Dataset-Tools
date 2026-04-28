const fs = require('fs');
const path = require('path');

// ==========================================
// ⚙️ 設定區
// ==========================================
const START_FROM = 0; // 請改成你目前正在處理的編號 (例如從 017 開始)
// ==========================================

const baseDir = __dirname;
const dictPath = path.join(baseDir, 'dictionary.txt');
const wavDir = path.join(baseDir, 'wav');
const labDir = path.join(baseDir, 'lab');

// 1. 讀取並解析字典檔
const dict = {};
if (!fs.existsSync(dictPath)) {
    console.error("❌ 找不到 dictionary.txt！");
    process.exit(1);
}
fs.readFileSync(dictPath, 'utf8').trim().split('\n').forEach(line => {
    let parts = line.trim().split(/\s+/);
    if (parts.length >= 2) dict[parts[0]] = parts.slice(1);
});

const txtFiles = fs.readdirSync(wavDir).filter(f => f.endsWith('.txt')).sort();
let successCount = 0;
let skipCount = 0;

txtFiles.forEach(txtFile => {
    const baseName = txtFile.replace('.txt', '');
    const fileNum = parseInt(baseName, 10);

    if (!isNaN(fileNum) && fileNum < START_FROM) {
        console.log(`⏭️  [保護] 跳過已標註檔案: ${txtFile}`);
        skipCount++;
        return;
    }

    const txtPath = path.join(wavDir, txtFile);
    const labPath = path.join(labDir, baseName + '.lab');

    if (!fs.existsSync(labPath)) return;

    // 2. 建立「絕對真理」的音素序列 (頭尾強制加 pau)
    const words = fs.readFileSync(txtPath, 'utf8').trim().split(/\s+/);
    const targetSequence = ['pau'];
    words.forEach(w => {
        if (dict[w]) targetSequence.push(...dict[w]);
        else targetSequence.push(w);
    });
    targetSequence.push('pau');

    // 3. 讀取 MFA 的原始標籤
    const labLines = fs.readFileSync(labPath, 'utf8').trim().split('\n');
    const mfaLab = labLines.filter(line => line.trim().length > 0).map(line => {
        let parts = line.trim().split(/\s+/);
        return { start: parseInt(parts[0]), end: parseInt(parts[1]), phone: parts[2] };
    });

    const totalDuration = mfaLab[mfaLab.length - 1].end;

    // 4. 準備輸出陣列
    let result = targetSequence.map(phone => ({ phone: phone, start: null, end: null }));

    // 5. 尋找時間錨點 (Anchor)
    let mfaIdx = 0;
    for (let i = 0; i < result.length; i++) {
        let targetPhone = result[i].phone;
        
        // 在 MFA 結果中尋找匹配的音素 (跳過 pau)
        for (let j = mfaIdx; j < mfaLab.length; j++) {
            if (mfaLab[j].phone === targetPhone && targetPhone !== 'pau') {
                result[i].start = mfaLab[j].start;
                result[i].end = mfaLab[j].end;
                mfaIdx = j + 1; // 記錄位置，下次從這裡繼續找
                break;
            }
        }
    }

    // 強制設定頭尾 pau 的時間錨點
    result[0].start = 0;
    if (result[0].end === null) result[0].end = mfaLab[0].end > 0 ? mfaLab[0].end : 500000;
    result[result.length - 1].end = totalDuration;

    // 6. 填補空缺時間 (Interpolation)
    for (let i = 0; i < result.length; i++) {
        if (result[i].start === null) {
            // 找到前一個有時間的 end
            let prevEnd = 0;
            for (let j = i - 1; j >= 0; j--) {
                if (result[j].end !== null) { prevEnd = result[j].end; break; }
            }

            // 找到下一個有時間的 start
            let nextStart = totalDuration;
            let nextIdx = result.length - 1;
            for (let j = i + 1; j < result.length; j++) {
                if (result[j].start !== null) { nextStart = result[j].start; nextIdx = j; break; }
            }

            // 計算有多少個音素擠在這個時間區間
            let missingCount = nextIdx - i;
            let timeGap = nextStart - prevEnd;
            if (timeGap < 0) timeGap = 0; // 防呆
            let step = Math.floor(timeGap / missingCount);

            // 平均分配時間
            let currentStart = prevEnd;
            for (let k = i; k < nextIdx; k++) {
                result[k].start = currentStart;
                result[k].end = currentStart + step;
                currentStart = result[k].end;
            }
        }
    }

    // 7. 強制修復時間連續性 (確保前一個的 end = 後一個的 start)
    for (let i = 0; i < result.length - 1; i++) {
        let midPoint = Math.floor((result[i].end + result[i+1].start) / 2);
        result[i].end = midPoint;
        result[i+1].start = midPoint;
    }

    // 8. 覆寫檔案
    let output = result.map(r => `${r.start} ${r.end} ${r.phone}`).join('\n') + '\n';
    fs.writeFileSync(labPath, output, 'utf8');
    successCount++;
    console.log(`✅ 成功強制覆寫: ${baseName}.lab`);
});

console.log(`\n================================`);
console.log(`🛡️  跳過保留: ${skipCount} 個檔案`);
console.log(`🎉 成功暴力覆寫: ${successCount} 個檔案`);
console.log(`👉 這次保證右邊清單除了頭尾，絕對不會有任何 pau！`);
console.log(`================================\n`);
