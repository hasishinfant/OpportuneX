'use client';

// Avatar Customizer Component
// Allows users to customize their virtual event avatar

import { AvatarConfig } from '@/types/virtual-events';
import { useState } from 'react';

interface AvatarCustomizerProps {
  initialConfig?: AvatarConfig;
  onSave?: (config: AvatarConfig) => void;
  onCancel?: () => void;
}

export default function AvatarCustomizer({
  initialConfig,
  onSave,
  onCancel,
}: AvatarCustomizerProps) {
  const [config, setConfig] = useState<AvatarConfig>(
    initialConfig || {
      model: 'default',
      appearance: {
        skinTone: '#f5d5b8',
        hairStyle: 'short',
        hairColor: '#2c1810',
        outfit: 'casual',
        accessories: [],
      },
      animations: {
        idle: 'idle_standing',
        walk: 'walk_forward',
        talk: 'talk_gesture',
        wave: 'wave_hand',
      },
    }
  );

  const [activeTab, setActiveTab] = useState<'appearance' | 'animations'>(
    'appearance'
  );

  // Customization options
  const skinTones = [
    { name: 'Light', value: '#f5d5b8' },
    { name: 'Medium Light', value: '#e8b896' },
    { name: 'Medium', value: '#d4a574' },
    { name: 'Medium Dark', value: '#c68642' },
    { name: 'Dark', value: '#8d5524' },
    { name: 'Very Dark', value: '#5c3317' },
  ];

  const hairStyles = [
    { name: 'Short', value: 'short' },
    { name: 'Medium', value: 'medium' },
    { name: 'Long', value: 'long' },
    { name: 'Curly', value: 'curly' },
    { name: 'Professional', value: 'professional' },
  ];

  const hairColors = [
    { name: 'Black', value: '#000000' },
    { name: 'Dark Brown', value: '#2c1810' },
    { name: 'Brown', value: '#4a2511' },
    { name: 'Light Brown', value: '#6a3410' },
    { name: 'Auburn', value: '#8b4513' },
    { name: 'Blonde', value: '#daa520' },
    { name: 'Light Blonde', value: '#ffd700' },
  ];

  const outfits = [
    { name: 'Casual', value: 'casual' },
    { name: 'Business', value: 'business' },
    { name: 'Formal', value: 'formal' },
    { name: 'Sporty', value: 'sporty' },
    { name: 'Creative', value: 'creative' },
  ];

  const accessories = [
    { name: 'Glasses', value: 'glasses' },
    { name: 'Sunglasses', value: 'sunglasses' },
    { name: 'Hat', value: 'hat' },
    { name: 'Cap', value: 'cap' },
    { name: 'Headphones', value: 'headphones' },
    { name: 'Watch', value: 'watch' },
    { name: 'Backpack', value: 'backpack' },
  ];

  const updateAppearance = (
    key: keyof AvatarConfig['appearance'],
    value: any
  ) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        [key]: value,
      },
    });
  };

  const toggleAccessory = (accessory: string) => {
    const current = config.appearance.accessories || [];
    const updated = current.includes(accessory)
      ? current.filter(a => a !== accessory)
      : [...current, accessory];

    updateAppearance('accessories', updated);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg'>
      <h2 className='text-3xl font-bold mb-6'>Customize Your Avatar</h2>

      {/* Tabs */}
      <div className='flex space-x-4 mb-6 border-b'>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'appearance'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Appearance
        </button>
        <button
          onClick={() => setActiveTab('animations')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'animations'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Animations
        </button>
      </div>

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className='space-y-6'>
          {/* Skin Tone */}
          <div>
            <label className='block text-sm font-semibold mb-2'>
              Skin Tone
            </label>
            <div className='flex flex-wrap gap-3'>
              {skinTones.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => updateAppearance('skinTone', tone.value)}
                  className={`w-12 h-12 rounded-full border-2 ${
                    config.appearance.skinTone === tone.value
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: tone.value }}
                  title={tone.name}
                />
              ))}
            </div>
          </div>

          {/* Hair Style */}
          <div>
            <label className='block text-sm font-semibold mb-2'>
              Hair Style
            </label>
            <div className='grid grid-cols-3 gap-3'>
              {hairStyles.map(style => (
                <button
                  key={style.value}
                  onClick={() => updateAppearance('hairStyle', style.value)}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    config.appearance.hairStyle === style.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          <div>
            <label className='block text-sm font-semibold mb-2'>
              Hair Color
            </label>
            <div className='flex flex-wrap gap-3'>
              {hairColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => updateAppearance('hairColor', color.value)}
                  className={`w-12 h-12 rounded-full border-2 ${
                    config.appearance.hairColor === color.value
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Outfit */}
          <div>
            <label className='block text-sm font-semibold mb-2'>Outfit</label>
            <div className='grid grid-cols-3 gap-3'>
              {outfits.map(outfit => (
                <button
                  key={outfit.value}
                  onClick={() => updateAppearance('outfit', outfit.value)}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    config.appearance.outfit === outfit.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  {outfit.name}
                </button>
              ))}
            </div>
          </div>

          {/* Accessories */}
          <div>
            <label className='block text-sm font-semibold mb-2'>
              Accessories (Select multiple)
            </label>
            <div className='grid grid-cols-3 gap-3'>
              {accessories.map(accessory => (
                <button
                  key={accessory.value}
                  onClick={() => toggleAccessory(accessory.value)}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    config.appearance.accessories?.includes(accessory.value)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  {accessory.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animations Tab */}
      {activeTab === 'animations' && (
        <div className='space-y-4'>
          <p className='text-gray-600 mb-4'>
            Animation settings are automatically configured based on your avatar
            model.
          </p>
          <div className='bg-gray-50 p-4 rounded-lg space-y-2'>
            <div className='flex justify-between'>
              <span className='font-semibold'>Idle:</span>
              <span className='text-gray-600'>{config.animations.idle}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-semibold'>Walk:</span>
              <span className='text-gray-600'>{config.animations.walk}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-semibold'>Talk:</span>
              <span className='text-gray-600'>{config.animations.talk}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-semibold'>Wave:</span>
              <span className='text-gray-600'>{config.animations.wave}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex space-x-4 mt-8'>
        <button
          onClick={handleSave}
          className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold'
        >
          Save Avatar
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className='px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold'
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
