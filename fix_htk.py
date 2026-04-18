import os, re, shutil

tg_dir = "./aligned_labs"
wav_src_dir = "./wav"
lab_target_dir = "/home/lee/diffsinger/codingbear/lab"
wav_target_dir = "/home/lee/diffsinger/codingbear/wav"

os.makedirs(lab_target_dir, exist_ok=True)
os.makedirs(wav_target_dir, exist_ok=True)

count = 0
for file in os.listdir(tg_dir):
    if not file.endswith(".TextGrid"): continue
    
    # 讀取 TextGrid
    with open(os.path.join(tg_dir, file), 'r', encoding='utf-8') as f:
        content = f.read()
        
    tier_matches = re.finditer(r'class = "IntervalTier"\s+name = "(.*?)"(.*?)((?=class = "IntervalTier")|\Z)', content, re.DOTALL)
    phones_data = ""
    for match in tier_matches:
        if match.group(1) == "phones":
            phones_data = match.group(2)
            break
            
    intervals = re.findall(r'xmin = ([\d\.]+)\s+xmax = ([\d\.]+)\s+text = "(.*?)"', phones_data)
    
    # 轉換時間並寫入 lab 目錄
    lab_path = os.path.join(lab_target_dir, file.replace(".TextGrid", ".lab"))
    with open(lab_path, "w", encoding="utf-8") as f:
        for xmin, xmax, phone in intervals:
            # 清理多餘的錯誤標籤
            if phone in ["", "sp", "sil", "spn"]: phone = "pau"
            # 關鍵：乘以 10000000 轉成 HTK 單位
            htk_xmin = int(float(xmin) * 10000000)
            htk_xmax = int(float(xmax) * 10000000)
            f.write(f"{htk_xmin} {htk_xmax} {phone}\n")
    
    # 同步把 wav 檔也複製過去
    wav_src = os.path.join(wav_src_dir, file.replace(".TextGrid", ".wav"))
    if os.path.exists(wav_src):
        shutil.copy2(wav_src, os.path.join(wav_target_dir, file.replace(".TextGrid", ".wav")))
        
    count += 1
    
print(f"🎉 大功告成！成功轉換 {count} 個檔案。")
print(f"👉 .lab 檔已放置於: {lab_target_dir}")
print(f"👉 .wav 檔已同步至: {wav_target_dir}")
