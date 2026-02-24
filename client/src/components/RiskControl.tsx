// ===================================================================
// RiskControl — 风控与交易计划
// 赛博战术指挥中心：三栏卡片 + 警示色彩
// ===================================================================

import { RiskControl as RiskData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { ShieldAlert, Target, BarChart3 } from 'lucide-react';

interface RiskControlProps {
  riskControl: RiskData;
}

function RiskCard({
  icon,
  title,
  children,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      className="p-3 bg-[rgba(255,255,255,0.02)] rounded-sm border border-[rgba(255,255,255,0.04)] hover:border-opacity-20 transition-all"
      style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="opacity-70">{icon}</div>
        <span className="text-xs font-medium text-[#c8d0d8]" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
          {title}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#8899aa]">{label}</span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: color || '#c8d0d8' }}
      >
        {value}
      </span>
    </div>
  );
}

export default function RiskControlPanel({ riskControl }: RiskControlProps) {
  return (
    <HudPanel title="风控与交易计划">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Stop Loss */}
        <RiskCard
          icon={<ShieldAlert className="w-4 h-4 text-[#ff3b3b]" />}
          title="止损策略"
          accentColor="#ff3b3b"
        >
          <div className="text-center py-2">
            <div
              className="text-2xl font-bold text-[#ff3b3b] tabular-nums"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: '0 0 15px rgba(255,59,59,0.3)',
              }}
            >
              {riskControl.stopLoss.split(' ')[0]}
            </div>
            <div className="text-[10px] text-[#ff3b3b]/60 mt-1">
              {riskControl.stopLoss.split(' ').slice(1).join(' ')}
            </div>
          </div>
          <div className="text-[10px] text-[#8899aa]/50 text-center border-t border-[rgba(255,59,59,0.1)] pt-2">
            严格执行，不留侥幸
          </div>
        </RiskCard>

        {/* Take Profit */}
        <RiskCard
          icon={<Target className="w-4 h-4 text-[#00e676]" />}
          title="止盈策略"
          accentColor="#00e676"
        >
          {riskControl.takeProfit.map((tp, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00e676]" style={{ opacity: 1 - i * 0.25 }} />
              <span
                className="text-xs text-[#c8d0d8]"
                style={{ fontFamily: i < 2 ? "'JetBrains Mono', monospace" : "'Noto Sans SC', sans-serif" }}
              >
                {tp}
              </span>
            </div>
          ))}
          <div className="text-[10px] text-[#8899aa]/50 text-center border-t border-[rgba(0,230,118,0.1)] pt-2 mt-1">
            分批止盈，锁定利润
          </div>
        </RiskCard>

        {/* Position */}
        <RiskCard
          icon={<BarChart3 className="w-4 h-4 text-[#00d4ff]" />}
          title="仓位建议"
          accentColor="#00d4ff"
        >
          <DataRow label="当前建议" value={riskControl.position.current} color="#00d4ff" />
          <DataRow label="牛市仓位" value={riskControl.position.bull} color="#00e676" />
          <DataRow label="熊市仓位" value={riskControl.position.bear} color="#ff3b3b" />
          <div className="text-[10px] text-[#8899aa]/50 text-center border-t border-[rgba(0,212,255,0.1)] pt-2 mt-1">
            根据市场模式动态调整
          </div>
        </RiskCard>
      </div>
    </HudPanel>
  );
}
