import mongoose, { Document, Schema } from 'mongoose';

export interface IOpportunity extends Document {
  title: string;
  description: string;
  category: 'hackathon' | 'internship' | 'workshop' | 'quiz';
  platform: string;
  skills_required: string[];
  organizer_type: 'company' | 'startup' | 'college';
  mode: 'online' | 'offline' | 'hybrid';
  location: {
    city: string;
    state: string;
    country: string;
  };
  start_date: Date;
  deadline: Date;
  official_link: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

const OpportunitySchema = new Schema<IOpportunity>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['hackathon', 'internship', 'workshop', 'quiz'] 
  },
  platform: { type: String, required: true },
  skills_required: [{ type: String }],
  organizer_type: { 
    type: String, 
    required: true, 
    enum: ['company', 'startup', 'college'] 
  },
  mode: { 
    type: String, 
    required: true, 
    enum: ['online', 'offline', 'hybrid'] 
  },
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true }
  },
  start_date: { type: Date, required: true },
  deadline: { type: Date, required: true },
  official_link: { type: String, required: true },
  tags: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Create indexes for better search performance
OpportunitySchema.index({ category: 1 });
OpportunitySchema.index({ 'location.city': 1 });
OpportunitySchema.index({ 'location.state': 1 });
OpportunitySchema.index({ skills_required: 1 });
OpportunitySchema.index({ organizer_type: 1 });
OpportunitySchema.index({ mode: 1 });
OpportunitySchema.index({ deadline: 1 });

export default mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);