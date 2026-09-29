// Copyright (c) 2026 HoneyDragon1016
//
// This file is part of scan-web.
//
// scan-web is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 3.
//
// COMMERCIAL USE:
// If you wish to use this software in a closed-source or commercial
// project, you must contact the author for a commercial license.
// Contact: service@honeychen.uk

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

    // 2. 讀取並驗證授權碼
    if (!fs.existsSync(PASSCODES_FILE)) return NextResponse.json({ error: '系統未設定密碼本' }, { status: 500 });
    let validPasscodes = fs.readFileSync(PASSCODES_FILE, 'utf-8').split('\n').map(p => p.trim()).filter(Boolean);
    const providedPasscode = passcode?.trim();
    
    if (!validPasscodes.includes(providedPasscode)) {
      return NextResponse.json({ error: '掃描授權碼錯誤或已被使用' }, { status: 403 });
    }

    cleanupOldScans();

    // 3. 防呆鎖 (先檢查機台是否可用，可用才核銷密碼)
    if (fs.existsSync(LOCK_FILE)) {
      const lockStats = fs.statSync(LOCK_FILE);
      if (Date.now() - lockStats.mtimeMs > 3 * 60 * 1000) {
        fs.unlinkSync(LOCK_FILE); 
      } else {
        // 機台忙碌中，直接退回，【不消耗】客人的密碼
        return NextResponse.json({ error: '機台目前有人正在使用中，請稍候' }, { status: 423 });
      }
    }

    // 4. 🔥 核銷密碼 (確認機台可用後，把用過的密碼從陣列中刪除，並寫回檔案)
    validPasscodes = validPasscodes.filter(p => p !== providedPasscode);
    fs.writeFileSync(PASSCODES_FILE, validPasscodes.join('\n') + '\n');

    // 5. 鎖定機台並開始背景掃描
    fs.writeFileSync(LOCK_FILE, 'locked');

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