// ===================================================================
// TopRecommendations — 核心推荐 TOP 10
// 赛博战术指挥中心：数据矩阵表格 + 信号标记
// ===================================================================

import { StockRecommendation } from '@/lib/marketData';
import HudPanel from './HudPanel';

interface TopRecommendationsProps {
  recommendations: StockRecommendation[];
}

function SignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    '买入': { bg: 'rgba(0,230,118,0.1)', text: '#00e676', border: 'rgba(0,230,118,0.3)' },
    '增持': { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff', border: 'rgba(0,212,255,0.3)' },
    '观望': { bg: 'rgba(240,180,41,0.1)', text: '#f0b429', border: 'rgba(240,180,41,0.3)' },
    '减持': { bg: 'rgba(255,59,59,0.1)', text: '#ff3b3b', border: 'rgba(255,59,59,0.3)' },
  };
  const c = config[signal] || config['观望'];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-sm border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {signal}
    </span>
  );
}

export default function TopRecommendations({ recommendations }: TopRecommendationsProps) {
  return (
    <HudPanel title="核心推荐 TOP 10" scan>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr className="text-[#8899aa]/60 text-[10px] tracking-wider border-b border-[rgba(0,212,255,0.08)]">
              <th className="text-left py-2 px-1 font-normal">#</th>
              <th className="text-left py-2 px-1 font-normal">名称</th>
              <th className="text-left py-2 px-1 font-normal hidden sm:table-cell">代码</th>
              <th className="text-left py-2 px-1 font-normal hidden md:table-cell">行业</th>
              <th className="text-right py-2 px-1 font-normal">现价</th>
              <th className="text-right py-2 px-1 font-normal">涨跌</th>
              <th className="text-center py-2 px-1 font-normal hidden sm:table-cell">评分</th>
              <th className="text-center py-2 px-1 font-normal">信号</th>
              <th className="text-right py-2 px-1 font-normal hidden lg:table-cell">资金流</th>
              <th className="text-left py-2 px-1 font-normal hidden xl:table-cell">理由</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((stock) => {
              const isUp = stock.changePercent >= 0;
              const color = isUp ? '#00e676' : '#ff3b3b';
              const flowColor = stock.capitalFlow >= 0 ? '#00e676' : '#ff3b3b';

              return (
                <tr
                  key={stock.code}
                  className="border-b border-[rgba(0,212,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-colors"
                >
                  <td className="py-2 px-1">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-sm ${
                        stock.rank <= 3
                          ? 'bg-[rgba(240,180,41,0.15)] text-[#f0b429] border border-[rgba(240,180,41,0.3)]'
                          : 'text-[#8899aa]/50'
                      }`}
                    >
                      {stock.rank}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-[#e0e8f0] font-medium" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {stock.name}
                  </td>
                  <td className="py-2 px-1 text-[#8899aa] hidden sm:table-cell">{stock.code}</td>
                  <td className="py-2 px-1 text-[#8899aa] hidden md:table-cell" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {stock.industry}
                  </td>
                  <td className="py-2 px-1 text-right tabular-nums" style={{ color }}>
                    ¥{stock.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-right tabular-nums" style={{ color }}>
                    {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </td>
                  <td className="py-2 px-1 text-center hidden sm:table-cell">
                    <span
                      className="inline-flex items-center justify-center w-8 h-5 text-[10px] font-bold rounded-sm"
                      style={{
                        backgroundColor: `rgba(0,212,255,${stock.score / 300})`,
                        color: stock.score >= 85 ? '#00d4ff' : '#8899aa',
                        border: stock.score >= 85 ? '1px solid rgba(0,212,255,0.3)' : 'none',
                      }}
                    >
                      {stock.score}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <SignalBadge signal={stock.signal} />
                  </td>
                  <td className="py-2 px-1 text-right tabular-nums hidden lg:table-cell" style={{ color: flowColor }}>
                    {stock.capitalFlow >= 0 ? '+' : ''}{stock.capitalFlow.toFixed(2)}亿
                  </td>
                  <td className="py-2 px-1 text-[#8899aa]/70 hidden xl:table-cell text-[10px]" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {stock.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HudPanel>
  );
}
