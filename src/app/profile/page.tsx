'use client';

import { Layout } from '@/components/layout/Layout';
import { UserProfileForm } from '@/components/profile/UserProfileForm';
import type { UserProfile } from '@/types';
import { useCallback, useState } from 'react';

// Mock user data for demonstration
const MOCK_USER_PROFILE: UserProfile = {
  id: '1',
  email: 'student@example.com',
  name: 'Rahul Sharma',
  phone: '+91 9876543210',
  location: {
    city: 'Indore',
    state: 'Madhya Pradesh',
    tier: 2,
  },
  academic: {
    institution: 'Indian Institute of Technology Indore',
    degree: 'B.Tech Computer Science',
    year: 3,
    cgpa: 8.5,
  },
  skills: {
    technical: ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning'],
    domains: ['Web Development', 'Data Science', 'AI'],
    proficiencyLevel: 'intermediate',
  },
  preferences: {
    opportunityTypes: ['hackathon', 'internship'],
    preferredMode: 'hybrid',
    maxDistance: 500,
    notifications: {
      email: true,
      sms: false,
      inApp: true,
      frequency: 'daily',
      types: ['new_opportunities', 'deadlines'],
    },
  },
  searchHistory: [],
  favoriteOpportunities: [],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
};

interface ResumeUploadProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadedFile?: {
    filename: string;
    originalName: string;
    extractedSkills: string[];
    extractedPersonalDetails?: {
      name: string;
      email: string;
      phone: string;
      location: { city: string; state: string };
    };
    extractedEducation?: {
      institution: string;
      degree: string;
      year: number | null;
      cgpa: number | null;
    };
  };
}

function ResumeUpload({ onUpload, isUploading, uploadedFile }: ResumeUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        onUpload(file);
      } else {
        alert('Please upload only PDF, DOC, or DOCX files.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-secondary-900 mb-4">
        📄 Resume Upload
      </h2>
      
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-secondary-300 hover:border-secondary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-secondary-600">Processing your resume...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-secondary-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-lg font-medium text-secondary-900 mb-2">
                Drop your resume here
              </p>
              <p className="text-secondary-600 mb-4">
                or click to browse files
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
              >
                Choose File
              </label>
              <p className="text-xs text-secondary-500 mt-2">
                Supports PDF, DOC, DOCX (max 5MB)
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">
                Resume uploaded successfully!
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Upload new
            </button>
          </div>
          <p className="text-green-700 text-sm mb-3">
            📁 {uploadedFile.originalName}
          </p>
          {uploadedFile.extractedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-green-700 text-sm font-medium mb-2">
                Extracted Skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {uploadedFile.extractedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {uploadedFile.extractedPersonalDetails && (
            <div className="mb-4">
              <p className="text-green-700 text-sm font-medium mb-2">
                Extracted Personal Details:
              </p>
              <div className="text-sm text-green-700 space-y-1">
                {uploadedFile.extractedPersonalDetails.name && (
                  <p><strong>Name:</strong> {uploadedFile.extractedPersonalDetails.name}</p>
                )}
                {uploadedFile.extractedPersonalDetails.email && (
                  <p><strong>Email:</strong> {uploadedFile.extractedPersonalDetails.email}</p>
                )}
                {uploadedFile.extractedPersonalDetails.phone && (
                  <p><strong>Phone:</strong> {uploadedFile.extractedPersonalDetails.phone}</p>
                )}
                {(uploadedFile.extractedPersonalDetails.location.city || uploadedFile.extractedPersonalDetails.location.state) && (
                  <p><strong>Location:</strong> {[uploadedFile.extractedPersonalDetails.location.city, uploadedFile.extractedPersonalDetails.location.state].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {uploadedFile.extractedEducation && (
            <div>
              <p className="text-green-700 text-sm font-medium mb-2">
                Extracted Education:
              </p>
              <div className="text-sm text-green-700 space-y-1">
                {uploadedFile.extractedEducation.institution && (
                  <p><strong>Institution:</strong> {uploadedFile.extractedEducation.institution}</p>
                )}
                {uploadedFile.extractedEducation.degree && (
                  <p><strong>Degree:</strong> {uploadedFile.extractedEducation.degree}</p>
                )}
                {uploadedFile.extractedEducation.year && (
                  <p><strong>Year:</strong> {uploadedFile.extractedEducation.year}</p>
                )}
                {uploadedFile.extractedEducation.cgpa && (
                  <p><strong>CGPA:</strong> {uploadedFile.extractedEducation.cgpa}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(MOCK_USER_PROFILE);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string;
    originalName: string;
    extractedSkills: string[];
    extractedPersonalDetails?: {
      name: string;
      email: string;
      phone: string;
      location: { city: string; state: string };
    };
    extractedEducation?: {
      institution: string;
      degree: string;
      year: number | null;
      cgpa: number | null;
    };
  } | undefined>();

  const handleSave = useCallback(
    async (updatedProfile: Partial<UserProfile>) => {
      setLoading(true);
      setSaveMessage('');

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update profile
        setProfile(prev => ({
          ...prev,
          ...updatedProfile,
          updatedAt: new Date(),
        }));

        setSaveMessage('Profile updated successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('Failed to update profile. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleResumeUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const extractedData = data.extracted_data;
        
        setUploadedFile({
          filename: data.file.filename,
          originalName: data.file.originalName,
          extractedSkills: extractedData.skills,
          extractedPersonalDetails: extractedData.personalDetails,
          extractedEducation: extractedData.education,
        });
        
        // Auto-update profile with extracted data
        const updatedProfile: Partial<UserProfile> = {};
        
        // Update skills
        if (extractedData.skills && extractedData.skills.length > 0) {
          const updatedSkills = [...new Set([...profile.skills.technical, ...extractedData.skills])];
          updatedProfile.skills = {
            ...profile.skills,
            technical: updatedSkills,
          };
        }
        
        // Update personal details
        if (extractedData.personalDetails) {
          const personalDetails = extractedData.personalDetails;
          
          if (personalDetails.name && personalDetails.name.trim()) {
            updatedProfile.name = personalDetails.name.trim();
          }
          
          if (personalDetails.phone && personalDetails.phone.trim()) {
            updatedProfile.phone = personalDetails.phone.trim();
          }
          
          if (personalDetails.location && (personalDetails.location.city || personalDetails.location.state)) {
            updatedProfile.location = {
              ...profile.location,
              ...(personalDetails.location.city && { city: personalDetails.location.city }),
              ...(personalDetails.location.state && { state: personalDetails.location.state }),
            };
          }
        }
        
        // Update education details
        if (extractedData.education) {
          const education = extractedData.education;
          const updatedAcademic: any = { ...profile.academic };
          
          if (education.institution && education.institution.trim()) {
            updatedAcademic.institution = education.institution.trim();
          }
          
          if (education.degree && education.degree.trim()) {
            updatedAcademic.degree = education.degree.trim();
          }
          
          if (education.year && education.year > 1900 && education.year <= new Date().getFullYear() + 10) {
            // Calculate current year based on graduation year (assuming 4-year degree)
            const currentYear = Math.min(4, new Date().getFullYear() - education.year + 4);
            if (currentYear > 0 && currentYear <= 6) {
              updatedAcademic.year = currentYear;
            }
          }
          
          if (education.cgpa && education.cgpa > 0 && education.cgpa <= 10) {
            updatedAcademic.cgpa = education.cgpa;
          }
          
          updatedProfile.academic = updatedAcademic;
        }
        
        // Apply updates to profile
        if (Object.keys(updatedProfile).length > 0) {
          setProfile(prev => ({
            ...prev,
            ...updatedProfile,
            updatedAt: new Date(),
          }));
        }
        
        setSaveMessage('Resume uploaded and profile details extracted successfully!');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        throw new Error(data.error || 'Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setSaveMessage('Failed to upload resume. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className='min-h-screen bg-secondary-50'>
        {/* Header */}
        <div className='bg-white border-b border-secondary-200'>
          <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6'>
            <div className='max-w-4xl mx-auto'>
              <h1 className='text-3xl font-bold text-secondary-900 mb-2'>
                My Profile
              </h1>
              <p className='text-secondary-600'>
                Manage your personal information, upload your resume, and set preferences for better opportunity recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='max-w-4xl mx-auto space-y-8'>
            {/* Save Message */}
            {saveMessage && (
              <div
                className={`p-4 rounded-lg ${
                  saveMessage.includes('successfully')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {saveMessage}
              </div>
            )}

            {/* Resume Upload Section */}
            <ResumeUpload
              onUpload={handleResumeUpload}
              isUploading={isUploading}
              uploadedFile={uploadedFile}
            />

            {/* Profile Form */}
            <div className='bg-white rounded-lg shadow-sm'>
              <UserProfileForm
                profile={profile}
                onSave={handleSave}
                loading={loading}
                className='p-6'
              />
            </div>

            {/* Additional Actions */}
            <div className='bg-white rounded-lg shadow-sm p-6'>
              <h2 className='text-xl font-semibold text-secondary-900 mb-4'>
                Account Actions
              </h2>
              <div className='space-y-4'>
                <div className='flex items-center justify-between py-3 border-b border-secondary-200'>
                  <div>
                    <h3 className='font-medium text-secondary-900'>
                      Export Profile Data
                    </h3>
                    <p className='text-sm text-secondary-600'>
                      Download your profile data in JSON format
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(profile, null, 2);
                      const dataBlob = new Blob([dataStr], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'profile-data.json';
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className='px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded-md transition-colors'
                  >
                    Export Data
                  </button>
                </div>

                <div className='flex items-center justify-between py-3 border-b border-secondary-200'>
                  <div>
                    <h3 className='font-medium text-secondary-900'>
                      Delete Account
                    </h3>
                    <p className='text-sm text-secondary-600'>
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to delete your account? This action cannot be undone.'
                        )
                      ) {
                        alert('Account deletion would be processed here');
                      }
                    }}
                    className='px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md transition-colors'
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
