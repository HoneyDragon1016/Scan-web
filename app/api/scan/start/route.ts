import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCANS_DIR = path.join(process.cwd(), 'scans');
const LOCK_FILE = path.join(process.cwd(), 'scan.lock');
const PASSCODES_FILE = path.join(process.cwd(), 'passcodes.txt');

function cleanupOldScans() {
  if (!fs.existsSync(SCANS_DIR)) fs.mkdirSync(SCANS_DIR, { recursive: true });
  const files = fs.readdirSync(SCANS_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(SCANS_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 10 * 60 * 1000) fs.unlinkSync(filePath);
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 'cf-turnstile-response': turnstileToken, passcode } = body;

    // 1. 人機驗證
    if (!turnstileToken) return NextResponse.json({ error: '請完成人機驗證' }, { status: 401 });
    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${SECRET_KEY}&response=${turnstileToken}`,
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) return NextResponse.json({ error: '人機驗證失敗' }, { status: 401 });

    // 2. 授權碼驗證
    if (!fs.existsSync(PASSCODES_FILE)) return NextResponse.json({ error: '系統未設定密碼本' }, { status: 500 });
    const validPasscodes = fs.readFileSync(PASSCODES_FILE, 'utf-8').split('\n').map(p => p.trim()).filter(Boolean);
    if (!validPasscodes.includes(passcode?.trim())) return NextResponse.json({ error: '掃描授權碼錯誤' }, { status: 403 });

    cleanupOldScans();

    // 3. 防呆鎖
    if (fs.existsSync(LOCK_FILE)) {
      const lockStats = fs.statSync(LOCK_FILE);
      if (Date.now() - lockStats.mtimeMs > 3 * 60 * 1000) {
        fs.unlinkSync(LOCK_FILE); 
      } else {
        return NextResponse.json({ error: '機台目前有人正在使用中，請稍候' }, { status: 423 });
      }
    }
    fs.writeFileSync(LOCK_FILE, 'locked');

    // 4. 背景掃描
    const jobId = Date.now().toString();
    const outputPath = path.join(SCANS_DIR, `${jobId}.pdf`);
    const errorPath = path.join(SCANS_DIR, `${jobId}.error`);
    const naps2Path = "C:\\Program Files\\NAPS2\\NAPS2.Console.exe";

    execFile(naps2Path, ['-p', 'L360', '-o', outputPath], (error) => {
      if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
      if (error) fs.writeFileSync(errorPath, error.message);
    });

    return NextResponse.json({ jobId });
  } catch (e) {
    return NextResponse.json({ error: '伺服器發生未知錯誤' }, { status: 500 });
  }
}