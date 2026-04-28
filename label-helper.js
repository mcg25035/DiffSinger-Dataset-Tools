const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const wavDir = __dirname;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function playAudio(filePath) {
    exec(`vlc -I dummy "${filePath}" vlc://quit > /dev/null 2>&1`);
}

async function processFiles() {
    const files = fs.readdirSync(wavDir).filter(file => file.endsWith('.wav')).sort();

    console.log(`\n🎧 複製貼上模式啟動！`);
    console.log(`提示: 從上方的歌詞本複製對應的羅馬音貼上。輸入 'r' 重聽。\n`);

    for (const file of files) {
        const txtFile = file.replace('.wav', '.txt');
        const wavPath = path.join(wavDir, file);
        const txtPath = path.join(wavDir, txtFile);

        if (fs.existsSync(txtPath)) {
            console.log(`⏭️  [跳過] ${txtFile} 已存在: ${fs.readFileSync(txtPath, 'utf8')}`);
            continue;
        }

        console.log(`================================`);
        console.log(`▶️  正在播放: ${file}`);
        
        playAudio(wavPath);

        let userInput = await new Promise(resolve => {
            rl.question(`✏️  貼上羅馬音 (或 'r' 重聽): `, resolve);
        });

        userInput = userInput.trim();

        while (userInput.toLowerCase() === 'r') {
            console.log(`🔄 重新播放...`);
            playAudio(wavPath);
            userInput = await new Promise(resolve => {
                rl.question(`✏️  貼上羅馬音 (或 'r' 重聽): `, resolve);
            });
            userInput = userInput.trim();
        }

        fs.writeFileSync(txtPath, userInput, 'utf8');
        console.log(`✅ 已儲存 -> ${txtFile}: [ ${userInput} ]\n`);
    }

    console.log('🎉 全部處理完成！');
    rl.close();
}

processFiles();
