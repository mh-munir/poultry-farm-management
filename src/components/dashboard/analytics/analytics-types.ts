import type { ComponentType } from 'react';

export type AnalyticsPresetValue = 'custom' | 'today' | 'yesterday' | '7' | '30' | 'month' | 'lastMonth' | 'year' | 'thisYear';

export type AnalyticsFilterState = {
  start: string;
  end: string;
  preset: AnalyticsPresetValue;
};

export type AnalyticsMetric = {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'accent';
  icon?: ComponentType<{ size?: number; className?: string }>;
  loading?: boolean;
};

export type AnalyticsInsight = {
  title: string;
  description: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'accent';
  icon?: ComponentType<{ size?: number; className?: string }>;
};

export type AnalyticsTableColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
};
