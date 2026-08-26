'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { DataRecord, VisualizationType } from '@/types';
import { cn } from '@/lib/utils/common';

interface SmartChartProps {
  data: DataRecord[];
  type: VisualizationType;
  className?: string;
}

// Elegant color palette matching the dashboard theme
const COLORS = [
  '#1f5f3a', // dark green
  '#2f7a4e', // medium dark green
  '#3f9462', // medium green
  '#d9d9d9', // light neutral
  '#f2f2f2', // white
  '#0a0a0a', // black
];

const CHART_HEIGHT = 350;

/**
 * Infer the best keys for chart axes
 */
function inferChartKeys(data: DataRecord[]): { nameKey: string; valueKey: string } {
  if (!data.length) return { nameKey: '', valueKey: '' };

  const keys = Object.keys(data[0]);
  let nameKey = keys[0];
  let valueKey = keys[1] || keys[0];

  // Prefer string/date for name, number for value
  keys.forEach((key) => {
    const value = data[0][key];
    if (typeof value === 'string' && !key.includes('id')) {
      nameKey = key;
    }
    if (typeof value === 'number') {
      valueKey = key;
    }
  });

  return { nameKey, valueKey };
}

/**
 * Custom Tooltip Component
 */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-sm font-medium text-zinc-300 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-mono text-white">
            {new Intl.NumberFormat('es-ES').format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SmartChart({ data, type, className }: SmartChartProps) {
  const { nameKey, valueKey } = useMemo(() => inferChartKeys(data), [data]);

  // Get all numeric keys for multi-series charts
  const numericKeys = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter(
      (key) => typeof data[0][key] === 'number' && key !== nameKey
    );
  }, [data, nameKey]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        No hay datos para visualizar
      </div>
    );
  }

  const chartConfig = {
    xAxis: {
      dataKey: nameKey,
      tick: { fill: '#71717a', fontSize: 12 },
      axisLine: { stroke: '#27272a' },
      tickLine: { stroke: '#27272a' },
    },
    yAxis: {
      tick: { fill: '#71717a', fontSize: 12 },
      axisLine: { stroke: '#27272a' },
      tickLine: { stroke: '#27272a' },
      tickFormatter: (value: number) =>
        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString(),
    },
    grid: {
      strokeDasharray: '3 3',
      stroke: '#27272a',
    },
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        {type === 'bar-chart' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid {...chartConfig.grid} />
            <XAxis {...chartConfig.xAxis} />
            <YAxis {...chartConfig.yAxis} />
            <Tooltip content={<CustomTooltip />} />
            {numericKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
                name={key.replace(/_/g, ' ')}
              />
            ))}
          </BarChart>
        ) : type === 'line-chart' ? (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid {...chartConfig.grid} />
            <XAxis {...chartConfig.xAxis} />
            <YAxis {...chartConfig.yAxis} />
            <Tooltip content={<CustomTooltip />} />
            {numericKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name={key.replace(/_/g, ' ')}
              />
            ))}
          </LineChart>
        ) : type === 'area-chart' ? (
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {numericKeys.map((key, index) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...chartConfig.grid} />
            <XAxis {...chartConfig.xAxis} />
            <YAxis {...chartConfig.yAxis} />
            <Tooltip content={<CustomTooltip />} />
            {numericKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                fill={`url(#gradient-${key})`}
                strokeWidth={2}
                name={key.replace(/_/g, ' ')}
              />
            ))}
          </AreaChart>
        ) : type === 'pie-chart' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              innerRadius={60}
              fill="#8884d8"
              dataKey={valueKey}
              nameKey={nameKey}
              label={({ name, percent }) => `${name}: ${(percent ? (percent * 100).toFixed(0) : '0')}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-zinc-300">{value}</span>}
            />
          </PieChart>
        ) : (
          // Default fallback to bar chart
          <BarChart data={data}>
            <CartesianGrid {...chartConfig.grid} />
            <XAxis {...chartConfig.xAxis} />
            <YAxis {...chartConfig.yAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={valueKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

