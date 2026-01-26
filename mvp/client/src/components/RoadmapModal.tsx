import React, { useEffect, useState } from 'react';
import { Opportunity } from '../App';
import './RoadmapModal.css';

interface RoadmapPhase {
  title: string;
  duration: string;
  tasks: string[];
}

interface Roadmap {
  opportunityTitle: string;
  phases: RoadmapPhase[];
  estimatedDuration: string;
  personalizedTips: string[];
}

interface RoadmapModalProps {
  opportunity: Opportunity;
  onClose: () => void;
}

const RoadmapModal: React.FC<RoadmapModalProps> = ({ opportunity, onClose }) => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/roadmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            opportunityId: opportunity.id,
            userSkills: [] // In a real app, this would come from user profile
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate roadmap');
        }

        const data = await response.json();
        setRoadmap(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [opportunity.id]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="roadmap-modal-overlay" onClick={handleOverlayClick}>
      <div className="roadmap-modal">
        <div className="modal-header">
          <h2>
            <span className="roadmap-icon">🤖</span>
            AI-Generated Preparation Roadmap
          </h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating your personalized roadmap...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Oops! Something went wrong</h3>
              <p>{error}</p>
              <button className="retry-button" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </div>
          )}

          {roadmap && (
            <div className="roadmap-content">
              <div className="roadmap-header">
                <h3>{roadmap.opportunityTitle}</h3>
                <div className="duration-badge">
                  <span className="duration-icon">⏱️</span>
                  Estimated Duration: {roadmap.estimatedDuration}
                </div>
              </div>

              <div className="roadmap-phases">
                {roadmap.phases.map((phase, index) => (
                  <div key={index} className="phase-card">
                    <div className="phase-header">
                      <div className="phase-number">{index + 1}</div>
                      <div className="phase-info">
                        <h4>{phase.title}</h4>
                        <span className="phase-duration">{phase.duration}</span>
                      </div>
                    </div>
                    <ul className="phase-tasks">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="task-item">
                          <span className="task-icon">✓</span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="personalized-tips">
                <h4>
                  <span className="tips-icon">💡</span>
                  Personalized Tips
                </h4>
                <ul className="tips-list">
                  {roadmap.personalizedTips.map((tip, index) => (
                    <li key={index} className="tip-item">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="modal-actions">
                <button className="action-button primary">
                  <span className="button-icon">📋</span>
                  Save Roadmap
                </button>
                <button className="action-button secondary">
                  <span className="button-icon">📤</span>
                  Share
                </button>
                <a 
                  href={opportunity.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button success"
                >
                  <span className="button-icon">🚀</span>
                  Apply Now
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapModal;