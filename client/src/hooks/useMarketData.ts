// ===================================================================
// 猎手阿尔法 — 市场数据 Hook（多市场联动版）
// 根据当前选中市场获取对应数据
// ===================================================================

import { useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useApp, type MarketId } from '@/contexts/AppContext';
import {
  IndexData,
  StockRecommendation,
  ModeScore,
  WeightAllocation,
  MarketSentiment,
  NewsDigest,
  RiskControl,
  generateMockIndices,
  calculateModeScores,
  calculateWeights,
  calculateSentiment,
  generateNewsDigest,
  generateRecommendations,
  getRiskControl,
} from '@/lib/marketData';

interface MarketState {
  indices: IndexData[];
  allIndices: IndexData[]; // All markets combined for panorama
  recommendations: StockRecommendation[];
  modeScores: ModeScore;
  weights: WeightAllocation;
  sentiment: MarketSentiment;
  newsDigest: NewsDigest;
  riskControl: RiskControl;
  marketLoading: boolean;
  lastUpdate: Date | null;
  isLive: boolean;
  error: string | null;
}

export function useMarketData(refreshInterval = 30000) {
  const { market } = useApp();

  // Fetch indices for current market
  const indicesQuery = trpc.market.indices.useQuery(
    { market },
    { refetchInterval: refreshInterval, retry: 2 }
  );

  // Fetch ALL market indices for panorama view
  const cnQuery = trpc.market.indices.useQuery({ market: 'cn' }, { refetchInterval: refreshInterval, retry: 1 });
  const hkQuery = trpc.market.indices.useQuery({ market: 'hk' }, { refetchInterval: refreshInterval, retry: 1 });
  const usQuery = trpc.market.indices.useQuery({ market: 'us' }, { refetchInterval: refreshInterval, retry: 1 });
  const cryptoQuery = trpc.market.indices.useQuery({ market: 'crypto' }, { refetchInterval: refreshInterval, retry: 1 });

  // Fetch recommendations for current market (30 min refresh)
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

  const state = useMemo<MarketState>(() => {
    // Current market indices
    const currentIndices = mapApiIndices(indicesQuery.data);
    const indices = currentIndices.length > 0 ? currentIndices : generateMockIndices();
    const isLive = indicesQuery.data?.isLive ?? false;

    // All indices for panorama
    const allIndices = [
      ...mapApiIndices(cnQuery.data),
      ...mapApiIndices(hkQuery.data),
      ...mapApiIndices(usQuery.data),
      ...mapApiIndices(cryptoQuery.data),
    ];

    // Recommendations
    let recommendations: StockRecommendation[];
    if (recsQuery.data?.data && recsQuery.data.data.length > 0) {
      recommendations = recsQuery.data.data as StockRecommendation[];
    } else {
      recommendations = generateRecommendations();
    }

    const modeScores = calculateModeScores(indices);
    const weights = calculateWeights(modeScores);
    const sentiment = calculateSentiment(indices);
    const newsDigest = generateNewsDigest(sentiment, modeScores);
    const riskControl = getRiskControl(modeScores);

    return {
      indices,
      allIndices: allIndices.length > 0 ? allIndices : generateMockIndices(),
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
  }, [indicesQuery.data, indicesQuery.isLoading, indicesQuery.dataUpdatedAt, indicesQuery.error,
      cnQuery.data, hkQuery.data, usQuery.data, cryptoQuery.data, recsQuery.data]);

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
