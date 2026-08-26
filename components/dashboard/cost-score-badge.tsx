'use client';

/**
 * CostScoreBadge Component
 *
 * Displays query cost score with color-coded tier indicator.
 * Used across UI to show query performance impact.
 */

import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import type { CostTier } from '@/types/query-scoring';

interface CostScoreBadgeProps {
  costScore: number;
  tier: CostTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showScore?: boolean;
  className?: string;
}

const tierConfig = {
  green: {
    label: 'Low',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  yellow: {
    label: 'Med',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20',
    icon: Zap,
  },
  red: {
    label: 'High',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20',
    icon: AlertTriangle,
  },
};

const sizeConfig = {
  sm: {
    container: 'px-1.5 py-0.5',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'px-2.5 py-1',
    icon: 'w-3.5 h-3.5',
    text: 'text-sm',
  },
  lg: {
    container: 'px-3 py-1.5',
    icon: 'w-4 h-4',
    text: 'text-base',
  },
};

export function CostScoreBadge({
  costScore,
  tier,
  size = 'sm',
  showLabel = true,
  showScore = false,
  className,
}: CostScoreBadgeProps) {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border',
        sizeStyles.container,
        sizeStyles.text,
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
      title={`Query cost: ${costScore}/100 (${config.label} impact)`}
    >
      <Icon className={sizeStyles.icon} />
      {showLabel && <span className="font-medium">{config.label}</span>}
      {showScore && <span className="text-xs opacity-75">({costScore})</span>}
    </span>
  );
}
