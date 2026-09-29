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

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(process.cwd(), 'scan.lock');
const PASSCODES_FILE = path.join(process.cwd(), 'passcodes.txt');

// 統一的密碼驗證器
const authenticate = (req: Request) => {
  const authHeader = req.headers.get('Authorization') || '';
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();
  return authHeader.replace('Bearer ', '').trim() === expectedPassword;
};

export async function GET(req: Request) {
  if (!authenticate(req)) return NextResponse.json({ error: '超級密碼錯誤' }, { status: 401 });
  
  const isLocked = fs.existsSync(LOCK_FILE);
  const passcodes = fs.existsSync(PASSCODES_FILE) ? fs.readFileSync(PASSCODES_FILE, 'utf-8') : '';
  return NextResponse.json({ isLocked, passcodes });
}

export async function POST(req: Request) {
  if (!authenticate(req)) return NextResponse.json({ error: '超級密碼錯誤' }, { status: 401 });
  
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