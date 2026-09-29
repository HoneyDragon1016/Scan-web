# 📠 scan-web｜雲端自助掃描服務

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Dual License](https://img.shields.io/badge/Commercial-Dual%20License-orange.svg)](#-授權協議-license)

以 Next.js 建置的雲端遠端掃描系統，專為實體自助掃描站點設計。使用者不需要安裝驅動程式或攜帶 USB 隨身碟，只要透過網頁完成安全驗證並輸入一次性授權碼，即可遠端驅動掃描器，完成後下載 PDF 文件。

> **專案狀態：** 可部署的自助掃描服務原型。硬體控制流程目前以 Windows + NAPS2 為目標環境。

## 📚 目錄

- [✨ 功能特色](#-功能特色)
- [🧱 技術架構](#-技術架構)
- [✅ 環境需求](#-環境需求)
- [🚀 快速開始](#-快速開始)
- [⚙️ 環境變數](#️-環境變數)
- [🖥️ 使用流程](#️-使用流程)
- [🗂️ API 端點](#️-api-端點)
- [🔐 安全與營運注意事項](#-安全與營運注意事項)
- [📄 授權協議](#-授權協議-license)

## ✨ 功能特色

- **🔒 硬體獨佔鎖定**：以 `scan.lock` 防止多個請求同時操作掃描器；逾時鎖定會自動回收。
- **🔑 一次性授權碼**：成功開始掃描後立即核銷 passcode，避免授權碼重複使用。
- **🛡️ Cloudflare Turnstile**：在啟動掃描前進行人機驗證，降低自動化濫用風險。
- **🎛️ 管理後台**：管理員可查看硬體鎖定狀態、強制解鎖，以及更新授權密碼本。
- **🧹 暫存檔清理**：掃描結果超過 10 分鐘後自動清除，降低敏感文件長期留存風險。
- **🌐 中英雙語介面**：使用者介面支援繁體中文與英文切換。
- **📥 PDF 下載**：掃描完成後提供一次性結果下載端點。

## 🧱 技術架構

| 領域 | 技術 |
| --- | --- |
| Web 框架 | Next.js 16、React 19、TypeScript |
| UI | Tailwind CSS 4、Lucide React |
| 掃描引擎 | NAPS2 Console（Windows） |
| 防機器人驗證 | Cloudflare Turnstile |
| 進程管理 | PM2 |
| 外部連線 | Cloudflare Tunnel（可選） |

## ✅ 環境需求

- Windows 主機（需連接並正確設定實體掃描器）
- Node.js 20.9 或更新版本
- NAPS2，且已建立名為 `L360` 的掃描設定檔
- Cloudflare Turnstile site key 與 secret key
- 用於管理後台的安全管理員密碼

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

在專案根目錄建立 `.env.local`（請勿提交至版本庫）：

```env
TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret
ADMIN_PASSWORD=your_strong_admin_password
```

前端的 Turnstile site key 目前設定於 `app/page.tsx` 的 `Turnstile` 元件中；部署前請確認它是對應正式網域的 site key。

### 3. 建置與啟動

```bash
npm run build
npm run start
```

開發模式：

```bash
npm run dev
```

預設開發網址為 `http://localhost:3000`。正式環境可搭配 PM2：

```bash
pm2 start ecosystem.config.js
pm2 save
```

> `ecosystem.config.js` 目前使用連接埠 `3001`。若以反向代理或 Cloudflare Tunnel 對外提供服務，請將流量導向相同連接埠。

## ⚙️ 環境變數

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | 是 | 後端向 Cloudflare 驗證 Turnstile token 的 secret key。 |
| `ADMIN_PASSWORD` | 是 | `/admin-panel-888` 管理後台使用的密碼。 |

請將 `.env.local`、管理員密碼、掃描文件與 `passcodes.txt` 視為機密資料，並使用正式環境的密鑰管理方案保存。

## 🖥️ 使用流程

### 管理員

1. 開啟 `/admin-panel-888`，輸入 `ADMIN_PASSWORD`。
2. 在「授權密碼本」中，每行輸入一組一次性授權碼。
3. 將授權碼提供給使用者；掃描成功開始後該碼會被核銷。
4. 若掃描器異常中斷，可在後台檢查狀態並使用「強制解鎖」。

### 使用者

1. 將文件面朝下放在掃描器玻璃台上。
2. 完成 Cloudflare Turnstile 驗證並輸入授權碼。
3. 點擊「開始掃描」，等待掃描器完成工作。
4. 下載產生的 PDF；暫存結果會在 10 分鐘後自動清除。

## 🗂️ API 端點

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| `POST` | `/api/scan/start` | 驗證 Turnstile 與一次性授權碼，啟動 NAPS2 掃描工作。 |
| `GET` | `/api/scan/status?jobId=...` | 查詢掃描工作狀態。 |
| `GET` | `/api/scan/download?jobId=...` | 下載掃描完成的 PDF。 |
| `GET` | `/api/scan/admin` | 以 Bearer token 讀取管理狀態與授權碼本。 |
| `POST` | `/api/scan/admin` | 執行解鎖或更新授權碼本等管理操作。 |

## 🔐 安全與營運注意事項

- 請務必在正式環境設定 `TURNSTILE_SECRET_KEY` 與高強度 `ADMIN_PASSWORD`，不要使用測試值。
- `passcodes.txt` 含有可使用的授權碼，請限制檔案權限，並在部署前更換範例內容。
- 管理後台路徑不是安全機制；請搭配 HTTPS、反向代理存取控制、速率限制與適當的網路隔離。
- 掃描結果可能含有個人或機密資料。請評估主機磁碟權限、備份策略、日誌政策與自動清理機制。
- 在公開部署前，請確認 NAPS2 路徑、掃描器 profile、Cloudflare 網域設定及 PM2 連接埠均符合實際環境。

## 🤝 貢獻

歡迎透過 Issue 或 Pull Request 回報問題、提出改善建議。提交程式碼前請先執行：

```bash
npm run lint
npm run build
```

## ⚖️ 授權協議 (License)

本專案採用 **雙重授權模式 (Dual-Licensing)** 來保護作者權益與開源社群。

**1. 開源與非商業/個人用途**

本專案預設採用 **[GNU General Public License v3.0 (GPLv3)](https://arena.ai/agent/LICENSE)** 協議授權。<br />
您可以自由地使用、修改與散佈本程式碼。但依據 GPLv3 的傳染性條款，**任何使用了本專案程式碼的衍生專案，都必須同樣以 GPLv3 協議完全開源**。

**2. 商業與閉源用途 (Commercial & Closed-Source Use)**

如果您希望將本專案的程式碼用於商業產品、公司內部專案，且**不願意或無法開源您的專案原始碼**，您必須在專案發布前向作者取得商業授權。未經授權將本專案用於閉源商業產品，即構成對 GPLv3 協議的違反與侵權。

📩 **商業授權聯絡方式：**

- Email: [service@honeychen.uk](mailto:service@honeychen.uk)

完整的 GPLv3 官方英文條文請參閱根目錄 [`LICENSE`](./LICENSE) 檔案。
