// ===================================================================
// NewsDigest — 舆情摘要
// 赛博战术指挥中心：终端风格信息展示
// ===================================================================

import { NewsDigest as NewsData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { MessageSquare, TrendingUp, Target } from 'lucide-react';

interface NewsDigestProps {
  digest: NewsData;
}

function DigestItem({ icon, label, text, color }: { icon: React.ReactNode; label: string; text: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-2.5 bg-[rgba(255,255,255,0.02)] rounded-sm border-l-2" style={{ borderLeftColor: color }}>
      <div className="mt-0.5 opacity-60">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-wider mb-1" style={{ color: `${color}99` }}>{label}</div>
        <div className="text-xs text-[#c8d0d8] leading-relaxed">{text}</div>
      </div>
    </div>
  );
}

export default function NewsDigestPanel({ digest }: NewsDigestProps) {
  return (
    <HudPanel title="舆情摘要">
      <div className="space-y-2.5">
        <DigestItem
          icon={<MessageSquare className="w-3.5 h-3.5 text-[#00d4ff]" />}
          label="主基调"
          text={digest.mainTone}
          color="#00d4ff"
        />
        <DigestItem
          icon={<TrendingUp className="w-3.5 h-3.5 text-[#f0b429]" />}
          label="资金动向"
          text={digest.capitalTrend}
          color="#f0b429"
        />
        <DigestItem
          icon={<Target className="w-3.5 h-3.5 text-[#00e676]" />}
          label="策略建议"
          text={digest.strategy}
          color="#00e676"
        />
      </div>
    </HudPanel>
  );
}
