'use client';

import { DataRecord } from '@/types';
import { cn } from '@/lib/utils/common';

interface MetricCardProps {
  data: DataRecord[];
  className?: string;
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: 2,
    }).format(value);
  }
  return String(value);
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function MetricCard({ data, className }: MetricCardProps) {
  if (!data.length) {
    return null;
  }

  const record = data[0];
  const entries = Object.entries(record);

  return (
    <div className={cn('grid gap-4', className)}>
      {entries.length === 1 ? (
        // Single large metric
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <span className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
            {formatLabel(entries[0][0])}
          </span>
          <span className="text-5xl font-bold text-white font-mono">
            {formatValue(entries[0][1])}
          </span>
        </div>
      ) : (
        // Multiple metrics grid
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {entries.map(([key, value], index) => (
            <div
              key={key}
              className={cn(
                'flex flex-col p-6 rounded-xl border transition-all duration-200',
                'bg-gradient-to-br hover:scale-[1.02]',
                index === 0
                  ? 'from-emerald-500/10 to-transparent border-emerald-500/20'
                  : 'from-zinc-900/50 to-transparent border-zinc-800 hover:border-zinc-700'
              )}
            >
              <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">
                {formatLabel(key)}
              </span>
              <span
                className={cn(
                  'text-2xl font-bold font-mono',
                  index === 0 ? 'text-emerald-400' : 'text-white'
                )}
              >
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
