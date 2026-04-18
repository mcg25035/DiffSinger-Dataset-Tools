# DiffSinger 訓練從零開始：完整實作指南 (Reference Kit)

本工具包提供完整的原始資料 (WAV+LAB)、轉換腳本以及**針對原始 repositories bug 的必修補丁**。

---

## 🛠️ 第一階段：環境與原始碼準備

1. **Clone 原始專案**
   ```bash
   git clone https://github.com/oc-soft/DiffSinger.git
   cd DiffSinger
   ```

2. **修正 RTX 5070 Ti (Blackwell) 硬體加速**
   若你的顯卡是 RTX 50 系列，必須安裝支援 CUDA 12.8 的 Nightly 版本：
   ```bash
   uv pip install --pre --force-reinstall torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128
   ```

3. **【關鍵】原始碼補丁 (Patching)**
   原始專案在處理二值化時會強制載入缺失的 VR 模型。請開啟 `preprocessing/acoustic_binarizer.py`，搜尋 `process_item` 函數，將建立 `DecomposedWaveform` 的程式碼段落替換如下：

   ```python
   # --- 原始碼第 172 行開始替換 ---
   if self.need_breathiness or self.need_voicing or self.need_tension:
       dec_waveform = DecomposedWaveform(
           waveform, samplerate=hparams['audio_sample_rate'], f0=gt_f0 * ~uv,
           hop_size=hparams['hop_size'], fft_size=hparams['fft_size'], win_size=hparams['win_size'],
           algorithm=hparams['hnsep']
       )
   else:
       dec_waveform = None
   # ----------------------------
   ```

---

## 📁 第二階段：資料結構部署

1. **整合 Reference Kit**
   將本工具包的所有內容移動至專案根目錄：
   ```bash
   mkdir -p data/codingbear/raw/wavs
   # 將工具包內 sample_data/wavs 下的 .wav 與 .lab 放入上述目錄
   # 將工具包內的 codingbear_template.yaml 放入 configs/ 目錄下
   ```

2. **執行資料轉換**
   在根目錄執行工具包提供的腳本，將 LAB 轉為專案所需的 CSV：
   ```bash
   python3 lab2csv.py
   # 產出的 transcriptions.csv 檔案請放入 data/codingbear/raw/ 下
   ```

3. **整理音素字典**
   確保 `data/codingbear/dictionary.txt` 已建立，且音節與音素間使用 **Tab** 分隔。

4. **檢查資料夾結構**
   完成後data的資料夾結構應該長以下這樣
   ```
   (base) lee@lee-systemproductname:~/DiffSinger/data/codingbear$ tree
   .
   ├── dictionary.txt
   └── raw
      ├── transcriptions.csv
      └── wavs
         ├── 018.lab
         ├── 018.wav
         ├── 019.lab
         ├── 019.wav
         ├── 020.lab
         ├── 020.wav
         ├── 021.lab
         ├── 021.wav
   ```
   

---

## 🚀 第三階段：執行訓練

1. **二值化 (Binarize)**
   ```bash
   export PYTHONPATH=.
   python3 scripts/binarize.py --config configs/codingbear_template.yaml
   ```

2. **啟動訓練 (Train)**
   ```bash
   # 若曾中斷或修改過資料，請務必加上 --reset
   python3 scripts/train.py --config configs/codingbear_template.yaml --exp_name codingbear_model --reset
   ```

---
*本指南由 AI 助手於 2026/04/10 重新修訂，旨在解決先前版本中路徑不明確與指令不全的問題。*
