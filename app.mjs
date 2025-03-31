// app.mjs - Main application file
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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

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

// ONE WORKING FORM ROUTE: Create a hackathon
app.get('/hackathons/create', (req, res) => {
  res.render('create-hackathon', { title: 'Create Hackathon' });
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
    
    // Redirect to results page
    res.redirect('/hackathons/company');
  } catch (err) {
    console.error(err);
    res.render('create-hackathon', { 
      error: 'An error occurred while creating the hackathon',
      formData: req.body
    });
  }
});

// Form results route
app.get('/hackathons/company', async (req, res) => {
  try {
    // Get all hackathons
    const hackathons = await Hackathon.find().sort({ createdAt: -1 });
    
    res.render('company-hackathons', { 
      title: 'Your Hackathons',
      hackathons
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// home route
app.get('/', (req, res) => {
  res.render('index', { title: 'HackHire' });
});

// Other routes
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.post('/login', passport.authenticate('company', {
  successRedirect: '/hackathons/company',
  failureRedirect: '/login',
}));

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    message: err.message,
    error: app.get('env') === 'development' ? err : {}
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hackhire')
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