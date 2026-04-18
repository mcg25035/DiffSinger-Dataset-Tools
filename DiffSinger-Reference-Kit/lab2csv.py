import os
import glob
import pandas as pd

def convert_lab_to_csv(raw_data_dir, output_file):
    """
    將資料夾中的 .lab 檔案轉換為 DiffSinger 要求的 transcriptions.csv 格式。
    預期結構:
    raw_data_dir/
        ├── wavs/ (包含 .wav 與 .lab)
    """
    
    lab_files = glob.glob(os.path.join(raw_data_dir, 'wavs', '*.lab'))
    data = []

    for lab_path in sorted(lab_files):
        item_name = os.path.splitext(os.path.basename(lab_path))[0]
        
        ph_seq = []
        ph_dur = []
        
        with open(lab_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 3:
                    # 格式: [開始時間] [結束時間] [音素]
                    start, end, ph = float(parts[0]), float(parts[1]), parts[2]
                    # 單位轉換：如果是以 100ns 為單位 (HTK格式)，除以 10^7
                    # 這裡假設已經是秒
                    duration = end - start
                elif len(parts) == 1:
                    # 格式: 只有 [音素] (不含時長，這種通常不建議用於聲學訓練)
                    ph = parts[0]
                    duration = 0.1 # 預設占位
                else:
                    continue

                # 關鍵修正：映射 OpenUTAU 規範音素
                if ph == 'pau': ph = 'AP'
                if ph == 'br': ph = 'SP'
                
                ph_seq.append(ph)
                ph_dur.append(str(round(duration, 6)))

        data.append({
            'name': item_name,
            'ph_seq': ' '.join(ph_seq),
            'ph_dur': ' '.join(ph_dur)
        })

    df = pd.DataFrame(data)
    df.to_csv(output_file, index=False, encoding='utf-8')
    print(f"✨ 轉換完成！已生成: {output_file}")
    print(f"📁 總計處理: {len(data)} 筆資料")

if __name__ == "__main__":
    # 執行轉換
    convert_lab_to_csv('./', 'transcriptions.csv')
