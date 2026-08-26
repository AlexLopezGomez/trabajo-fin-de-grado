'use client';

function formatNumber(value: number): string {
  const str = String(value);
  return str.replace('.', ',');
}

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '""';

  if (typeof value === 'number') {
    return `"${formatNumber(value)}"`;
  }

  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return `"${json.replace(/"/g, '""')}"`;
  }

  const str = String(value);
  const escaped = str
    .replace(/"/g, '""')
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

export function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = [...new Set(data.flatMap(row => Object.keys(row)))];
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';');
  const dataRows = data.map(row =>
    headers.map(header => escapeCSVValue(row[header])).join(';')
  );
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

export function generateFilename(baseName: string, extension = 'csv'): string {
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
  const date = new Date().toISOString().split('T')[0];
  return `${sanitized}_${date}.${extension}`;
}

export function downloadFile(content: string | Blob, filename: string, mimeType = 'text/csv;charset=utf-8'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function exportToCSV(data: Record<string, unknown>[], widgetName: string): void {
  if (data.length === 0) return;
  const csv = convertToCSV(data);
  const filename = generateFilename(widgetName);
  downloadFile(csv, filename);
}

export function exportMergedCSV(
  widgets: Array<{ name: string; data: Record<string, unknown>[] }>,
  dashboardName: string
): void {
  const mergedData = widgets.flatMap(widget =>
    widget.data.map(row => ({ widget_name: widget.name, ...row }))
  );
  if (mergedData.length === 0) return;
  const csv = convertToCSV(mergedData);
  const filename = generateFilename(`${dashboardName}-all-widgets`);
  downloadFile(csv, filename);
}

export async function exportZipCSV(
  widgets: Array<{ name: string; data: Record<string, unknown>[] }>,
  dashboardName: string
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  widgets.forEach(widget => {
    if (widget.data.length > 0) {
      const csv = convertToCSV(widget.data);
      zip.file(generateFilename(widget.name), csv);
    }
  });
  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content, generateFilename(dashboardName, 'zip'), 'application/zip');
}
