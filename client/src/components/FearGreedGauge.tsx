// ===================================================================
// FearGreedGauge — 恐惧贪婪指数半圆仪表盘
// ===================================================================

import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';

interface Props { value: number; }

function getZone(v: number): { label: string; color: string; labelKey: string } {
  if (v <= 20) return { label: 'Extreme Fear', color: '#ff2244', labelKey: 'fg.extremeFear' };
  if (v <= 40) return { label: 'Fear', color: '#ff6644', labelKey: 'fg.fear' };
  if (v <= 60) return { label: 'Neutral', color: '#ffaa00', labelKey: 'fg.neutral' };
  if (v <= 80) return { label: 'Greed', color: '#88cc44', labelKey: 'fg.greed' };
  return { label: 'Extreme Greed', color: '#00e676', labelKey: 'fg.extremeGreed' };
}

export default function FearGreedGauge({ value }: Props) {
  const { lang } = useApp();
  const zone = getZone(value);
  const angle = -90 + (value / 100) * 180; // -90 to 90 degrees

  return (
    <HudPanel title={t('panel.fearGreed', lang)}>
      <div className="flex flex-col items-center py-2">
        {/* SVG Gauge */}
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
          {/* Background arc segments */}
          <defs>
            <linearGradient id="fg-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff2244" />
              <stop offset="25%" stopColor="#ff6644" />
              <stop offset="50%" stopColor="#ffaa00" />
              <stop offset="75%" stopColor="#88cc44" />
              <stop offset="100%" stopColor="#00e676" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#fg-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Needle */}
          <g transform={`rotate(${angle}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="35" stroke={zone.color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" fill={zone.color} />
            <circle cx="100" cy="100" r="2.5" fill="#0a0e17" />
          </g>
          {/* Labels */}
          <text x="18" y="115" fill="#667788" fontSize="8" textAnchor="start">0</text>
          <text x="100" y="22" fill="#667788" fontSize="8" textAnchor="middle">50</text>
          <text x="182" y="115" fill="#667788" fontSize="8" textAnchor="end">100</text>
        </svg>

        {/* Value */}
        <div className="text-center -mt-2">
          <div className="text-2xl font-black tabular-nums" style={{ fontFamily: "'Orbitron', sans-serif", color: zone.color }}>
            {value}
          </div>
          <div className="text-xs font-medium mt-0.5" style={{ color: zone.color }}>
            {t(zone.labelKey, lang)}
          </div>
        </div>
      </div>
    </HudPanel>
  );
}
