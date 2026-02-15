'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);

  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Custom', days: 0 },
  ];

  const handlePresetChange = (days: number) => {
    if (days === 0) {
      setIsCustom(true);
      return;
    }

    setIsCustom(false);
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onChange(start, end);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    const newDate = new Date(value);
    if (type === 'start') {
      onChange(newDate, endDate);
    } else {
      onChange(startDate, newDate);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className='flex flex-col sm:flex-row gap-3'>
      {/* Preset Buttons */}
      <div className='flex gap-2'>
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => handlePresetChange(preset.days)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              preset.days === 0 && isCustom
                ? 'bg-blue-600 text-white'
                : preset.days !== 0 &&
                    !isCustom &&
                    Math.abs(endDate.getTime() - startDate.getTime()) ===
                      preset.days * 24 * 60 * 60 * 1000
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {isCustom && (
        <div className='flex gap-2 items-center'>
          <input
            type='date'
            value={formatDateForInput(startDate)}
            onChange={e => handleCustomDateChange('start', e.target.value)}
            className='px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
          <span className='text-gray-500 dark:text-gray-400'>to</span>
          <input
            type='date'
            value={formatDateForInput(endDate)}
            onChange={e => handleCustomDateChange('end', e.target.value)}
            className='px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
      )}
    </div>
  );
}
