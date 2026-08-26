'use client';

import { useState, useCallback, useTransition, useRef, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Lightbulb,
  Database,
  Clock,
  Code2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BarChart3,
  Table2,
  LineChart,
  PieChart as PieChartIcon,
  Zap,
  Copy,
  Check,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { executeSecureQuery } from '@/app/actions/secure-query-assistant';
import { QueryResult } from '@/app/actions/query-assistant';
import { error as logError } from '@/lib/utils/logger';
import dynamic from 'next/dynamic';
import { SmartTable } from '@/components/smart-table';

const SmartChart = dynamic(
  () => import('@/components/smart-chart').then(mod => ({ default: mod.SmartChart })),
  { loading: () => <div className="h-[350px] animate-pulse bg-zinc-800/50 rounded-lg" />, ssr: false }
);
import { MetricCard } from '@/components/metric-card';
import { SaveWidgetDialog } from './save-widget-dialog';
import { VisualizationType } from '@/types';



interface AIQueryBuilderProps {
  className?: string;
  onQueryResult?: (result: QueryResult) => void;
  showSaveButton?: boolean;
}

export function AIQueryBuilder({
  className,
  onQueryResult,
  showSaveButton = true,
}: AIQueryBuilderProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [currentView, setCurrentView] = useState<VisualizationType>('table');
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle query submission (cost scoring disabled for simplicity)
  const handleSubmit = useCallback(
    (queryText?: string) => {
      const finalQuestion = queryText || question;
      if (!finalQuestion.trim() || isPending) return;

      setShowSuggestions(false);
      setLastQuestion(finalQuestion);

      startTransition(async () => {
        try {
          // Execute query directly without cost scoring interception
          const queryResult = await executeSecureQuery(finalQuestion);

          setResult(queryResult);

          if (queryResult.success && queryResult.suggestedVisualization) {
            setCurrentView(queryResult.suggestedVisualization as VisualizationType);
          }

          if (onQueryResult) {
            onQueryResult(queryResult);
          }
        } catch (error) {
          logError('Query error', error);
          setResult({
            success: false,
            data: [],
            pipeline: [],
            collection: '',
            explanation: '',
            suggestedVisualization: 'table',
            executionTime: 0,
            error: 'Failed to execute query',
          });
        }
      });
    },
    [question, isPending, onQueryResult]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuestion(suggestion);
      handleSubmit(suggestion);
    },
    [handleSubmit]
  );

  const copyPipeline = useCallback(() => {
    if (result?.pipeline) {
      navigator.clipboard.writeText(JSON.stringify(result.pipeline, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result?.pipeline]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visualizationOptions = [
    { type: 'table' as const, icon: Table2, label: 'Tabla' },
    { type: 'bar-chart' as const, icon: BarChart3, label: 'Barras' },
    { type: 'line-chart' as const, icon: LineChart, label: 'Líneas' },
    { type: 'pie-chart' as const, icon: PieChartIcon, label: 'Circular' },
  ];

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Query Input Section */}
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            'relative flex items-center transition-all duration-300',
            'bg-zinc-900/60 backdrop-blur-xl',
            'border rounded-2xl',
            'shadow-2xl shadow-black/20',
            isFocused
              ? 'border-primary/60 ring-4 ring-primary/15 shadow-primary/5'
              : 'border-zinc-800 hover:border-primary/30'
          )}
        >
          {/* AI Icon */}
          <div className="flex items-center justify-center w-16 h-16">
            {isPending ? (
              <div className="relative">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div className="absolute inset-0 w-5 h-5 bg-primary/20 rounded-full animate-ping" />
              </div>
            ) : (
              <Sparkles
                className={cn(
                  'w-5 h-5 transition-colors duration-200',
                  isFocused ? 'text-primary' : 'text-zinc-500'
                )}
              />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta algo sobre tus datos financieros..."
            disabled={isPending}
            className={cn(
              'flex-1 bg-transparent py-5 pr-4 text-lg',
              'text-white placeholder:text-zinc-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!question.trim() || isPending}
            className={cn(
              'flex items-center justify-center w-14 h-14 mr-2',
              'rounded-xl transition-all duration-200',
              question.trim() && !isPending
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Glow Effect — visible on hover and focus */}
        <div
          className={cn(
            'absolute inset-0 -z-10 rounded-2xl blur-xl transition-opacity duration-300',
            'bg-primary/12',
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
          )}
        />


      </div>

      {/* Loading State */}
      {isPending && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-zinc-800 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Analizando tu pregunta...</p>
            <p className="text-sm text-zinc-500 mt-1">Generando query de MongoDB con IA</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && !isPending && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Error State */}
          {!result.success && (
            <div className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">Error al procesar la consulta</p>
                <p className="text-sm text-red-400/70 mt-1">{result.error}</p>
                {showSaveButton && result.requiresApproval && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className={cn(
                      'mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium',
                      'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
                      'border border-emerald-500/20 hover:border-emerald-500/30',
                      'rounded-lg transition-all duration-200'
                    )}
                  >
                    <Save className="w-4 h-4" />
                    Guardar como widget y solicitar aprobación
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {result.success && (
            <>
              {/* Explanation Card */}
              <div className="p-4 bg-gradient-to-r from-primary/10 via-orange-500/5 to-transparent border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-lg flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white leading-relaxed">{result.explanation}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
                        <Database className="w-3.5 h-3.5" />
                        {result.collection}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        {result.executionTime}ms
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
                        <Zap className="w-3.5 h-3.5" />
                        {result.data.length} resultados
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualization Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg">
                  {visualizationOptions.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setCurrentView(type)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200',
                        currentView === type
                          ? 'bg-primary text-primary-foreground'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Save to Dashboard Button */}
                  {showSaveButton && (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm font-medium',
                        'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
                        'border border-emerald-500/20 hover:border-emerald-500/30',
                        'rounded-lg transition-all duration-200'
                      )}
                    >
                      <Save className="w-4 h-4" />
                      <span className="hidden sm:inline">Guardar en Dashboard</span>
                      <span className="sm:hidden">Guardar</span>
                    </button>
                  )}

                  {/* New Query Button */}
                  <button
                    onClick={() => {
                      setResult(null);
                      setQuestion('');
                      setLastQuestion('');
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Nueva consulta
                  </button>
                </div>
              </div>

              {/* Data Visualization */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-6">
                  {currentView === 'table' && <SmartTable data={result.data} />}
                  {currentView === 'bar-chart' && (
                    <SmartChart data={result.data} type="bar-chart" />
                  )}
                  {currentView === 'line-chart' && (
                    <SmartChart data={result.data} type="line-chart" />
                  )}
                  {currentView === 'pie-chart' && (
                    <SmartChart data={result.data} type="pie-chart" />
                  )}
                  {currentView === 'metric-card' && <MetricCard data={result.data} />}
                </div>

                {/* Pipeline Preview */}
                <div className="border-t border-zinc-800">
                  <button
                    onClick={() => setShowPipeline(!showPipeline)}
                    className="flex items-center justify-between w-full px-6 py-3 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      <span>Ver MongoDB Aggregation Pipeline</span>
                    </div>
                    {showPipeline ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showPipeline && (
                    <div className="px-6 pb-4">
                      <div className="relative">
                        <button
                          onClick={copyPipeline}
                          className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <pre className="p-4 pr-14 bg-zinc-950 rounded-lg overflow-x-auto text-sm font-mono text-orange-300 scrollbar-thin">
                          <code>
                            {`db.${result.collection}.aggregate(\n${JSON.stringify(
                              result.pipeline,
                              null,
                              2
                            )}\n)`}
                          </code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Save Widget Dialog */}
      {(result?.success || result?.requiresApproval) && showSaveButton && (
        <SaveWidgetDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          queryResult={{
            collection: result.collection,
            pipeline: result.pipeline,
            visualization: currentView,
            originalQuestion: lastQuestion || question,
          }}
          onSaved={() => setShowSaveDialog(false)}
        />
      )}

    </div>
  );
}

