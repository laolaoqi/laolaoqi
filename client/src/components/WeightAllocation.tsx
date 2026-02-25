// ===================================================================
// WeightAllocation — 动态权重分配 v2 (多语言)
// ===================================================================

import { WeightAllocation as WeightData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';

interface Props { weights: WeightData; }

function WeightBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-500 flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>{label}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color }}>{value}%</span>
      </div>
      <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden relative">
        <div className="h-full rounded-sm relative overflow-hidden" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}60, ${color})`, transition: 'width 1.2s ease-out', boxShadow: `0 0 10px ${color}30` }}>
          <div className="absolute inset-0 bar-glow" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)`, backgroundSize: '200% 100%' }} />
        </div>
        {[25, 50, 75].map(mark => (
          <div key={mark} className="absolute top-0 bottom-0 w-[1px] bg-[rgba(255,255,255,0.06)]" style={{ left: `${mark}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function WeightAllocationPanel({ weights }: Props) {
  const { lang } = useApp();
  return (
    <HudPanel title={t('panel.weight', lang)}>
      <div className="space-y-4">
        <WeightBar label={t('weight.fundamental', lang)} value={weights.fundamental} color="#00d4ff" icon="📊" />
        <WeightBar label={t('weight.capitalFlow', lang)} value={weights.capitalFlow} color="#f0b429" icon="💰" />
        <WeightBar label={t('weight.technical', lang)} value={weights.technical} color="#a855f7" icon="📈" />
      </div>
      <div className="mt-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
        <span className="text-sm text-red-400/70">{t('weight.autoAdjust', lang)}</span>
      </div>
    </HudPanel>
  );
}
