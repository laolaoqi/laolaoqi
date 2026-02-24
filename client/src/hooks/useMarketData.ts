// ===================================================================
// 猎手阿尔法 — 市场数据 Hook
// 通过tRPC后端获取真实行情数据，30秒自动刷新
// ===================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
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
  // Fetch indices from backend
  const indicesQuery = trpc.market.indices.useQuery(undefined, {
    refetchInterval: refreshInterval,
    retry: 2,
  });

  // Fetch recommendations from backend
  const recsQuery = trpc.market.recommendations.useQuery(undefined, {
    refetchInterval: refreshInterval * 2, // Refresh less frequently
    retry: 2,
  });

  const utils = trpc.useUtils();

  // Compute derived state from API responses
  const state = useMemo<MarketState>(() => {
    const apiIndices = indicesQuery.data?.data;
    const isLive = indicesQuery.data?.isLive ?? false;

    // Use API data if available, otherwise fall back to mock
    let indices: IndexData[];
    if (apiIndices && apiIndices.length > 0) {
      indices = apiIndices.map((idx: any) => ({
        symbol: idx.symbol,
        name: idx.name,
        price: idx.price,
        change: idx.change,
        changePercent: idx.changePercent,
        high: idx.high,
        low: idx.low,
        volume: idx.volume,
        chartData: idx.chartData || [],
        prevClose: idx.price - idx.change,
      }));
    } else {
      indices = generateMockIndices();
    }

    // Use API recommendations if available
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
