const fs = require('fs');
const path = require('path');

const labDir = path.join(__dirname, 'lab');
// 最小容許長度 (設定為 5 毫秒，防止出現 0 毫秒的幽靈標籤)
const MIN_DUR = 50000; 

const files = fs.readdirSync(labDir).filter(f => f.endsWith('.lab'));
let fixCount = 0;

files.forEach(file => {
    const labPath = path.join(labDir, file);
    let lines = fs.readFileSync(labPath, 'utf8').trim().split('\n');

    let entries = [];
    lines.forEach(line => {
        let parts = line.trim().split(/\s+/);
        if(parts.length >= 3) {
            entries.push({
                start: parseInt(parts[0], 10),
                end: parseInt(parts[1], 10),
                phone: parts[2]
            });
        }
    });

    if (entries.length === 0) return;

    // 1. 保證從 0 開始
    entries[0].start = 0;

    // 2. 完美縫合所有接縫 (前後取平均值)
    for (let i = 0; i < entries.length - 1; i++) {
        let mid = Math.floor((entries[i].end + entries[i+1].start) / 2);
        entries[i].end = mid;
        entries[i+1].start = mid;
    }

    // 3. 由左至右推土機：確保每個音至少有 5 毫秒，絕不產生負數或零
    for (let i = 0; i < entries.length; i++) {
        if (entries[i].end - entries[i].start < MIN_DUR) {
            entries[i].end = entries[i].start + MIN_DUR;
            if (i + 1 < entries.length) {
                entries[i+1].start = entries[i].end;
            }
        }
    }

    // 寫入檔案
    let output = entries.map(e => `${e.start} ${e.end} ${e.phone}`).join('\n') + '\n';
    fs.writeFileSync(labPath, output, 'utf8');
    fixCount++;
});

console.log(`✅ 完美熨平了 ${fixCount} 個檔案！所有縫隙與幽靈時間已清除。`);