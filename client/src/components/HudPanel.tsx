// ===================================================================
// HUD Panel — 赛博战术指挥中心基础面板组件
// 角标切割 + 发光边框 + 扫描线动画
// ===================================================================

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HudPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  scan?: boolean;
  glow?: boolean;
}

export default function HudPanel({ title, children, className, scan = false, glow = false }: HudPanelProps) {
  return (
    <div
      className={cn(
        'hud-panel relative p-4',
        scan && 'scan-line',
        glow && 'pulse-glow',
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[rgba(0,212,255,0.12)]">
        <div className="w-1.5 h-4 bg-[#00d4ff] opacity-80" />
        <h3
          className="text-xs tracking-[0.2em] uppercase text-[#00d4ff] opacity-90"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          {title}
        </h3>
        <div className="flex-1" />
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-[#00d4ff] opacity-40" />
          <div className="w-1.5 h-1.5 bg-[#00d4ff] opacity-25" />
          <div className="w-1.5 h-1.5 bg-[#00d4ff] opacity-15" />
        </div>
      </div>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
