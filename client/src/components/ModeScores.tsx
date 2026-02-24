// ===================================================================
// ModeScores — 进攻/防御/震荡模式评分
// 赛博战术指挥中心：弧形仪表 + 脉冲发光
// ===================================================================

import { ModeScore } from '@/lib/marketData';
import HudPanel from './HudPanel';

interface ModeScoresProps {
  scores: ModeScore;
}

function ScoreGauge({ label, score, color, icon }: { label: string; score: number; color: string; icon: string }) {
  const percentage = score;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg" style={{ filter: 'grayscale(0)' }}>{icon}</span>
          <span
            className="text-xl font-bold tabular-nums"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color,
              textShadow: `0 0 10px ${color}40`,
            }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs text-[#8899aa] tracking-wider">{label}</span>
    </div>
  );
}

function BarScore({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899aa]">{label}</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", color }}
        >
          {score}
          <span className="text-[10px] text-[#8899aa] ml-0.5">分</span>
        </span>
      </div>
      <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm bar-glow"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}80, ${color}, ${color}80)`,
            transition: 'width 1s ease-out',
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

export default function ModeScores({ scores }: ModeScoresProps) {
  const dominant = scores.defense >= scores.attack && scores.defense >= scores.oscillation
    ? '防御'
    : scores.attack >= scores.oscillation
    ? '进攻'
    : '震荡';

  return (
    <HudPanel title="模式评分" glow>
      {/* Dominant mode indicator */}
      <div className="text-center mb-4 pb-3 border-b border-[rgba(0,212,255,0.08)]">
        <span className="text-[10px] text-[#8899aa] tracking-wider">当前主导模式</span>
        <div
          className="text-lg font-bold mt-1 tracking-wider"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: dominant === '进攻' ? '#ff3b3b' : dominant === '防御' ? '#00e676' : '#f0b429',
            textShadow: `0 0 15px ${dominant === '进攻' ? '#ff3b3b' : dominant === '防御' ? '#00e676' : '#f0b429'}30`,
          }}
        >
          {dominant}模式
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-3">
        <BarScore label="⚔ 进攻模式" score={scores.attack} color="#ff3b3b" />
        <BarScore label="🛡 防御模式" score={scores.defense} color="#00e676" />
        <BarScore label="〰 震荡模式" score={scores.oscillation} color="#f0b429" />
      </div>
    </HudPanel>
  );
}
