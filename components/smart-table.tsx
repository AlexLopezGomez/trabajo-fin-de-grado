'use client';

import { useMemo } from 'react';
import { DataRecord } from '@/types';
import { cn } from '@/lib/utils/common';
import { ArrowUpDown } from 'lucide-react';

interface SmartTableProps {
  data: DataRecord[];
  className?: string;
  maxRows?: number;
}

/**
 * Infers column metadata from data
 */
function inferColumns(data: DataRecord[]) {
  if (!data.length) return [];

  const firstRow = data[0];
  return Object.keys(firstRow).map((key) => {
    const value = firstRow[key];
    let type: 'string' | 'number' | 'date' | 'boolean' = 'string';

    if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
      type = 'date';
    }

    return {
      key,
      label: formatColumnLabel(key),
      type,
    };
  });
}

/**
 * Format column key to human-readable label
 */
function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format cell value based on type
 */
function formatCellValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';

  if (type === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('es-ES').format(value);
  }

  if (type === 'date' && typeof value === 'string') {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  if (type === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return String(value);
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (['completed', 'success', 'active', 'completado'].includes(normalized)) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (['pending', 'processing', 'pendiente'].includes(normalized)) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
  if (['failed', 'error', 'cancelled', 'fallido'].includes(normalized)) {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function SmartTable({ data, className, maxRows = 50 }: SmartTableProps) {
  const columns = useMemo(() => inferColumns(data), [data]);
  const displayData = useMemo(() => data.slice(0, maxRows), [data, maxRows]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                    'text-zinc-400 bg-zinc-900/50',
                    'first:rounded-tl-lg last:rounded-tr-lg'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-zinc-800/50">
            {displayData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'transition-colors duration-150',
                  'hover:bg-zinc-800/30',
                  rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                )}
              >
                {columns.map((column) => {
                  const value = row[column.key];
                  const isStatus = column.key.toLowerCase().includes('status') || column.key.toLowerCase().includes('estado');

                  return (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-sm',
                        column.type === 'number' ? 'text-right font-mono' : 'text-left'
                      )}
                    >
                      {isStatus && typeof value === 'string' ? (
                        <span
                          className={cn(
                            'inline-flex px-2.5 py-1 text-xs font-medium rounded-full border',
                            getStatusColor(value)
                          )}
                        >
                          {value}
                        </span>
                      ) : (
                        <span className="text-zinc-200">
                          {formatCellValue(value, column.type)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      {data.length > maxRows && (
        <div className="flex items-center justify-center py-3 text-sm text-zinc-500 border-t border-zinc-800">
          Mostrando {maxRows} de {data.length} registros
        </div>
      )}
    </div>
  );
}

