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

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, { id: user._id, type: 'company' });
});

passport.deserializeUser(async (data, done) => {
  try {
    const user = await Company.findById(data.id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Simple middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
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

// Update this route in app.mjs
app.get('/hackathons/company', async (req, res) => {
  try {
    // Instead of sending JSON, send the HTML file first
    res.sendFile(path.join(__dirname, 'public', 'company-hackathons.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
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