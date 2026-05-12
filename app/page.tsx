"use client";

import { useState } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, Download, RefreshCw } from 'lucide-react';

export default function Home() {
  const [turnstileToken, setTurnstileToken] = useState("");
  // 狀態機：閒置 -> 啟動中 -> 掃描中(輪詢) -> 完成 / 錯誤
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "done" | "error">("idle");
  const [message, setMessage] = useState("請將文件面朝下放置於玻璃台，並蓋上上蓋");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const startScan = async () => {
    if (!turnstileToken) {
      setMessage("🛡️ 請先等待人機驗證完成");
      return;
    }
    
    setStatus("starting");
    setMessage("正在喚醒硬體，請稍候...");
    setDownloadUrl(null);

    try {
      // 1. 發送啟動指令 (不等待掃描完成，只要後端確認收到就回傳 jobId)
      const startRes = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 'cf-turnstile-response': turnstileToken }),
      });

      const startData = await startRes.json();

      if (!startRes.ok) throw new Error(startData.error || "啟動硬體失敗");

      const jobId = startData.jobId;
      setStatus("scanning");
      setMessage("🖨️ 掃描器運作中，請勿掀開蓋子... (約需 40~60 秒)");

      // 2. 開始長輪詢 (每 3 秒問一次後端進度)
      pollStatus(jobId);

    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "發生未知連線錯誤");
    }
  };

  // 輪詢函數
  const pollStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/status?jobId=${jobId}`);
        const data = await res.json();

        if (data.status === "done") {
          clearInterval(pollInterval);
          setStatus("done");
          setMessage("✅ 掃描大功告成！檔案已加密暫存");
          setDownloadUrl(data.downloadUrl);
        } else if (data.status === "error") {
          clearInterval(pollInterval);
          setStatus("error");
          setMessage("❌ 掃描失敗：" + (data.error || "硬體無回應"));
        }
        // 如果是 processing，甚麼都不做，繼續下一次輪迴
      } catch (error) {
        clearInterval(pollInterval);
        setStatus("error");
        setMessage("伺服器連線異常中斷");
      }
    }, 3000); // 設定每 3000 毫秒 (3秒) 敲一次門
  };

  const resetScanner = () => {
    setStatus("idle");
    setMessage("請將下一份文件放置於玻璃台，並蓋上上蓋");
    setDownloadUrl(null);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800 relative overflow-hidden">
        
        {/* 背景裝飾光暈 */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${status === 'scanning' ? 'bg-cyan-500' : status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-500'}`} />

        <header className="mb-8 text-center mt-2 relative z-10">
          <h1 className="text-2xl font-bold mb-1 text-cyan-400 tracking-widest">雲端自助掃描</h1>
          <p className="text-xs text-gray-500">Cloud Document Scan System</p>
        </header>

        <div className="flex flex-col items-center space-y-8 relative z-10">
          
          {/* 狀態圖示區 (會根據狀態切換不同動畫) */}
          <div className="h-32 flex items-center justify-center">
            {status === "idle" && <ScanLine className="w-24 h-24 text-gray-600" />}
            {status === "starting" && <Loader2 className="w-24 h-24 text-cyan-500 animate-spin" />}
            {status === "scanning" && (
              <div className="relative">
                <ScanLine className="w-24 h-24 text-cyan-400" />
                <div className="absolute top-0 left-0 w-full h-full bg-cyan-400/30 animate-pulse rounded-lg" />
                {/* 掃描線動畫 */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}
            {status === "done" && <CheckCircle2 className="w-24 h-24 text-green-500 animate-bounce" />}
            {status === "error" && <AlertCircle className="w-24 h-24 text-red-500" />}
          </div>

          {/* 訊息提示 */}
          <p className={`text-center text-sm font-medium px-4 ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-green-400' : 'text-gray-300'}`}>
            {message}
          </p>

          {/* Cloudflare 人機驗證 (只有閒置時顯示) */}
          {status === "idle" && (
            <div className="flex justify-center scale-90 w-full">
              <Turnstile 
                siteKey="0x4AAAAAADDsQnq-Tr8bwOuV" // ⚠️ 記得補上你的 Site Key
                onSuccess={(token) => setTurnstileToken(token)} 
                options={{ theme: 'dark' }} 
              />
            </div>
          )}

          {/* 按鈕控制區 */}
          <div className="w-full">
            {status === "idle" && (
              <button onClick={startScan} disabled={!turnstileToken} className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${!turnstileToken ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 active:scale-95"}`}>
                <ScanLine className="w-5 h-5" /> 開始掃描
              </button>
            )}

            {(status === "starting" || status === "scanning") && (
              <button disabled className="w-full py-4 rounded-xl font-bold text-lg bg-gray-800 text-cyan-500 border border-cyan-900/50 flex items-center justify-center gap-2 cursor-wait">
                <Loader2 className="w-5 h-5 animate-spin" /> 硬體執行中...
              </button>
            )}

            {status === "done" && downloadUrl && (
              <div className="flex flex-col gap-3">
                <a href={downloadUrl} download="scan_result.pdf" target="_blank" rel="noreferrer" className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Download className="w-5 h-5" /> 下載 PDF 檔案
                </a>
                <button onClick={resetScanner} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-all">
                  <RefreshCw className="w-4 h-4" /> 掃描下一張
                </button>
              </div>
            )}

            {status === "error" && (
              <button onClick={resetScanner} className="w-full py-4 rounded-xl font-bold text-lg bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <RefreshCw className="w-5 h-5" /> 重新測試
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 掃描線的 CSS 動畫定義 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </main>
  );
}