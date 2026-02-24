// ===================================================================
// WeightAllocation — 动态权重分配
// 赛博战术指挥中心：水平进度条 + 发光效果
// ===================================================================

import { WeightAllocation as WeightData } from '@/lib/marketData';
import HudPanel from './HudPanel';

interface WeightAllocationProps {
  weights: WeightData;
}

function WeightBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899aa] flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          {label}
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", color }}
        >
          {value}%
        </span>
      </div>
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden relative">
        <div
          className="h-full rounded-sm relative overflow-hidden"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            transition: 'width 1.2s ease-out',
            boxShadow: `0 0 10px ${color}30`,
          }}
        >
          {/* Animated shine */}
          <div
            className="absolute inset-0 bar-glow"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
              backgroundSize: '200% 100%',
            }}
          />
        </div>
        {/* Grid marks */}
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-[1px] bg-[rgba(255,255,255,0.06)]"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function WeightAllocationPanel({ weights }: WeightAllocationProps) {
  return (
    <HudPanel title="动态权重分配">
      <div className="space-y-4">
        <WeightBar label="基本面" value={weights.fundamental} color="#00d4ff" icon="📊" />
        <WeightBar label="资金流" value={weights.capitalFlow} color="#f0b429" icon="💰" />
        <WeightBar label="技术量" value={weights.technical} color="#a855f7" icon="📈" />
      </div>
      <div className="mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        <span className="text-[10px] text-[#8899aa]/50">权重根据市场模式自动调整</span>
      </div>
    </HudPanel>
  );
}
