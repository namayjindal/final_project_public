// app.mjs - Updated to serve HTML files
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import openaiService from './services/openai.mjs';
import { generateHackathonPrompt } from './services/openai.mjs';

// load models
import { Company, Applicant, Hackathon, Submission } from './db.mjs';

// load environment variables
dotenv.config();

// set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create express app
const app = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

// RESEARCH TOPIC: passport setup for authentication
app.use(passport.initialize());
app.use(passport.session());

// Configure passport to use local strategy
passport.use('company', new LocalStrategy(
  async (username, password, done) => {
    try {
      const company = await Company.findOne({ username });
      if (!company) {
        return done(null, false, { message: 'Incorrect username' });
      }
      
      const isMatch = await bcrypt.compare(password, company.hash);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password' });
      }
      
      return done(null, company);
    } catch (err) {
      return done(err);
    }
  }
));

passport.use('applicant', new LocalStrategy(
  async (username, password, done) => {
    try {
      const applicant = await Applicant.findOne({ username });
      if (!applicant) {
        return done(null, false, { message: 'Incorrect username' });
      }
      
      const isMatch = await bcrypt.compare(password, applicant.hash);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password' });
      }
      
      return done(null, applicant);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize user with type information
passport.serializeUser((user, done) => {
  // Store both the user ID and user type (company or applicant)
  const userType = user instanceof Company ? 'company' : 'applicant';
  done(null, { id: user._id, type: userType });
});

// Deserialize user based on stored type
passport.deserializeUser(async (data, done) => {
  try {
    let user;
    if (data.type === 'company') {
      user = await Company.findById(data.id);
    } else {
      user = await Applicant.findById(data.id);
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check if user is a company
function isCompany(req, res, next) {
  if (req.isAuthenticated() && req.user instanceof Company) {
    return next();
  }
  res.status(403).send('Access denied: Company account required');
}

// Middleware to check if user is an applicant
function isApplicant(req, res, next) {
  if (req.isAuthenticated() && req.user instanceof Applicant) {
    return next();
  }
  res.status(403).send('Access denied: Applicant account required');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', passport.authenticate('company', {
  successRedirect: '/hackathons/company',
  failureRedirect: '/login',
}));

app.get('/hackathons/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-hackathon.html'));
});

app.post('/hackathons/create', async (req, res) => {
  try {
    const { title, description, evaluationCriteria, roleDescription, startDate, endDate } = req.body;
    
    // Convert evaluation criteria string to array
    const criteriaArray = evaluationCriteria.split('\n').filter(item => item.trim() !== '');
    
    // Create new hackathon
    const newHackathon = new Hackathon({
      company: req.user ? req.user._id : "Demo Company", // Use authenticated user or demo
      title,
      description,
      evaluationCriteria: criteriaArray,
      roleDescription,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
      submissions: []
    });
    
    // Save to database
    await newHackathon.save();
    
    // Redirect to hackathons page - use 302 redirect to ensure proper page load
    res.redirect(302, '/hackathons/company');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating hackathon');
  }
});

// Apply authentication to routes
app.get('/hackathons/company', isAuthenticated, isCompany, async (req, res) => {
  // Now this route is protected and only accessible to authenticated companies
  res.sendFile(path.join(__dirname, 'public', 'company-hackathons.html'));
});

app.get('/hackathons/create', isAuthenticated, isCompany, (req, res) => {
  // Protected route for companies only
  res.sendFile(path.join(__dirname, 'public', 'create-hackathon.html'));
});

// Add logout functionality
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Add a new API route to fetch the hackathons data
app.get('/api/hackathons/company', async (req, res) => {
  try {
    // Get all hackathons
    const hackathons = await Hackathon.find().sort({ createdAt: -1 });
    
    // Return the hackathons as JSON
    res.json({ hackathons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/hackathons/browse', (req, res) => {
  // Send the HTML file
  res.sendFile(path.join(__dirname, 'public', 'view-hackathons.html'));
});

app.get('/api/hackathons/browse', async (req, res) => {
  try {
    // Get all active hackathons
    const hackathons = await Hackathon.find().sort({ startDate: -1 });
    res.json({ hackathons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/hackathons/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }
    res.json({ hackathon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a hackathon
app.post('/hackathons/:id/update', async (req, res) => {
  try {
    const { title, description, evaluationCriteria, roleDescription, startDate, endDate } = req.body;
    
    // Convert evaluation criteria string to array
    const criteriaArray = evaluationCriteria.split('\n').filter(item => item.trim() !== '');
    
    // Find and update the hackathon
    const hackathon = await Hackathon.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        evaluationCriteria: criteriaArray,
        roleDescription,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      { new: true }
    );
    
    if (!hackathon) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    
    // Redirect to hackathons page
    res.redirect('/hackathons/company');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating hackathon');
  }
});

// Delete a hackathon
app.post('/hackathons/:id/delete', async (req, res) => {
  try {
    const hackathon = await Hackathon.findByIdAndDelete(req.params.id);
    
    if (!hackathon) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    
    res.redirect('/hackathons/company');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting hackathon');
  }
});

app.get('/hackathons/:id/edit', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    
    // Serve the static edit-hackathon.html file
    res.sendFile(path.join(__dirname, 'public', 'edit-hackathon.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/hackathons/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    // For now, just send a simple response showing it works
    res.send(`<h1>Hackathon: ${hackathon.title}</h1><p>This page is under construction.</p><a href="/hackathons/company">Back to Hackathons</a>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add these routes to app.mjs

// Route to show application form
app.get('/hackathons/:id/apply', async (req, res) => {
  try {
    // Check if hackathon exists and is active
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    
    // Serve the application form HTML
    res.sendFile(path.join(__dirname, 'public', 'apply-hackathon.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Route to handle application submission
app.post('/hackathons/:id/apply', async (req, res) => {
  try {
    const { githubLink, devpostLink, coverLetter, fullName, email } = req.body;
    
    // Validation
    if (!githubLink || !devpostLink || !coverLetter || !fullName || !email) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    if (coverLetter.length > 1000) {
      return res.status(400).json({ message: 'Cover letter must be 1000 characters or less.' });
    }
    
    // Find hackathon
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found.' });
    }
    
    // Check if hackathon is still active
    const now = new Date();
    const endDate = new Date(hackathon.endDate);
    if (now > endDate) {
      return res.status(400).json({ message: 'This hackathon has ended.' });
    }
    
    // Create temporary applicant (in a real app, this would be an existing user)
    const tempApplicant = {
      fullName,
      email
    };
    
    // Store application (simplified for the milestone)
    // In a real app, you'd create a Submission document linked to a real Applicant
    const submission = {
      hackathonId: hackathon._id,
      applicant: tempApplicant,
      githubLink,
      devpostLink,
      coverLetter,
      submissionDate: new Date(),
      status: 'submitted'
    };
    
    // For the milestone, we'll just console.log the submission
    console.log('New submission received:', submission);
    
    // Return success response
    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Add a route for registration
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register/applicant', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      skills, 
      githubProfile 
    } = req.body;
    
    // Check if username or email already exists
    const existingApplicant = await Applicant.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingApplicant) {
      return res.status(400).json({ 
        message: 'A user with that username or email already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Convert skills string to array
    const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    
    // Create new applicant
    const newApplicant = new Applicant({
      username,
      firstName,
      lastName,
      email,
      hash,
      skills: skillsArray,
      githubProfile,
      submissions: []
    });
    
    // Save to database
    await newApplicant.save();
    
    // Log in the new applicant
    req.login(newApplicant, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/hackathons/browse');
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a route to get AI-generated hackathon suggestions
app.post('/api/generate-hackathon', async (req, res) => {
  try {
    // Extract company info from current logged-in user
    const companyInfo = {
      companyName: req.user?.companyName || 'Company',
      industry: req.user?.industry || req.body.industry,
      companyDescription: req.user?.companyDescription || req.body.companyDescription
    };
    
    const roleDescription = req.body.roleDescription;
    
    // Call the OpenAI service to generate a hackathon prompt
    const generatedContent = await generateHackathonPrompt(
      companyInfo, 
      roleDescription
    );
    
    res.json({ success: true, generatedContent });
  } catch (error) {
    console.error('Error generating hackathon content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating hackathon content' 
    });
  }
});

// Add a data processing pipeline as a higher-order function example
function createFormProcessingPipeline(...processors) {
  // This is a higher-order function that creates a pipeline of form processors
  return function(formData) {
    // Start with the original form data
    let processedData = { ...formData };
    
    // Apply each processor function in sequence
    for (const processor of processors) {
      processedData = processor(processedData);
    }
    
    return processedData;
  };
}

// Form processor functions
const validateRequired = (data) => {
  const requiredFields = ['title', 'description', 'evaluationCriteria', 'roleDescription', 'startDate', 'endDate'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field} is required`);
    }
  }
  return data;
};

const sanitizeInputs = (data) => {
  // Simple sanitization example
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      data[key] = data[key].trim();
    }
  });
  return data;
};

const formatDates = (data) => {
  data.startDate = new Date(data.startDate);
  data.endDate = new Date(data.endDate);
  return data;
};

const processEvaluationCriteria = (data) => {
  // Split criteria text into array
  if (typeof data.evaluationCriteria === 'string') {
    data.evaluationCriteria = data.evaluationCriteria
      .split('\n')
      .map(item => item.trim())
      .filter(item => item !== '');
  }
  return data;
};

// Create the processing pipeline
const processHackathonForm = createFormProcessingPipeline(
  validateRequired,
  sanitizeInputs,
  formatDates,
  processEvaluationCriteria
);

// Update the hackathon creation route to use the pipeline
app.post('/hackathons/create', isAuthenticated, isCompany, async (req, res) => {
  try {
    // Process form data through the pipeline
    const processedData = processHackathonForm(req.body);
    
    // Create new hackathon
    const newHackathon = new Hackathon({
      company: req.user._id,
      title: processedData.title,
      description: processedData.description,
      evaluationCriteria: processedData.evaluationCriteria,
      roleDescription: processedData.roleDescription,
      startDate: processedData.startDate,
      endDate: processedData.endDate,
      isActive: true,
      submissions: []
    });
    
    // Save to database
    await newHackathon.save();
    
    // Redirect to hackathons page
    res.redirect(302, '/hackathons/company');
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error creating hackathon: ${err.message}`);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).send('Server Error: ' + err.message);
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.DSN || process.env.MONGODB_URI || 'mongodb://localhost/hackhire')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });


export default app;