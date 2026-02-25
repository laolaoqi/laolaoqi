// ===================================================================
// RiskControl — 风控与交易计划 v2 (多语言)
// ===================================================================

import { RiskControl as RiskData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import { ShieldAlert, Target, BarChart3 } from 'lucide-react';

interface Props { riskControl: RiskData; }

function RiskCard({ icon, title, children, accentColor }: { icon: React.ReactNode; title: string; children: React.ReactNode; accentColor: string }) {
  return (
    <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded-sm border border-[rgba(255,255,255,0.04)] hover:border-opacity-20 transition-all" style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="opacity-70">{icon}</div>
        <span className="text-sm font-medium text-[#c8d0d8]">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-red-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: color || '#c8d0d8' }}>{value}</span>
    </div>
  );
}

export default function RiskControlPanel({ riskControl }: Props) {
  const { lang } = useApp();
  return (
    <HudPanel title={t('panel.riskControl', lang)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Stop Loss */}
        <RiskCard icon={<ShieldAlert className="w-4 h-4 text-[#ff3b3b]" />} title={t('risk.stopLoss', lang)} accentColor="#ff3b3b">
          <div className="text-center py-2">
            <div className="text-2xl font-bold text-[#ff3b3b] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", textShadow: '0 0 15px rgba(255,59,59,0.3)' }}>
              {riskControl.stopLoss}
            </div>
            <div className="text-sm text-[#ff3b3b]/60 mt-1">{t('risk.hardStop', lang)}</div>
          </div>
          <div className="text-sm text-red-400/70 text-center border-t border-[rgba(255,59,59,0.1)] pt-2">
            {t('risk.strictExec', lang)}
          </div>
        </RiskCard>

        {/* Take Profit */}
        <RiskCard icon={<Target className="w-4 h-4 text-[#00e676]" />} title={t('risk.takeProfit', lang)} accentColor="#00e676">
          {riskControl.takeProfit.map((tp, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00e676]" style={{ opacity: 1 - i * 0.25 }} />
              <span className="text-sm text-[#c8d0d8] font-mono">{tp}</span>
            </div>
          ))}
          <div className="text-sm text-red-400/70 text-center border-t border-[rgba(0,230,118,0.1)] pt-2 mt-1">
            {t('risk.batchProfit', lang)}
          </div>
        </RiskCard>

        {/* Position */}
        <RiskCard icon={<BarChart3 className="w-4 h-4 text-[#00d4ff]" />} title={t('risk.position', lang)} accentColor="#00d4ff">
          <DataRow label={t('risk.current', lang)} value={riskControl.position.current} color="#00d4ff" />
          <DataRow label={t('risk.bull', lang)} value={riskControl.position.bull} color="#00e676" />
          <DataRow label={t('risk.bear', lang)} value={riskControl.position.bear} color="#ff3b3b" />
          <div className="text-sm text-red-400/70 text-center border-t border-[rgba(0,212,255,0.1)] pt-2 mt-1">
            {t('risk.dynamicAdjust', lang)}
          </div>
        </RiskCard>
      </div>
    </HudPanel>
  );
}
