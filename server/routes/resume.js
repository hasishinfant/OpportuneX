const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Extract text from PDF
const extractPDFText = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Extract text from DOCX
const extractDOCXText = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
};

// Extract personal details from resume text
const extractPersonalDetails = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const personalDetails = {
    name: '',
    email: '',
    phone: '',
    location: { city: '', state: '' }
  };

  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch && emailMatch.length > 0) {
    personalDetails.email = emailMatch[0];
  }

  // Extract phone number (Indian format)
  const phoneRegex = /(?:\+91|91)?[-.\s]?[6-9]\d{9}/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch && phoneMatch.length > 0) {
    personalDetails.phone = phoneMatch[0].replace(/[-.\s]/g, '');
    if (!personalDetails.phone.startsWith('+91')) {
      personalDetails.phone = '+91' + personalDetails.phone.replace(/^91/, '');
    }
  }

  // Extract name (usually the first line or line before contact info)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip lines that look like headers, emails, phones, or addresses
    if (line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum vitae') ||
        line.toLowerCase().includes('cv') ||
        emailRegex.test(line) ||
        phoneRegex.test(line) ||
        line.length < 3 ||
        line.length > 50) {
      continue;
    }
    
    // Check if line looks like a name (2-4 words, proper case)
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isName = words.every(word => 
        word.length > 1 && 
        /^[A-Za-z]+$/.test(word) &&
        word[0] === word[0].toUpperCase()
      );
      if (isName) {
        personalDetails.name = line;
        break;
      }
    }
  }

  // Extract location (city, state)
  const indianStates = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 
    'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 
    'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 
    'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 
    'uttar pradesh', 'uttarakhand', 'west bengal'
  ];

  const indianCities = [
    'delhi', 'mumbai', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune', 
    'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 
    'bhopal', 'visakhapatnam', 'pimpri', 'surat', 'vadodara', 'coimbatore', 
    'kochi', 'mysore', 'gurgaon', 'noida', 'faridabad', 'ghaziabad', 'agra',
    'meerut', 'rajkot', 'kalyan', 'vasai', 'aurangabad', 'dhanbad', 'amritsar',
    'allahabad', 'ranchi', 'howrah', 'jabalpur', 'gwalior'
  ];

  const lowerText = text.toLowerCase();
  
  // First try to find cities
  for (const city of indianCities) {
    if (lowerText.includes(city)) {
      personalDetails.location.city = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
    }
  }
  
  // Then try to find states
  for (const state of indianStates) {
    if (lowerText.includes(state)) {
      personalDetails.location.state = state.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
    }
  }

  return personalDetails;
};

// Extract skills from resume text (simple keyword matching)
const extractSkills = (text) => {
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
    'kotlin', 'typescript', 'scala', 'r', 'matlab', 'sql',
    
    // Web Technologies
    'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
    'spring', 'laravel', 'bootstrap', 'tailwind', 'sass', 'less',
    
    // Databases
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 'gitlab',
    'terraform', 'ansible',
    
    // Data Science & AI
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
    'scikit-learn', 'opencv', 'nlp', 'data analysis', 'statistics',
    
    // Mobile Development
    'android', 'ios', 'react native', 'flutter', 'xamarin',
    
    // Other Technologies
    'blockchain', 'ethereum', 'solidity', 'graphql', 'rest api', 'microservices',
    'agile', 'scrum', 'jira', 'figma', 'photoshop'
  ];

  const lowerText = text.toLowerCase();
  const foundSkills = commonSkills.filter(skill => 
    lowerText.includes(skill.toLowerCase())
  );

  return [...new Set(foundSkills)]; // Remove duplicates
};

// Extract education information
const extractEducation = (text) => {
  const educationData = {
    institution: '',
    degree: '',
    year: null,
    cgpa: null
  };

  const educationKeywords = [
    'bachelor', 'master', 'phd', 'diploma', 'degree', 'university', 'college',
    'b.tech', 'b.e.', 'm.tech', 'm.e.', 'mba', 'bca', 'mca', 'bsc', 'msc',
    'iit', 'nit', 'iiit', 'institute of technology'
  ];

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const lowerText = text.toLowerCase();
  
  // Find education section
  let educationSection = '';
  let inEducationSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering education section
    if (lowerLine.includes('education') || lowerLine.includes('academic') || lowerLine.includes('qualification')) {
      inEducationSection = true;
      continue;
    }
    
    // Check if we're leaving education section
    if (inEducationSection && (lowerLine.includes('experience') || lowerLine.includes('work') || lowerLine.includes('project') || lowerLine.includes('skill'))) {
      break;
    }
    
    if (inEducationSection) {
      educationSection += line + '\n';
    }
  }

  // If no dedicated education section found, search entire text
  if (!educationSection) {
    educationSection = text;
  }

  // Extract institution
  const institutionPatterns = [
    /(?:university|college|institute|iit|nit|iiit)\s+[a-zA-Z\s,]+/gi,
    /[a-zA-Z\s]+(?:university|college|institute)/gi
  ];
  
  for (const pattern of institutionPatterns) {
    const matches = educationSection.match(pattern);
    if (matches && matches.length > 0) {
      educationData.institution = matches[0].trim();
      break;
    }
  }

  // Extract degree
  const degreePatterns = [
    /b\.?tech|bachelor\s+of\s+technology/gi,
    /b\.?e\.?|bachelor\s+of\s+engineering/gi,
    /m\.?tech|master\s+of\s+technology/gi,
    /m\.?e\.?|master\s+of\s+engineering/gi,
    /bca|bachelor\s+of\s+computer\s+applications/gi,
    /mca|master\s+of\s+computer\s+applications/gi,
    /bsc|bachelor\s+of\s+science/gi,
    /msc|master\s+of\s+science/gi,
    /mba|master\s+of\s+business\s+administration/gi,
    /phd|doctor\s+of\s+philosophy/gi
  ];

  for (const pattern of degreePatterns) {
    const matches = educationSection.match(pattern);
    if (matches && matches.length > 0) {
      educationData.degree = matches[0].trim();
      break;
    }
  }

  // Extract year
  const yearPattern = /(?:20\d{2}|19\d{2})/g;
  const yearMatches = educationSection.match(yearPattern);
  if (yearMatches && yearMatches.length > 0) {
    // Get the most recent year
    const years = yearMatches.map(y => parseInt(y)).sort((a, b) => b - a);
    educationData.year = years[0];
  }

  // Extract CGPA/GPA
  const cgpaPattern = /(?:cgpa|gpa|grade)[\s:]*(\d+\.?\d*)/gi;
  const cgpaMatch = educationSection.match(cgpaPattern);
  if (cgpaMatch && cgpaMatch.length > 0) {
    const cgpaValue = parseFloat(cgpaMatch[0].replace(/[^\d.]/g, ''));
    if (cgpaValue <= 10) {
      educationData.cgpa = cgpaValue;
    }
  }

  return educationData;
};

// POST /api/resume/upload - Upload and process resume
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let extractedText = '';

    // Extract text based on file type
    if (fileExt === '.pdf') {
      extractedText = await extractPDFText(filePath);
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      extractedText = await extractDOCXText(filePath);
    }

    // Extract personal details, skills and education
    const personalDetails = extractPersonalDetails(extractedText);
    const skills = extractSkills(extractedText);
    const education = extractEducation(extractedText);

    // Return processed data
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      },
      extracted_data: {
        personalDetails,
        skills,
        education,
        text_preview: extractedText.substring(0, 500) + '...'
      }
    });

  } catch (error) {
    console.error('Error processing resume:', error);
    
    // Clean up uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process resume',
      message: error.message 
    });
  }
});

// GET /api/resume/:filename - Download resume file
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/resumes', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

// DELETE /api/resume/:filename - Delete resume file
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/resumes', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

module.exports = router;