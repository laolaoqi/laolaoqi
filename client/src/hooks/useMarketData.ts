// ===================================================================
// useMarketData — 按当前选中市场获取数据
// 点A股只获取A股数据，点H股只获取港股数据，以此类推
// ===================================================================

import { useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useApp } from '@/contexts/AppContext';
import type {
  IndexData,
  StockRecommendation,
  ModeScore,
  WeightAllocation,
  MarketSentiment,
  NewsDigest,
  RiskControl,
} from '@/lib/marketData';
import {
  generateMockIndices,
  calculateModeScores,
  calculateWeights,
  calculateSentiment,
  generateNewsDigest,
  generateRecommendations,
  getRiskControl,
} from '@/lib/marketData';

export function useMarketData(refreshInterval = 30000) {
  const { market } = useApp();

  // Only fetch current market indices
  const indicesQuery = trpc.market.indices.useQuery(
    { market },
    { refetchInterval: refreshInterval, retry: 2 }
  );

  // Only fetch current market recommendations (30 min refresh)
  const recsQuery = trpc.market.recommendations.useQuery(
    { market },
    { refetchInterval: 30 * 60 * 1000, retry: 2 }
  );

  const utils = trpc.useUtils();

  const mapApiIndices = (data: any): IndexData[] => {
    if (!data?.data || data.data.length === 0) return [];
    return data.data.map((idx: any) => ({
      symbol: idx.symbol,
      name: idx.nameZh || idx.nameEn || idx.symbol,
      nameZh: idx.nameZh, nameEn: idx.nameEn, nameJa: idx.nameJa, nameKo: idx.nameKo, nameAr: idx.nameAr,
      price: idx.price,
      change: idx.change,
      changePercent: idx.changePercent,
      high: idx.high,
      low: idx.low,
      volume: idx.volume,
      chartData: idx.chartData || [],
      prevClose: idx.price - idx.change,
      market: idx.market,
    }));
  };

  const state = useMemo(() => {
    // Current market indices only
    const currentIndices = mapApiIndices(indicesQuery.data);
    const indices = currentIndices.length > 0 ? currentIndices : generateMockIndices().slice(0, 3);
    const isLive = indicesQuery.data?.isLive ?? false;

    // Current market recommendations only
    let recommendations: StockRecommendation[];
    if (recsQuery.data?.data && recsQuery.data.data.length > 0) {
      recommendations = recsQuery.data.data as StockRecommendation[];
    } else {
      recommendations = generateRecommendations();
    }

    const modeScores = calculateModeScores(indices);
    const weights = calculateWeights(modeScores);
    const sentiment = calculateSentiment(indices);
    const newsDigest = generateNewsDigest(sentiment, modeScores, market);
    const riskControl = getRiskControl(modeScores);

    return {
      indices,
      recommendations,
      modeScores,
      weights,
      sentiment,
      newsDigest,
      riskControl,
      marketLoading: indicesQuery.isLoading,
      lastUpdate: indicesQuery.dataUpdatedAt ? new Date(indicesQuery.dataUpdatedAt) : null,
      isLive,
      error: indicesQuery.error?.message || null,
    };
  }, [indicesQuery.data, indicesQuery.isLoading, indicesQuery.dataUpdatedAt, indicesQuery.error, recsQuery.data]);

  const refresh = useCallback(() => {
    utils.market.indices.invalidate();
    utils.market.recommendations.invalidate();
  }, [utils]);

  return {
    ...state,
    loading: state.marketLoading,
    refresh,
  };
}
