// ===================================================================
// NewsDigest — 舆情摘要 v2 (多语言)
// ===================================================================

import { NewsDigest as NewsData } from '@/lib/marketData';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import { MessageSquare, TrendingUp, Target } from 'lucide-react';

interface Props { digest: NewsData; }

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

export default function NewsDigestPanel({ digest }: Props) {
  const { lang } = useApp();
  return (
    <HudPanel title={t('panel.news', lang)}>
      <div className="space-y-2.5">
        <DigestItem icon={<MessageSquare className="w-3.5 h-3.5 text-[#00d4ff]" />} label={t('news.mainTone', lang)} text={digest.mainTone} color="#00d4ff" />
        <DigestItem icon={<TrendingUp className="w-3.5 h-3.5 text-[#f0b429]" />} label={t('news.capitalTrend', lang)} text={digest.capitalTrend} color="#f0b429" />
        <DigestItem icon={<Target className="w-3.5 h-3.5 text-[#00e676]" />} label={t('news.strategy', lang)} text={digest.strategy} color="#00e676" />
      </div>
    </HudPanel>
  );
}
