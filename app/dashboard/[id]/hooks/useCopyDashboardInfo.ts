'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook for copying dashboard information to clipboard
 *
 * Features:
 * - Formats dashboard data as Markdown
 * - Uses modern Clipboard API with fallback to execCommand
 * - Provides toast feedback for success/error states
 * - Handles edge cases: missing description, permission denied, unsupported browsers
 */
export function useCopyDashboardInfo() {
  const copyToClipboard = useCallback(async (
    dashboardName: string,
    description: string | undefined,
    widgetCount: number,
    lastUpdated: Date
  ): Promise<boolean> => {
    try {
      // Format dashboard info as Markdown
      const formattedText = formatDashboardInfo({
        name: dashboardName,
        description,
        widgetCount,
        lastUpdated,
      });

      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formattedText);
        toast.success('Información copiada al portapapeles');
        return true;
      }

      // Fallback to execCommand for older browsers or insecure contexts
      const success = fallbackCopyToClipboard(formattedText);

      if (success) {
        toast.success('Información copiada al portapapeles');
        return true;
      } else {
        throw new Error('Fallback copy failed');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);

      // Provide specific error messages
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Permiso denegado. Por favor, permite el acceso al portapapeles.');
      } else if (!navigator.clipboard) {
        toast.error('El portapapeles no está soportado en este navegador.');
      } else {
        toast.error('Error al copiar. Por favor, inténtalo de nuevo.');
      }

      return false;
    }
  }, []);

  return { copyToClipboard };
}

/**
 * Formats dashboard information as Markdown
 */
function formatDashboardInfo(info: {
  name: string;
  description?: string;
  widgetCount: number;
  lastUpdated: Date;
}): string {
  const lines = [`# ${info.name}`, ''];

  // Add description if present
  if (info.description && info.description.trim()) {
    lines.push(info.description, '');
  }

  // Add metadata
  lines.push(
    `**Widgets:** ${info.widgetCount}`,
    `**Última actualización:** ${formatDate(info.lastUpdated)}`
  );

  return lines.join('\n');
}

/**
 * Formats date in Spanish locale
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Fallback method for copying to clipboard using execCommand
 * Used for older browsers or insecure contexts (HTTP)
 */
function fallbackCopyToClipboard(text: string): boolean {
  // Create temporary textarea element
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Style to make it invisible
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    // Attempt to copy using execCommand
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    document.body.removeChild(textArea);
    return false;
  }
}
