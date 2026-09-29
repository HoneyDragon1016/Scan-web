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
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) return new NextResponse('缺少任務 ID', { status: 400 });

  const filePath = path.join(process.cwd(), 'scans', `${jobId}.pdf`);
  
  if (!fs.existsSync(filePath)) {
    return new NextResponse('檔案不存在或已被系統自動銷毀 (閱後即焚)', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="scan_${jobId}.pdf"`,
    },
  });
}