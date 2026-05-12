import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCANS_DIR = path.join(process.cwd(), 'scans');
const LOCK_FILE = path.join(process.cwd(), 'scan.lock');

// 🧹 清理舊檔案的小工具 (超過 10 分鐘的檔案就刪除，實現閱後即焚)
function cleanupOldScans() {
  if (!fs.existsSync(SCANS_DIR)) fs.mkdirSync(SCANS_DIR);
  const files = fs.readdirSync(SCANS_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(SCANS_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 10 * 60 * 1000) {
      fs.unlinkSync(filePath);
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const turnstileToken = body['cf-turnstile-response'];

    if (!turnstileToken) return NextResponse.json({ error: '請完成人機驗證' }, { status: 401 });

    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${SECRET_KEY}&response=${turnstileToken}`,
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) return NextResponse.json({ error: '人機驗證失敗' }, { status: 401 });

    cleanupOldScans();

    // 🔒 硬體防呆鎖：如果 lock 檔存在，代表機器正在掃描
    if (fs.existsSync(LOCK_FILE)) {
      // 避免程式死鎖：檢查鎖是否卡住超過 3 分鐘
      const lockStats = fs.statSync(LOCK_FILE);
      if (Date.now() - lockStats.mtimeMs > 3 * 60 * 1000) {
        fs.unlinkSync(LOCK_FILE); // 強制解除死鎖
      } else {
        return NextResponse.json({ error: '機台目前有人正在使用中，請稍候' }, { status: 423 });
      }
    }

    // 上鎖
    fs.writeFileSync(LOCK_FILE, 'locked');

    const jobId = Date.now().toString();
    const outputPath = path.join(SCANS_DIR, `${jobId}.pdf`);
    const errorPath = path.join(SCANS_DIR, `${jobId}.error`);
    const naps2Path = "C:\\Program Files\\NAPS2\\NAPS2.Console.exe";

    // 🚀 背景執行 NAPS2 (注意：我們沒有加 await)
    execFile(naps2Path, ['-p', 'L360', '-o', outputPath], (error) => {
      // 掃描結束後，不管成功失敗都要解除硬體鎖
      if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
      
      if (error) {
        console.error("掃描器錯誤:", error);
        fs.writeFileSync(errorPath, error.message);
      }
    });

    // 立刻回傳 jobId 給前端，讓網頁進入 60 秒等待畫面
    return NextResponse.json({ jobId });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '伺服器發生未知錯誤' }, { status: 500 });
  }
}