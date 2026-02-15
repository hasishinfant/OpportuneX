'use client';

import { Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ChatPanelProps {
  roomCode: string;
  onClose: () => void;
}

interface Message {
  id: string;
  participantId: string;
  displayName: string;
  content: string;
  timestamp: number;
}

export function ChatPanel({ roomCode, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/video/rooms/${roomCode}/messages`);
      const { data } = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      const response = await fetch(`/api/video/rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: 'current-participant-id', // Should come from context
          content: inputValue,
        }),
      });

      const { data } = await response.json();
      setMessages(prev => [...prev, data]);
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className='w-80 bg-gray-800 flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-700'>
        <h3 className='text-white font-semibold'>Chat</h3>
        <button
          onClick={onClose}
          className='text-gray-400 hover:text-white transition-colors'
          aria-label='Close Chat'
        >
          <X className='w-5 h-5' />
        </button>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {messages.length === 0 ? (
          <div className='text-center text-gray-500 mt-8'>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className='space-y-1'>
              <div className='flex items-baseline gap-2'>
                <span className='text-sm font-semibold text-blue-400'>
                  {message.displayName || 'Anonymous'}
                </span>
                <span className='text-xs text-gray-500'>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className='text-sm text-white break-words'>
                {message.content}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className='p-4 border-t border-gray-700'>
        <div className='flex gap-2'>
          <input
            type='text'
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Type a message...'
            className='flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className='p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors'
            aria-label='Send Message'
          >
            <Send className='w-5 h-5 text-white' />
          </button>
        </div>
      </div>
    </div>
  );
}
