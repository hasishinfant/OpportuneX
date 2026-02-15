'use client';

import {
  MentorAvailability,
  MentorProfile as MentorProfileType,
} from '@/types/mentor-matching';
import { useEffect, useState } from 'react';

export default function MentorProfile() {
  const [profile, setProfile] = useState<MentorProfileType | null>(null);
  const [availability, setAvailability] = useState<MentorAvailability[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    bio: '',
    expertiseAreas: [] as string[],
    domains: [] as string[],
    yearsOfExperience: 0,
    currentRole: '',
    currentCompany: '',
    languages: [] as string[],
    timezone: '',
    hourlyRate: 0,
    maxMentees: 5,
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });

  const [availabilitySlots, setAvailabilitySlots] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  >([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/mentor/profile', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          bio: data.bio || '',
          expertiseAreas: data.expertiseAreas || [],
          domains: data.domains || [],
          yearsOfExperience: data.yearsOfExperience || 0,
          currentRole: data.currentRole || '',
          currentCompany: data.currentCompany || '',
          languages: data.languages || [],
          timezone: data.timezone || '',
          hourlyRate: data.hourlyRate || 0,
          maxMentees: data.maxMentees || 5,
          linkedinUrl: data.linkedinUrl || '',
          githubUrl: data.githubUrl || '',
          portfolioUrl: data.portfolioUrl || '',
        });

        // Fetch availability
        const availResponse = await fetch(
          `/api/mentor/availability/${data.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        if (availResponse.ok) {
          const availData = await availResponse.json();
          setAvailability(availData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const method = profile ? 'PUT' : 'POST';
      const response = await fetch('/api/mentor/profile', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditing(false);

        // Save availability if there are slots
        if (availabilitySlots.length > 0) {
          await fetch('/api/mentor/availability', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ availability: availabilitySlots }),
          });
        }

        alert('Profile saved successfully!');
        fetchProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.expertiseAreas.includes(skill)) {
      setFormData({
        ...formData,
        expertiseAreas: [...formData.expertiseAreas, skill],
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      expertiseAreas: formData.expertiseAreas.filter(s => s !== skill),
    });
  };

  const addDomain = (domain: string) => {
    if (domain && !formData.domains.includes(domain)) {
      setFormData({
        ...formData,
        domains: [...formData.domains, domain],
      });
    }
  };

  const removeDomain = (domain: string) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter(d => d !== domain),
    });
  };

  const addAvailabilitySlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index));
  };

  const updateAvailabilitySlot = (index: number, field: string, value: any) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
  };

  if (loading) {
    return <div className='loading'>Loading profile...</div>;
  }

  if (!profile && !editing) {
    return (
      <div className='no-profile'>
        <h2>Become a Mentor</h2>
        <p>Share your knowledge and help students grow in their careers.</p>
        <button onClick={() => setEditing(true)} className='create-button'>
          Create Mentor Profile
        </button>
      </div>
    );
  }

  return (
    <div className='mentor-profile'>
      <div className='profile-header'>
        <h1>{editing ? 'Edit Mentor Profile' : 'Mentor Profile'}</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className='edit-button'>
            Edit Profile
          </button>
        )}
      </div>

      {editing ? (
        <div className='profile-form'>
          <div className='form-group'>
            <label>Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              placeholder='Tell students about yourself...'
              rows={4}
            />
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Current Role</label>
              <input
                type='text'
                value={formData.currentRole}
                onChange={e =>
                  setFormData({ ...formData, currentRole: e.target.value })
                }
                placeholder='e.g., Senior Software Engineer'
              />
            </div>

            <div className='form-group'>
              <label>Current Company</label>
              <input
                type='text'
                value={formData.currentCompany}
                onChange={e =>
                  setFormData({ ...formData, currentCompany: e.target.value })
                }
                placeholder='e.g., Google'
              />
            </div>
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Years of Experience</label>
              <input
                type='number'
                value={formData.yearsOfExperience}
                onChange={e =>
                  setFormData({
                    ...formData,
                    yearsOfExperience: parseInt(e.target.value),
                  })
                }
                min='0'
              />
            </div>

            <div className='form-group'>
              <label>Max Mentees</label>
              <input
                type='number'
                value={formData.maxMentees}
                onChange={e =>
                  setFormData({
                    ...formData,
                    maxMentees: parseInt(e.target.value),
                  })
                }
                min='1'
                max='20'
              />
            </div>

            <div className='form-group'>
              <label>Hourly Rate (₹)</label>
              <input
                type='number'
                value={formData.hourlyRate}
                onChange={e =>
                  setFormData({
                    ...formData,
                    hourlyRate: parseFloat(e.target.value),
                  })
                }
                min='0'
                placeholder='Optional'
              />
            </div>
          </div>

          <div className='form-group'>
            <label>Expertise Areas</label>
            <input
              type='text'
              placeholder='Add a skill and press Enter'
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  addSkill((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <div className='tags'>
              {formData.expertiseAreas.map(skill => (
                <span key={skill} className='tag'>
                  {skill}
                  <button onClick={() => removeSkill(skill)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className='form-group'>
            <label>Domains</label>
            <input
              type='text'
              placeholder='Add a domain and press Enter'
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  addDomain((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <div className='tags'>
              {formData.domains.map(domain => (
                <span key={domain} className='tag'>
                  {domain}
                  <button onClick={() => removeDomain(domain)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className='form-group'>
            <label>Languages</label>
            <select
              multiple
              value={formData.languages}
              onChange={e =>
                setFormData({
                  ...formData,
                  languages: Array.from(
                    e.target.selectedOptions,
                    opt => opt.value
                  ),
                })
              }
            >
              <option value='English'>English</option>
              <option value='Hindi'>Hindi</option>
              <option value='Tamil'>Tamil</option>
              <option value='Telugu'>Telugu</option>
              <option value='Bengali'>Bengali</option>
              <option value='Marathi'>Marathi</option>
            </select>
          </div>

          <div className='form-group'>
            <label>Timezone</label>
            <input
              type='text'
              value={formData.timezone}
              onChange={e =>
                setFormData({ ...formData, timezone: e.target.value })
              }
              placeholder='e.g., Asia/Kolkata'
            />
          </div>

          <div className='form-group'>
            <label>LinkedIn URL</label>
            <input
              type='url'
              value={formData.linkedinUrl}
              onChange={e =>
                setFormData({ ...formData, linkedinUrl: e.target.value })
              }
              placeholder='https://linkedin.com/in/yourprofile'
            />
          </div>

          <div className='form-group'>
            <label>GitHub URL</label>
            <input
              type='url'
              value={formData.githubUrl}
              onChange={e =>
                setFormData({ ...formData, githubUrl: e.target.value })
              }
              placeholder='https://github.com/yourusername'
            />
          </div>

          <div className='form-group'>
            <label>Portfolio URL</label>
            <input
              type='url'
              value={formData.portfolioUrl}
              onChange={e =>
                setFormData({ ...formData, portfolioUrl: e.target.value })
              }
              placeholder='https://yourportfolio.com'
            />
          </div>

          <div className='form-group'>
            <label>Availability</label>
            <button onClick={addAvailabilitySlot} className='add-slot-button'>
              Add Time Slot
            </button>
            {availabilitySlots.map((slot, index) => (
              <div key={index} className='availability-slot'>
                <select
                  value={slot.dayOfWeek}
                  onChange={e =>
                    updateAvailabilitySlot(
                      index,
                      'dayOfWeek',
                      parseInt(e.target.value)
                    )
                  }
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
                <input
                  type='time'
                  value={slot.startTime}
                  onChange={e =>
                    updateAvailabilitySlot(index, 'startTime', e.target.value)
                  }
                />
                <span>to</span>
                <input
                  type='time'
                  value={slot.endTime}
                  onChange={e =>
                    updateAvailabilitySlot(index, 'endTime', e.target.value)
                  }
                />
                <button onClick={() => removeAvailabilitySlot(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className='form-actions'>
            <button onClick={handleSave} className='save-button'>
              Save Profile
            </button>
            <button
              onClick={() => {
                setEditing(false);
                if (profile) {
                  fetchProfile();
                }
              }}
              className='cancel-button'
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className='profile-view'>
          <div className='profile-stats'>
            <div className='stat'>
              <span className='stat-value'>
                {profile?.averageRating.toFixed(1)}
              </span>
              <span className='stat-label'>Rating</span>
            </div>
            <div className='stat'>
              <span className='stat-value'>{profile?.totalSessions}</span>
              <span className='stat-label'>Sessions</span>
            </div>
            <div className='stat'>
              <span className='stat-value'>{profile?.currentMentees}</span>
              <span className='stat-label'>Active Mentees</span>
            </div>
            <div className='stat'>
              <span className='stat-value'>
                {profile?.successRate.toFixed(0)}%
              </span>
              <span className='stat-label'>Success Rate</span>
            </div>
          </div>

          <div className='profile-section'>
            <h3>About</h3>
            <p>{profile?.bio || 'No bio provided'}</p>
          </div>

          <div className='profile-section'>
            <h3>Professional Info</h3>
            <p>
              <strong>Role:</strong> {profile?.currentRole || 'Not specified'}
            </p>
            <p>
              <strong>Company:</strong>{' '}
              {profile?.currentCompany || 'Not specified'}
            </p>
            <p>
              <strong>Experience:</strong> {profile?.yearsOfExperience} years
            </p>
          </div>

          <div className='profile-section'>
            <h3>Expertise</h3>
            <div className='tags'>
              {profile?.expertiseAreas.map(skill => (
                <span key={skill} className='tag'>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className='profile-section'>
            <h3>Domains</h3>
            <div className='tags'>
              {profile?.domains.map(domain => (
                <span key={domain} className='tag'>
                  {domain}
                </span>
              ))}
            </div>
          </div>

          <div className='profile-section'>
            <h3>Languages</h3>
            <p>{profile?.languages.join(', ')}</p>
          </div>

          {availability.length > 0 && (
            <div className='profile-section'>
              <h3>Availability</h3>
              {availability.map(slot => (
                <div key={slot.id} className='availability-item'>
                  {
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                      slot.dayOfWeek
                    ]
                  }
                  : {slot.startTime} - {slot.endTime}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .mentor-profile {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .profile-header h1 {
          margin: 0;
        }

        .edit-button,
        .create-button {
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .no-profile {
          text-align: center;
          padding: 4rem 2rem;
        }

        .profile-form {
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: #e9ecef;
          border-radius: 16px;
          font-size: 0.875rem;
        }

        .tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
        }

        .availability-slot {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-top: 0.5rem;
        }

        .availability-slot select,
        .availability-slot input {
          padding: 0.5rem;
        }

        .add-slot-button {
          padding: 0.5rem 1rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .save-button,
        .cancel-button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }

        .save-button {
          background: #28a745;
          color: white;
        }

        .cancel-button {
          background: #6c757d;
          color: white;
        }

        .profile-view {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .profile-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: #007bff;
        }

        .stat-label {
          display: block;
          font-size: 0.875rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .profile-section {
          margin-bottom: 2rem;
        }

        .profile-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
        }

        .availability-item {
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .loading {
          text-align: center;
          padding: 4rem;
        }
      `}</style>
    </div>
  );
}
