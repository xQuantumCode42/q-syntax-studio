# Syntax Studio · 語法之間

Windows 上的六語程式學習工作台，以相同概念對照不同語言，透過寫程式與實際測試學習。

第一個可 review 版本：**0.1.0**。採 Electron、React、TypeScript、Monaco Editor 與 SQLite。原始碼、原創教材與練習採 MIT 授權。

## 開啟預覽

直接雙擊專案目錄的 `Syntax Studio.lnk`，或執行 `release/0.1.0/win-unpacked/Syntax Studio.exe`。一般使用不需要 CMD、Node.js 或開發伺服器。

App 會自動偵測此工作區 `.tools` 內的 Python／Rust 驗證工具鏈，也可讀取 EXE 同目錄的 `toolchains`。若單獨搬移可攜 App，其他語言需在目標電腦自行安裝。`.cmd` 入口已移除。

自行建置需要 Node.js 22.12+，建議 Node.js 24 LTS：

```sh
npm install
npm run build
npm start
```

開發模式：`npm run dev`。Windows 可攜式輸出：`npm run pack:win`（覆寫同一份初版）。

版本與 release 由使用者決定。目前只保留 `release/0.1.0`，不自行新增版本或 review 目錄；封裝暫存放在忽略的 `.tools`，測試後清理。

## 本版內容

- Python、JavaScript、C#、Rust、Java、Haskell，隨時切換並保留各自草稿。
- 21 個主題，分為入門與控制流程、資料與轉換、程式結構與型別、可靠性與進階概念四組，可搜尋、摺疊。
- 語言選擇改為下拉選單，切換時保留各主題、各語言草稿。
- 每語言每主題各一題，共 126 題獨立練習；每題附提示、參考解答與多組實際執行測試。
- 教材使用「概念教學 → 語言比較 → 本題練習」三個頁籤；完成閱讀後可按「開始本題練習」，沒有獨立的綜合演練章節。
- Monaco 編輯器隨 App 提供，無 CDN 依賴；Ctrl+Enter 執行目前程式。
- 本機標準輸入／輸出執行、真實測試結果、編譯錯誤與逾時提示。
- SQLite 儲存學習進度及草稿；六語比較、學習總覽、文件來源與環境設定。
- 透過官方 Codex app-server 連結 ChatGPT 並送交 AI 評閱。需自行登入並具有可用權限、額度；未登入不會產生模擬評語。

## 工作區操作

上方合併為精簡工具列，教材與編輯器使用視窗剩餘高度。捲動只發生在教材、程式或結果區內，不需要捲動整個學習頁。

- 「並排」同時顯示教材與程式。
- 「教材」或「程式」讓單一區域使用整個工作區寬度，切換不清除草稿。
- 結果頁籤右側可收合結果區，增加程式高度；執行或提交時自動展開。
- 標題、導覽與選單字體縮小，教材與程式文字保留可讀大小。

## 課程目錄

| 學習階段 | 主題 |
| --- | --- |
| 入門與控制流程 | 資料綁定、運算子、條件分支、迴圈、函式與參數 |
| 資料與轉換 | 字串、陣列與清單、字典、集合、高階函式與閉包 |
| 程式結構與型別 | 遞迴、物件與自訂型別、介面／Trait／多型、泛型、模組與命名空間 |
| 可靠性與進階概念 | 可變性／複製／共享、模式匹配、錯誤處理、檔案 I/O、並行、斷言與測試 |

進階主題提供概念入門及單檔可執行練習，尚不等同完整語言專書或多檔案 IDE。測試驗證結果；是否使用特定概念（例如介面或背景工作）仍可透過閱讀程式與 AI 回饋進一步確認。

移除的舊章節草稿保留於學習資料中，不顯示或計入新進度。

## 語言環境

| 語言 | 需求 |
| --- | --- |
| JavaScript | 隨 Electron 內建 Node.js |
| Python | PATH 上的 Python 3.10+，或 Windows `py -3` |
| C# | PATH 上的 .NET SDK 6+ |
| Rust | `rustc`（支援 edition 2024），PATH 或使用者 `.cargo/bin` |
| Java | PATH 上的 `java` 與 `javac`，教材採 Java 17+ 語法基準 |
| Haskell | PATH 上的 GHC，教材採 GHC 9.x 語法基準 |

安裝工具鏈後重新啟動 App，在「環境與設定」重新偵測。此版不會自動下載語言工具鏈。

執行程式會使用目前使用者的 Windows 權限。Runner 提供獨立暫存工作目錄、執行逾時、程序樹停止與 64 KB 輸出限制，**尚非作業系統沙箱**。請只執行自己撰寫或信任的程式；對外接受陌生人提交前，需要另行實作系統層隔離。

## ChatGPT 與 AI

安裝官方 [Codex CLI](https://github.com/openai/codex) 或官方 VS Code 擴充套件後，在「環境與設定」按「連結 ChatGPT」。官方登入頁會在瀏覽器開啟；登入完成後按重新整理。

App 使用獨立的 Codex 資料目錄，不讀取其他專案的對話。評閱時只提供題目、目前程式與對應版本測試結果；工具權限受限，要求 AI 不存取檔案、不執行命令。模型輸出仍可能有誤，實際測試才是通關依據。AI 回饋僅保留本次工作階段。

官方對本機／開源 App 的登入整合與商用服務有不同適用範圍；發行前應再檢查 [官方整合文件](https://learn.chatgpt.com/docs/app-server)。一般 OpenAI API 帳務與 ChatGPT 訂閱分開。

桌面版資料位於 Electron 的使用者資料目錄。包含草稿、進度與獨立 Codex 登入憑證，請勿加入 Git 或分享。打包僅包含 `dist`、`electron` 與套件中繼資料，不包含使用者資料。

## 教材來源與版本

教材由本專案自行編寫，以下連結作為查核及延伸閱讀來源，未將外部文件全文或圖片重新散布：

- [Python 官方教學](https://docs.python.org/3/tutorial/)
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Microsoft Learn C#](https://learn.microsoft.com/en-us/dotnet/csharp/)
- [The Rust Programming Language](https://doc.rust-lang.org/book/)
- [Dev.java](https://dev.java/learn/)
- [A Gentle Introduction to Haskell](https://www.haskell.org/tutorial/)

共同基準：Python 3.10+、Node.js、C#／.NET 6+、Rust 2024 edition、Java 17+、Haskell／GHC 9.x。查核日期：2026-11-14。實際執行版本與本次測試範圍見 `VERIFICATION.md`。

## 驗證

```sh
npm run typecheck
npm test
npm run build
npm run test:desktop
```

桌面測試使用獨立 `.review-data` 資料目錄，不會讀取或更改日常學習資料。未安裝工具鏈的案例會明確標記略過。
