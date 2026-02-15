'use client';

import { useState } from 'react';

interface ExportButtonProps {
  dateRange: {
    start: Date;
    end: Date;
  };
}

export function ExportButton({ dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      setShowMenu(false);

      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
          metrics: ['all'],
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export analytics. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className='relative'>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
      >
        {isExporting ? (
          <>
            <span className='animate-spin'>⏳</span>
            Exporting...
          </>
        ) : (
          <>
            <span>📥</span>
            Export
          </>
        )}
      </button>

      {showMenu && !isExporting && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={() => setShowMenu(false)}
          />
          <div className='absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20'>
            <div className='py-1'>
              <button
                onClick={() => handleExport('csv')}
                className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Export as JSON
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
