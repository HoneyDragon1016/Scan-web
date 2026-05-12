import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) return NextResponse.json({ error: '缺少任務 ID' }, { status: 400 });

  const SCANS_DIR = path.join(process.cwd(), 'scans');
  const outputPath = path.join(SCANS_DIR, `${jobId}.pdf`);
  const errorPath = path.join(SCANS_DIR, `${jobId}.error`);

  // 檢查是否發生硬體錯誤
  if (fs.existsSync(errorPath)) {
    return NextResponse.json({ status: 'error', error: '掃描硬體無回應或卡紙' });
  }

  // 檢查檔案是否已經順利產出
  if (fs.existsSync(outputPath)) {
    return NextResponse.json({ 
      status: 'done', 
      downloadUrl: `/api/scan/download?jobId=${jobId}` 
    });
  }

  // 都還沒，告訴前端繼續等
  return NextResponse.json({ status: 'processing' });
}