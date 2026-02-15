'use client';

import { MentorshipSession } from '@/types/mentor-matching';
import { useEffect, useState } from 'react';

interface SessionDashboardProps {
  userType: 'mentor' | 'student';
}

export default function SessionDashboard({ userType }: SessionDashboardProps) {
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const endpoint =
        userType === 'mentor'
          ? '/api/mentor/sessions/mentor/all'
          : '/api/mentor/sessions/student/all';

      const url = filter !== 'all' ? `${endpoint}?status=${filter}` : endpoint;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      scheduled: '#007bff',
      in_progress: '#ffc107',
      completed: '#28a745',
      cancelled: '#dc3545',
      no_show: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const upcomingSessions = sessions.filter(
    s => s.status === 'scheduled' && new Date(s.scheduledAt) > new Date()
  );

  const pastSessions = sessions.filter(
    s => s.status === 'completed' || new Date(s.scheduledAt) < new Date()
  );

  return (
    <div className='session-dashboard'>
      <div className='dashboard-header'>
        <h1>My Sessions</h1>
        <div className='filters'>
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'scheduled' ? 'active' : ''}
            onClick={() => setFilter('scheduled')}
          >
            Scheduled
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button
            className={filter === 'cancelled' ? 'active' : ''}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </div>

      {loading ? (
        <div className='loading'>Loading sessions...</div>
      ) : (
        <>
          {upcomingSessions.length > 0 && (
            <div className='session-section'>
              <h2>Upcoming Sessions</h2>
              <div className='session-list'>
                {upcomingSessions.map(session => (
                  <div key={session.id} className='session-card upcoming'>
                    <div className='session-header'>
                      <h3>{session.title}</h3>
                      <span
                        className='status-badge'
                        style={{
                          backgroundColor: getStatusColor(session.status),
                        }}
                      >
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className='session-details'>
                      <div className='detail-item'>
                        <span className='icon'>📅</span>
                        <span>{formatDate(session.scheduledAt)}</span>
                      </div>
                      <div className='detail-item'>
                        <span className='icon'>⏱️</span>
                        <span>{session.durationMinutes} minutes</span>
                      </div>
                      {session.meetingPlatform && (
                        <div className='detail-item'>
                          <span className='icon'>💻</span>
                          <span>{session.meetingPlatform}</span>
                        </div>
                      )}
                    </div>

                    {session.description && (
                      <p className='description'>{session.description}</p>
                    )}

                    {session.agenda && (
                      <div className='agenda'>
                        <strong>Agenda:</strong>
                        <p>{session.agenda}</p>
                      </div>
                    )}

                    <div className='session-actions'>
                      {session.meetingUrl && (
                        <a
                          href={session.meetingUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='join-button'
                        >
                          Join Meeting
                        </a>
                      )}
                      {userType === 'mentor' && (
                        <>
                          <button
                            onClick={() =>
                              updateSessionStatus(session.id, 'in_progress')
                            }
                            className='action-button'
                          >
                            Start Session
                          </button>
                          <button
                            onClick={() =>
                              updateSessionStatus(session.id, 'cancelled')
                            }
                            className='cancel-button'
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastSessions.length > 0 && (
            <div className='session-section'>
              <h2>Past Sessions</h2>
              <div className='session-list'>
                {pastSessions.map(session => (
                  <div key={session.id} className='session-card past'>
                    <div className='session-header'>
                      <h3>{session.title}</h3>
                      <span
                        className='status-badge'
                        style={{
                          backgroundColor: getStatusColor(session.status),
                        }}
                      >
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className='session-details'>
                      <div className='detail-item'>
                        <span className='icon'>📅</span>
                        <span>{formatDate(session.scheduledAt)}</span>
                      </div>
                      <div className='detail-item'>
                        <span className='icon'>⏱️</span>
                        <span>
                          {session.actualDurationMinutes ||
                            session.durationMinutes}{' '}
                          minutes
                        </span>
                      </div>
                    </div>

                    {session.notes && (
                      <div className='notes'>
                        <strong>Notes:</strong>
                        <p>{session.notes}</p>
                      </div>
                    )}

                    {session.actionItems && session.actionItems.length > 0 && (
                      <div className='action-items'>
                        <strong>Action Items:</strong>
                        <ul>
                          {session.actionItems.map(item => (
                            <li key={item.id}>
                              <input
                                type='checkbox'
                                checked={item.completed}
                                readOnly
                              />
                              {item.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.status === 'completed' &&
                      userType === 'student' && (
                        <div className='session-actions'>
                          <button className='review-button'>
                            Leave Review
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className='no-sessions'>
              <p>No sessions found</p>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .session-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h1 {
          margin: 0;
        }

        .filters {
          display: flex;
          gap: 0.5rem;
        }

        .filters button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        }

        .filters button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .session-section {
          margin-bottom: 3rem;
        }

        .session-section h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .session-list {
          display: grid;
          gap: 1.5rem;
        }

        .session-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .session-card.upcoming {
          border-left: 4px solid #007bff;
        }

        .session-card.past {
          opacity: 0.9;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .session-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 16px;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .session-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6c757d;
        }

        .icon {
          font-size: 1.25rem;
        }

        .description {
          color: #495057;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .agenda,
        .notes {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .agenda strong,
        .notes strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .agenda p,
        .notes p {
          margin: 0;
          color: #495057;
        }

        .action-items {
          margin-bottom: 1rem;
        }

        .action-items strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .action-items ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .action-items li {
          margin-bottom: 0.5rem;
        }

        .session-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .join-button,
        .action-button,
        .review-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .join-button {
          background: #28a745;
          color: white;
          text-decoration: none;
          display: inline-block;
        }

        .action-button {
          background: #007bff;
          color: white;
        }

        .review-button {
          background: #ffc107;
          color: #000;
        }

        .cancel-button {
          padding: 0.75rem 1.5rem;
          background: white;
          color: #dc3545;
          border: 1px solid #dc3545;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .loading,
        .no-sessions {
          text-align: center;
          padding: 4rem 2rem;
          color: #6c757d;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: start;
            gap: 1rem;
          }

          .filters {
            width: 100%;
            overflow-x: auto;
          }

          .session-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
