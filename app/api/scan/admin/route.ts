export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(process.cwd(), 'scan.lock');
const PASSCODES_FILE = path.join(process.cwd(), 'passcodes.txt');

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const providedPassword = authHeader.replace('Bearer ', '').trim();
  // 如果讀不到，就顯示警告文字
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim() || '讀取不到變數';

  // 【除錯核心】如果密碼不對，直接把雙方的密碼丟回前端看！
  if (providedPassword !== expectedPassword) {
    return NextResponse.json(
      { error: `除錯: 你的輸入[${providedPassword}] vs 系統讀取[${expectedPassword}]` }, 
      { status: 401 }
    );
  }

  const isLocked = fs.existsSync(LOCK_FILE);
  const passcodes = fs.existsSync(PASSCODES_FILE) ? fs.readFileSync(PASSCODES_FILE, 'utf-8') : '';
  return NextResponse.json({ isLocked, passcodes });
}

// ---------------------------------------------------------
// POST 的部分我們暫時先不動，等登入成功再來管它
export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();
  if (authHeader.replace('Bearer ', '').trim() !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { action, payload } = await req.json();
  if (action === 'unlock') {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    return NextResponse.json({ success: true, message: '硬體鎖已強制解除' });
  }
  if (action === 'update_passcodes') {
    fs.writeFileSync(PASSCODES_FILE, payload);
    return NextResponse.json({ success: true, message: '授權密碼本已更新' });
  }
  return NextResponse.json({ error: '未知的指令' }, { status: 400 });
}