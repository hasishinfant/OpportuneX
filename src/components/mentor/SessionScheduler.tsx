'use client';

import { MentorProfile, MentorshipSession } from '@/types/mentor-matching';
import React, { useEffect, useState } from 'react';

interface SessionSchedulerProps {
  mentorId: string;
  onScheduled?: (session: MentorshipSession) => void;
}

export default function SessionScheduler({
  mentorId,
  onScheduled,
}: SessionSchedulerProps) {
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agenda: '',
    scheduledAt: '',
    durationMinutes: 60,
    meetingPlatform: 'google-meet',
  });

  useEffect(() => {
    fetchMentor();
  }, [mentorId]);

  const fetchMentor = async () => {
    try {
      const response = await fetch(`/api/mentor/profile/${mentorId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMentor(data);
      }
    } catch (error) {
      console.error('Error fetching mentor:', error);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/mentor/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          mentorId,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
        }),
      });

      if (response.ok) {
        const session = await response.json();
        alert('Session scheduled successfully!');
        if (onScheduled) {
          onScheduled(session);
        }
        // Reset form
        setFormData({
          title: '',
          description: '',
          agenda: '',
          scheduledAt: '',
          durationMinutes: 60,
          meetingPlatform: 'google-meet',
        });
      } else {
        alert('Failed to schedule session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='session-scheduler'>
      <h2>Schedule Mentorship Session</h2>

      {mentor && (
        <div className='mentor-info'>
          <h3>{mentor.currentRole || 'Mentor'}</h3>
          {mentor.currentCompany && <p>{mentor.currentCompany}</p>}
          <div className='rating'>
            <span className='stars'>
              {'★'.repeat(Math.round(mentor.averageRating))}
              {'☆'.repeat(5 - Math.round(mentor.averageRating))}
            </span>
            <span>{mentor.averageRating.toFixed(1)}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSchedule}>
        <div className='form-group'>
          <label>Session Title *</label>
          <input
            type='text'
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder='e.g., Career Guidance Session'
            required
          />
        </div>

        <div className='form-group'>
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={e =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder='What would you like to discuss?'
            rows={3}
          />
        </div>

        <div className='form-group'>
          <label>Agenda</label>
          <textarea
            value={formData.agenda}
            onChange={e => setFormData({ ...formData, agenda: e.target.value })}
            placeholder='Session agenda and topics to cover'
            rows={3}
          />
        </div>

        <div className='form-row'>
          <div className='form-group'>
            <label>Date & Time *</label>
            <input
              type='datetime-local'
              value={formData.scheduledAt}
              onChange={e =>
                setFormData({ ...formData, scheduledAt: e.target.value })
              }
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>

          <div className='form-group'>
            <label>Duration (minutes) *</label>
            <select
              value={formData.durationMinutes}
              onChange={e =>
                setFormData({
                  ...formData,
                  durationMinutes: parseInt(e.target.value),
                })
              }
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        <div className='form-group'>
          <label>Meeting Platform *</label>
          <select
            value={formData.meetingPlatform}
            onChange={e =>
              setFormData({ ...formData, meetingPlatform: e.target.value })
            }
          >
            <option value='google-meet'>Google Meet</option>
            <option value='zoom'>Zoom</option>
            <option value='microsoft-teams'>Microsoft Teams</option>
            <option value='phone'>Phone Call</option>
            <option value='in-person'>In Person</option>
          </select>
        </div>

        <button type='submit' disabled={loading} className='schedule-button'>
          {loading ? 'Scheduling...' : 'Schedule Session'}
        </button>
      </form>

      <style jsx>{`
        .session-scheduler {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .session-scheduler h2 {
          margin: 0 0 1.5rem 0;
        }

        .mentor-info {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .mentor-info h3 {
          margin: 0 0 0.25rem 0;
        }

        .mentor-info p {
          margin: 0 0 0.5rem 0;
          color: #6c757d;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stars {
          color: #ffc107;
        }

        form {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .schedule-button {
          width: 100%;
          padding: 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          font-weight: 500;
        }

        .schedule-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
