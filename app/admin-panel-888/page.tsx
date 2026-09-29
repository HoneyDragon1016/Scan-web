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
import { ShieldAlert, Unlock, Save, RefreshCw } from 'lucide-react';

export default function AdminPanel() {
  const [adminPass, setAdminPass] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [passcodes, setPasscodes] = useState("");
  const [message, setMessage] = useState("");

 const fetchStatus = async (password: string) => {
    setMessage("連線驗證中...");
    try {
      const res = await fetch('/api/scan/admin', { headers: { 'Authorization': `Bearer ${password}` } });
      const data = await res.json();

      if (res.ok) {
        setIsLocked(data.isLocked);
        setPasscodes(data.passcodes);
        setIsLogged(true);
        setMessage("已連線至管理核心");
      } else {
        // 恢復成低調的錯誤提示，不留任何線索
        setMessage("超級密碼錯誤");
      }
    } catch (error) {
      setMessage("網路連線異常，請稍後再試");
    }
  };

  const handleAction = async (action: string, payload?: string) => {
    // 修改前：const res = await fetch('/api/admin', { ...
    const res = await fetch('/api/scan/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminPass}` },
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (action === 'unlock') setIsLocked(false);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-mono">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-xl mb-4">RESTRICTED AREA</h1>
        <div className="flex flex-col gap-2">
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            className="bg-gray-900 border border-gray-700 p-3 rounded text-center"
            onChange={(e) => setAdminPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStatus(adminPass)}
          />
          {/* 加入實體按鈕，避免是 Enter 鍵監聽失效 */}
          <button 
            onClick={() => fetchStatus(adminPass)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded font-bold transition-all"
          >
            強制登入
          </button>
        </div>
        <p className="text-red-400 text-sm mt-4 text-center max-w-xs break-words">{message}</p>
      </div>
    );
  }

  // ... (下方登入成功的畫面保持不變)
  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 text-white font-mono">
      <div className="w-full max-w-lg bg-gray-900 p-6 rounded-xl border border-gray-800">
        <h1 className="text-2xl text-cyan-400 mb-6 flex items-center gap-2"><ShieldAlert /> 系統管理後台</h1>
        <p className="text-green-400 mb-6 text-sm">{message}</p>

        <div className="mb-8 p-4 bg-gray-950 rounded-lg border border-gray-800 flex justify-between items-center">
          <div>
            <span className="text-gray-400 block text-sm">硬體狀態</span>
            <span className={`font-bold ${isLocked ? 'text-red-500' : 'text-green-500'}`}>
              {isLocked ? '🔒 鎖定中' : '✅ 閒置中'}
            </span>
          </div>
          <button onClick={() => handleAction('unlock')} disabled={!isLocked} className={`p-3 rounded flex items-center gap-2 ${isLocked ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
            <Unlock className="w-4 h-4"/> 強制解鎖
          </button>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">授權密碼本 (一行一個)</label>
          <textarea 
            rows={6}
            value={passcodes}
            onChange={(e) => setPasscodes(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 p-3 rounded text-white"
          />
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => handleAction('update_passcodes', passcodes)} className="flex-1 bg-cyan-600 py-3 rounded flex justify-center items-center gap-2">
            <Save className="w-4 h-4"/> 儲存密碼本
          </button>
          <button onClick={() => fetchStatus(adminPass)} className="px-4 bg-gray-800 py-3 rounded flex justify-center items-center">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}