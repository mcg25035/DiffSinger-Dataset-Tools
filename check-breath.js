const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ==========================================
// ⚙️ 設定區
// ==========================================
// 預設讀取你剛剛生成的 padded_dataset
const baseDir = __dirname;
const datasetDir = path.join(baseDir, 'padded_dataset'); 
const wavDir = path.join(datasetDir, 'wav');
const labDir = path.join(datasetDir, 'lab');

// 音量閾值 (低於這個分貝數視為純靜音，自動跳過不吵你)
const SILENCE_THRESHOLD = -40.0; 

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise(resolve => rl.question(q, resolve));

function getSegmentMaxVolume(wavPath, startSec, durSec) {
    try {
        // 使用 ffmpeg 的 volumedetect 濾鏡來分析該區段的最大音量
        const cmd = `ffmpeg -ss ${startSec} -t ${durSec} -i "${wavPath}" -af "volumedetect" -vn -sn -dn -f null /dev/null 2>&1`;
        const output = execSync(cmd).toString();
        const match = output.match(/max_volume:\s+([\-\.\d]+)\s+dB/);
        if (match && match[1]) {
            return parseFloat(match[1]);
        }
    } catch (e) {
        // 如果報錯，預設回傳 0 (代表有聲音，強制人工檢查)
    }
    return 0;
}

function playSegment(wavPath, startSec, durSec) {
    try {
        // 使用 ffplay 精準播放該區段
        execSync(`ffplay -nodisp -autoexit -ss ${startSec} -t ${durSec} "${wavPath}" > /dev/null 2>&1`);
    } catch (e) {
        console.log("⚠️ 播放中斷");
    }
}

async function main() {
    if (!fs.existsSync(labDir)) {
        console.error(`❌ 找不到資料夾 ${labDir}，請確認你已經跑過上一個補白腳本！`);
        process.exit(1);
    }

    const files = fs.readdirSync(labDir).filter(f => f.endsWith('.lab')).sort();
    let changedFilesCount = 0;
    let totalBrFound = 0;

    console.log(`\n🎧 呼吸聲 (br) 抓漏雷達啟動！`);
    console.log(`💡 提示：絕對靜音會自動跳過。聽到聲音時：`);
    console.log(`   [y] = 這是換氣聲，改成 br`);
    console.log(`   [Enter] = 這只是普通底噪/雜音，維持 pau`);
    console.log(`   [r] = 重聽一次\n`);

    for (const file of files) {
        const baseName = file.replace('.lab', '');
        const labPath = path.join(labDir, file);
        const wavPath = path.join(wavDir, baseName + '.wav');

        if (!fs.existsSync(wavPath)) continue;

        let lines = fs.readFileSync(labPath, 'utf8').trim().split('\n');
        let entries = lines.map(line => {
            let parts = line.trim().split(/\s+/);
            return { start: parseInt(parts[0], 10), end: parseInt(parts[1], 10), phone: parts[2] };
        });

        let fileChanged = false;

        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];
            
            if (entry.phone === 'pau') {
                let startSec = (entry.start / 10000000).toFixed(3);
                let durSec = ((entry.end - entry.start) / 10000000).toFixed(3);

                // 太短的停頓 (小於 0.05秒) 人耳聽不出來，通常是爆破音前奏，直接跳過
                if (durSec < 0.05) continue;

                // 檢查是否為絕對靜音
                let maxVol = getSegmentMaxVolume(wavPath, startSec, durSec);
                if (maxVol < SILENCE_THRESHOLD) {
                    // console.log(`   ⏩ 跳過絕對靜音區段: ${baseName} (${maxVol}dB)`);
                    continue;
                }

                console.log(`--------------------------------------------------`);
                console.log(`📁 檔案: \x1b[36m${baseName}.wav\x1b[0m | ⏱️ 時間: ${startSec}s | ⏳ 長度: ${durSec}s | 🔊 音量: ${maxVol}dB`);
                
                let checkAgain = true;
                while (checkAgain) {
                    playSegment(wavPath, startSec, durSec);
                    
                    let ans = await question(`✏️  有聽到換氣聲嗎？ [y/N/r]: `);
                    ans = ans.trim().toLowerCase();

                    if (ans === 'y') {
                        entry.phone = 'br';
                        fileChanged = true;
                        totalBrFound++;
                        console.log(`✅ 已修改為 \x1b[32mbr\x1b[0m`);
                        checkAgain = false;
                    } else if (ans === 'r') {
                        console.log(`🔄 重新播放...`);
                    } else {
                        console.log(`➡️  維持 \x1b[33mpau\x1b[0m`);
                        checkAgain = false;
                    }
                }
            }
        }

        if (fileChanged) {
            let output = entries.map(e => `${e.start} ${e.end} ${e.phone}`).join('\n') + '\n';
            fs.writeFileSync(labPath, output, 'utf8');
            changedFilesCount++;
        }
    }

    console.log(`\n==================================================`);
    console.log(`🎉 抓漏大功告成！`);
    console.log(`修改了 ${changedFilesCount} 個檔案，共找回了 ${totalBrFound} 個換氣聲 (br)！`);
    console.log(`你的資料集現在是 100% 黃金完美級別了！`);
    console.log(`==================================================\n`);
    rl.close();
}

main();