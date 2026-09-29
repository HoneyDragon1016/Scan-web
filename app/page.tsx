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

"use client";

import { useState } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, Download, RefreshCw, KeyRound, ExternalLink, Globe } from 'lucide-react';

// 多國語言字典
const DICT = {
  zh: {
    title: "雲端自助掃描",
    subtitle: "Cloud Document Scan System",
    idleMsg: "請將文件面朝下放置於玻璃台，並輸入授權碼",
    passcodePlaceholder: "請輸入掃描授權碼",
    turnstileWait: "🛡️ 請先等待人機驗證完成",
    passcodeWait: "🔑 請輸入掃描授權碼",
    startingMsg: "正在喚醒硬體，請稍候...",
    scanningMsg: "🖨️ 掃描器運作中，請勿掀開蓋子... (約需 40~60 秒)",
    doneMsg: "✅ 掃描大功告成！檔案已加密暫存 (10分鐘後銷毀)",
    errorMsg: "❌ 掃描失敗：",
    btnStart: "開始掃描",
    btnRunning: "硬體執行中...",
    btnDownload: "下載 PDF 檔案",
    btnNext: "掃描下一張",
    btnRetry: "重新測試",
    footerText: "需要旋轉或轉檔掃描後的 PDF？",
    footerLink: "前往 iLovePDF 免費工具"
  },
  en: {
    title: "Cloud Scan Kiosk",
    subtitle: "Secure & Automated Scanning",
    idleMsg: "Place document face down on the glass and enter passcode",
    passcodePlaceholder: "Enter Access Passcode",
    turnstileWait: "🛡️ Waiting for security check...",
    passcodeWait: "🔑 Passcode is required",
    startingMsg: "Waking up scanner hardware...",
    scanningMsg: "🖨️ Scanning in progress. Do not open the lid... (40-60s)",
    doneMsg: "✅ Scan complete! File is temporarily encrypted (Auto-deletes in 10m)",
    errorMsg: "❌ Scan failed: ",
    btnStart: "Start Scan",
    btnRunning: "Hardware Running...",
    btnDownload: "Download PDF",
    btnNext: "Scan Another Document",
    btnRetry: "Retry",
    footerText: "Need to rotate or convert the scanned PDF?",
    footerLink: "Go to iLovePDF Free Tools"
  }
};

export default function Home() {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const t = DICT[lang]; // 語言捷徑

  const [turnstileToken, setTurnstileToken] = useState("");
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "done" | "error">("idle");
  const [message, setMessage] = useState(t.idleMsg);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const startScan = async () => {
    if (!turnstileToken) { setMessage(t.turnstileWait); return; }
    if (!passcode.trim()) { setMessage(t.passcodeWait); return; }
    
    setStatus("starting");
    setMessage(t.startingMsg);
    setDownloadUrl(null);

    try {
      const startRes = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 'cf-turnstile-response': turnstileToken, passcode: passcode.trim() }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || "Hardware Error");

      setStatus("scanning");
      setMessage(t.scanningMsg);
      pollStatus(startData.jobId);
    } catch (error: any) {
      setStatus("error");
      setMessage(t.errorMsg + error.message);
    }
  };

  const pollStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/status?jobId=${jobId}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(pollInterval);
          setStatus("done");
          setMessage(t.doneMsg);
          setDownloadUrl(data.downloadUrl);
        } else if (data.status === "error") {
          clearInterval(pollInterval);
          setStatus("error");
          setMessage(t.errorMsg + (data.error || "Timeout"));
        }
      } catch (error) {
        clearInterval(pollInterval);
        setStatus("error");
        setMessage("Connection Lost");
      }
    }, 3000);
  };

  const resetScanner = () => {
    setStatus("idle");
    setPasscode("");
    setMessage(t.idleMsg);
    setDownloadUrl(null);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative">
      
      {/* 語言切換按鈕 */}
      <button 
        onClick={() => {
          const nextLang = lang === 'zh' ? 'en' : 'zh';
          setLang(nextLang);
          if (status === 'idle') setMessage(DICT[nextLang].idleMsg);
        }}
        className="absolute top-6 right-6 flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm font-bold border border-gray-800 transition-colors"
      >
        <Globe className="w-4 h-4" /> {lang === 'zh' ? 'EN' : '中文'}
      </button>

      <div className="w-full max-w-md bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800 relative overflow-hidden mt-10">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${status === 'scanning' ? 'bg-cyan-500' : status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-500'}`} />

        <header className="mb-8 text-center mt-2 relative z-10">
          <h1 className="text-2xl font-bold mb-1 text-cyan-400 tracking-widest">{t.title}</h1>
          <p className="text-xs text-gray-500">{t.subtitle}</p>
        </header>

        <div className="flex flex-col items-center space-y-6 relative z-10">
          <div className="h-28 flex items-center justify-center">
            {status === "idle" && <ScanLine className="w-24 h-24 text-gray-600" />}
            {status === "starting" && <Loader2 className="w-24 h-24 text-cyan-500 animate-spin" />}
            {status === "scanning" && (
              <div className="relative">
                <ScanLine className="w-24 h-24 text-cyan-400" />
                <div className="absolute top-0 left-0 w-full h-full bg-cyan-400/30 animate-pulse rounded-lg" />
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}
            {status === "done" && <CheckCircle2 className="w-24 h-24 text-green-500 animate-bounce" />}
            {status === "error" && <AlertCircle className="w-24 h-24 text-red-500" />}
          </div>

          <p className={`text-center text-sm font-medium px-4 ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-green-400' : 'text-gray-300'}`}>
            {message}
          </p>

          {status === "idle" && (
            <div className="w-full space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={t.passcodePlaceholder}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="flex justify-center scale-90 w-full">
                <Turnstile 
                  siteKey="0x4AAAAAADDsQnq-Tr8bwOuV" // ⚠️ 記得補上你的 Site Key
                  onSuccess={(token) => setTurnstileToken(token)} 
                  options={{ theme: 'dark' }} 
                />
              </div>
            </div>
          )}

          <div className="w-full pt-2">
            {status === "idle" && (
              <button onClick={startScan} disabled={!turnstileToken || !passcode} className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${(!turnstileToken || !passcode) ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 active:scale-95"}`}>
                <ScanLine className="w-5 h-5" /> {t.btnStart}
              </button>
            )}

            {(status === "starting" || status === "scanning") && (
              <button disabled className="w-full py-4 rounded-xl font-bold text-lg bg-gray-800 text-cyan-500 border border-cyan-900/50 flex items-center justify-center gap-2 cursor-wait">
                <Loader2 className="w-5 h-5 animate-spin" /> {t.btnRunning}
              </button>
            )}

            {status === "done" && downloadUrl && (
              <div className="flex flex-col gap-3">
                <a href={downloadUrl} download="scan_result.pdf" target="_blank" rel="noreferrer" className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Download className="w-5 h-5" /> {t.btnDownload}
                </a>
                <button onClick={resetScanner} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-all">
                  <RefreshCw className="w-4 h-4" /> {t.btnNext}
                </button>
              </div>
            )}

            {status === "error" && (
              <button onClick={resetScanner} className="w-full py-4 rounded-xl font-bold text-lg bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <RefreshCw className="w-5 h-5" /> {t.btnRetry}
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <p className="text-gray-500 text-sm mb-2">{t.footerText}</p>
        <a href="https://www.ilovepdf.com/zh-tw" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-500 hover:text-cyan-400 text-sm font-medium transition-colors">
          {t.footerLink} <ExternalLink className="w-4 h-4" />
        </a>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `@keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}} />
    </main>
  );
}