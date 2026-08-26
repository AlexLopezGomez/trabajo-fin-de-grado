'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Sparkles, Loader2, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { exampleQueries } from '@/lib/testing/mock-data';

interface QueryInputProps {
  onSubmit: (question: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function QueryInput({ onSubmit, isLoading = false, className }: QueryInputProps) {
  const [question, setQuestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (question.trim() && !isLoading) {
        onSubmit(question.trim());
        setShowSuggestions(false);
      }
    },
    [question, isLoading, onSubmit]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuestion(suggestion);
      onSubmit(suggestion);
      setShowSuggestions(false);
      inputRef.current?.blur();
    },
    [onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit]
  );

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

  return (
    <div ref={containerRef} className={cn('w-full max-w-3xl mx-auto', className)}>
      {/* Main Input Container */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'relative flex items-center transition-all duration-300 ease-out',
            'bg-zinc-900/50 backdrop-blur-xl',
            'border rounded-2xl',
            'shadow-2xl shadow-black/20',
            isFocused
              ? 'border-emerald-500/50 ring-4 ring-emerald-500/10'
              : 'border-zinc-800 hover:border-zinc-700'
          )}
        >
          {/* Search Icon / AI Sparkle */}
          <div className="flex items-center justify-center w-14 h-14">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            ) : (
              <Sparkles
                className={cn(
                  'w-5 h-5 transition-colors duration-200',
                  isFocused ? 'text-emerald-400' : 'text-zinc-500'
                )}
              />
            )}
          </div>

          {/* Input Field */}
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
            placeholder="¿Qué quieres saber de los datos hoy?"
            disabled={isLoading}
            className={cn(
              'flex-1 bg-transparent py-4 pr-4 text-lg',
              'text-white placeholder:text-zinc-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className={cn(
              'flex items-center justify-center w-12 h-12 mr-1',
              'rounded-xl transition-all duration-200',
              question.trim() && !isLoading
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Glow Effect */}
        <div
          className={cn(
            'absolute inset-0 -z-10 rounded-2xl blur-xl transition-opacity duration-300',
            'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
            isFocused ? 'opacity-100' : 'opacity-0'
          )}
        />
      </form>

      {/* Suggestions Panel */}
      {showSuggestions && !isLoading && (
        <div
          className={cn(
            'absolute z-50 w-full mt-3 p-2',
            'bg-zinc-900/95 backdrop-blur-xl',
            'border border-zinc-800 rounded-xl',
            'shadow-2xl shadow-black/40',
            'animate-in fade-in-0 slide-in-from-top-2 duration-200'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5" />
            Prueba preguntar
          </div>
          <div className="space-y-1">
            {exampleQueries.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left',
                  'text-sm text-zinc-300 hover:text-white',
                  'rounded-lg hover:bg-zinc-800/50 transition-colors duration-150',
                  'group'
                )}
              >
                <Search className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="mt-4 text-center text-sm text-zinc-600">
        Escribe tu pregunta en lenguaje natural. La IA la traducirá a una consulta de MongoDB.
      </p>
    </div>
  );
}

