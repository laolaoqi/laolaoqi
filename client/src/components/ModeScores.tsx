// ===================================================================
// ModeScores — 模式评分面板 v2 (多语言)
// ===================================================================

import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import type { ModeScore } from '@/lib/marketData';

interface Props { scores: ModeScore; }

const MODES = [
  { key: 'attack' as const, color: '#ff3b3b', icon: '⚔', labelKey: 'mode.attack' },
  { key: 'defense' as const, color: '#00e676', icon: '🛡', labelKey: 'mode.defense' },
  { key: 'oscillation' as const, color: '#f0b429', icon: '〰', labelKey: 'mode.oscillation' },
];

export default function ModeScores({ scores }: Props) {
  const { lang } = useApp();
  const dominant = scores.defense >= scores.attack && scores.defense >= scores.oscillation
    ? 'defense' : scores.attack >= scores.oscillation ? 'attack' : 'oscillation';
  const dominantMode = MODES.find(m => m.key === dominant)!;

  return (
    <HudPanel title={t('panel.modeScores', lang)} glow>
      {/* Dominant mode indicator */}
      <div className="text-center mb-4 pb-3 border-b border-[rgba(0,212,255,0.08)]">
        <span className="text-sm text-red-400 tracking-wider font-medium">{t('mode.dominant', lang)}</span>
        <div
          className="text-xl font-bold mt-1 tracking-wider"
          style={{ fontFamily: "'Orbitron', sans-serif", color: dominantMode.color, textShadow: `0 0 15px ${dominantMode.color}30` }}
        >
          {t(dominantMode.labelKey, lang)}
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-3">
        {MODES.map(mode => {
          const val = scores[mode.key];
          return (
            <div key={mode.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-400 font-medium">{mode.icon} {t(mode.labelKey, lang)}</span>
                <span className="text-base font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: mode.color }}>
                  {val}<span className="text-sm text-red-400 ml-0.5">{t('mode.score', lang)}</span>
                </span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${val}%`,
                    background: `linear-gradient(90deg, ${mode.color}80, ${mode.color}, ${mode.color}80)`,
                    transition: 'width 1s ease-out',
                    boxShadow: `0 0 8px ${mode.color}40`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HudPanel>
  );
}
