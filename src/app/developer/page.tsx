'use client';

import { Card } from '@/components/ui/Card';
import { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface OAuthClient {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: string;
}

export default function DeveloperPortal() {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'webhooks' | 'oauth'>(
    'api-keys'
  );
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [oauthClients, setOAuthClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'api-keys') {
        const response = await fetch('/api/v1/developer/api-keys', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setApiKeys(data.data || []);
      } else if (activeTab === 'webhooks') {
        const response = await fetch('/api/v1/developer/webhooks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setWebhooks(data.data || []);
      } else if (activeTab === 'oauth') {
        const response = await fetch('/api/v1/developer/oauth/clients', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setOAuthClients(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (formData: any) => {
    try {
      const response = await fetch('/api/v1/developer/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        alert(
          `API Key created successfully!\n\nKey: ${data.data.key}\n\nSave this key securely - it will not be shown again.`
        );
        loadData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this API key? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/v1/developer/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      loadData();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Developer Portal</h1>
          <p className='mt-2 text-gray-600'>
            Manage your API keys, webhooks, and OAuth applications
          </p>
        </div>

        {/* Tabs */}
        <div className='border-b border-gray-200 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`${
                activeTab === 'api-keys'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`${
                activeTab === 'webhooks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('oauth')}
              className={`${
                activeTab === 'oauth'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              OAuth Apps
            </button>
          </nav>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-semibold'>API Keys</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
              >
                Create API Key
              </button>
            </div>

            {loading ? (
              <div className='text-center py-12'>Loading...</div>
            ) : apiKeys.length === 0 ? (
              <Card className='text-center py-12'>
                <p className='text-gray-500'>
                  No API keys yet. Create your first one to get started.
                </p>
              </Card>
            ) : (
              <div className='space-y-4'>
                {apiKeys.map(key => (
                  <Card key={key.id} className='p-6'>
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3'>
                          <h3 className='text-lg font-semibold'>{key.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              key.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className='text-sm text-gray-600 mt-1'>
                          Key: {key.keyPrefix}...
                        </p>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {key.scopes.map(scope => (
                            <span
                              key={scope}
                              className='px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded'
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                        <div className='mt-3 text-sm text-gray-500'>
                          <p>Rate Limit: {key.rateLimit} requests/hour</p>
                          <p>
                            Last Used:{' '}
                            {key.lastUsedAt
                              ? new Date(key.lastUsedAt).toLocaleString()
                              : 'Never'}
                          </p>
                          <p>
                            Created: {new Date(key.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleRevokeApiKey(key.id)}
                          className='text-red-600 hover:text-red-800 text-sm'
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-semibold'>Webhooks</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
              >
                Create Webhook
              </button>
            </div>

            {loading ? (
              <div className='text-center py-12'>Loading...</div>
            ) : webhooks.length === 0 ? (
              <Card className='text-center py-12'>
                <p className='text-gray-500'>No webhooks configured yet.</p>
              </Card>
            ) : (
              <div className='space-y-4'>
                {webhooks.map(webhook => (
                  <Card key={webhook.id} className='p-6'>
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3'>
                          <h3 className='text-lg font-semibold'>
                            {webhook.url}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              webhook.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {webhook.events.map(event => (
                            <span
                              key={event}
                              className='px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded'
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                        <div className='mt-3 text-sm text-gray-500'>
                          <p>Retry Count: {webhook.retryCount}</p>
                          <p>
                            Last Triggered:{' '}
                            {webhook.lastTriggeredAt
                              ? new Date(
                                  webhook.lastTriggeredAt
                                ).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OAuth Apps Tab */}
        {activeTab === 'oauth' && (
          <div>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-semibold'>OAuth Applications</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
              >
                Create OAuth App
              </button>
            </div>

            {loading ? (
              <div className='text-center py-12'>Loading...</div>
            ) : oauthClients.length === 0 ? (
              <Card className='text-center py-12'>
                <p className='text-gray-500'>No OAuth applications yet.</p>
              </Card>
            ) : (
              <div className='space-y-4'>
                {oauthClients.map(client => (
                  <Card key={client.id} className='p-6'>
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3'>
                          <h3 className='text-lg font-semibold'>
                            {client.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              client.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {client.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {client.description && (
                          <p className='text-sm text-gray-600 mt-1'>
                            {client.description}
                          </p>
                        )}
                        <p className='text-sm text-gray-600 mt-2'>
                          Client ID: {client.clientId}
                        </p>
                        <div className='mt-3'>
                          <p className='text-sm font-medium text-gray-700'>
                            Redirect URIs:
                          </p>
                          <ul className='mt-1 text-sm text-gray-600'>
                            {client.redirectUris.map(uri => (
                              <li key={uri}>{uri}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documentation Link */}
        <Card className='mt-8 p-6 bg-blue-50 border-blue-200'>
          <h3 className='text-lg font-semibold text-blue-900 mb-2'>
            API Documentation
          </h3>
          <p className='text-blue-800 mb-4'>
            Learn how to integrate with OpportuneX API, use webhooks, and
            implement OAuth 2.0.
          </p>
          <a
            href='/docs/api'
            className='inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
          >
            View Documentation
          </a>
        </Card>
      </div>
    </div>
  );
}
