'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DirectMessageData } from '@/lib/services/social.service';
import { useEffect, useRef, useState } from 'react';

interface DirectMessagingProps {
  otherUserId: string;
  otherUserName: string;
}

export function DirectMessaging({
  otherUserId,
  otherUserName,
}: DirectMessagingProps) {
  const [messages, setMessages] = useState<DirectMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/v1/social/messages/${otherUserId}?page=1&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setMessages(result.data.data.reverse());
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/v1/social/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, result.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className='flex h-[600px] flex-col'>
      <div className='border-b border-gray-200 bg-white p-4'>
        <h2 className='text-lg font-semibold text-gray-900'>{otherUserName}</h2>
      </div>

      <div className='flex-1 overflow-y-auto bg-gray-50 p-4'>
        {messages.length === 0 ? (
          <div className='flex h-full items-center justify-center'>
            <p className='text-gray-500'>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {messages.map(message => {
              const isCurrentUser = message.sender.id !== otherUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isCurrentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <p className='text-sm'>{message.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className='border-t border-gray-200 bg-white p-4'>
        <form onSubmit={handleSendMessage} className='flex gap-2'>
          <input
            type='text'
            placeholder='Type a message...'
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
            disabled={sending}
          />
          <button
            type='submit'
            disabled={sending || !newMessage.trim()}
            className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
