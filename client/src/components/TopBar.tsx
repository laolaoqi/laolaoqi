// ===================================================================
// TopBar — 赛博战术指挥中心顶部导航
// 猎手阿尔法品牌 + 系统状态 + 时间
// ===================================================================

import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, RefreshCw, User, LogOut } from 'lucide-react';

interface TopBarProps {
  isLive: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

const LOGO_URL = 'https://private-us-east-1.manuscdn.com/sessionFile/5mBhgnjK6Lia4j3MfXGMvH/sandbox/NOT8bhL1LfjHxBx0AyI0wR_1771952368755_na1fn_bG9nby1pY29u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvNW1CaGduaks2TGlhNGozTWZYR012SC9zYW5kYm94L05PVDhiaEwxTGZqSHhCeDBBeUkwd1JfMTc3MTk1MjM2ODc1NV9uYTFmbl9iRzluYnkxcFkyOXUucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=NH1YkrtZvw0nQ3IbUVZzMTKDmqY8X2qORRf0nArVfDweRuwL10mLqsge8JFvw1pOoBEWn0ck2431~i7y~~dPkBipKXG2ElPL3wvpq2ftaw61ZlLlp9iXbOAMXkIWkRDc4lGXo2L-BB4YkkJVcO8AZT9l6m-eFR-8DBd8urZrM63KsI9-Qg4FQmF3Gw7d~6t70t5gQ7hyj2fA8SW~RC-QoAF1sFNbPBRPHU2S~~1bOBNhrVCWsV7IFz6i1DaVb5EvvmE7Dr7BQDIAS4fy~X--h9AEV-67p4Is1uhzrp~e1wPCucAAlsRSQi3rnxW9SQmUtG5QdabM7Nkwuh8Xu470Zg__';

export default function TopBar({ isLive, lastUpdate, onRefresh }: TopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  };

  return (
    <header className="relative h-14 flex items-center px-4 lg:px-6 border-b border-[rgba(0,212,255,0.12)] bg-[rgba(10,14,23,0.98)]">
      {/* Glow line top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-60" />

      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <img src={LOGO_URL} alt="Logo" className="w-8 h-8 opacity-90" />
        <div className="flex flex-col">
          <span
            className="text-sm font-bold tracking-[0.15em] text-[#00d4ff]"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            HUNTER ALPHA
          </span>
          <span className="text-[10px] text-[#00d4ff]/40 tracking-wider">猎手阿尔法 · 战术指挥中心</span>
        </div>
      </div>

      {/* Center: Status */}
      <div className="flex-1 flex items-center justify-center gap-6">
        <div className="hidden md:flex items-center gap-2 text-xs">
          {isLive ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#00e676]" />
              <span className="text-[#00e676]">实时数据</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#f0b429]" />
              <span className="text-[#f0b429]">模拟数据</span>
            </>
          )}
        </div>
        {lastUpdate && (
          <span className="hidden md:inline text-[10px] text-[#00d4ff]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            更新于 {formatTime(lastUpdate)}
          </span>
        )}
      </div>

      {/* Right: Time & Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-[rgba(0,212,255,0.1)] rounded transition-colors"
          title="刷新数据"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#00d4ff]/60 hover:text-[#00d4ff]" />
        </button>

        <div className="flex flex-col items-end" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span className="text-sm text-[#00d4ff] font-medium tabular-nums">{formatTime(time)}</span>
          <span className="text-[10px] text-[#00d4ff]/40">{formatDate(time)}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[rgba(0,212,255,0.12)]">
          <div className="w-7 h-7 rounded bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[#00d4ff]/60" />
          </div>
        </div>
      </div>
    </header>
  );
}
