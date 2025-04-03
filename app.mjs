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

  app.get('/hackathons/:id/edit', async (req, res) => {
    try {
      const hackathon = await Hackathon.findById(req.params.id);
      if (!hackathon) {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
      }
      
      // Create a simple edit form for now
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Hackathon | HackHire</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <nav class="bg-white shadow mb-4">
          <div class="container mx-auto px-4 py-4 flex justify-between">
            <a href="/" class="text-xl font-bold text-blue-600">HackHire</a>
            <div>
              <a href="/hackathons/create" class="px-4 py-2 rounded text-blue-600 hover:text-blue-800">Create Hackathon</a>
              <a href="/hackathons/company" class="px-4 py-2 rounded text-blue-600 hover:text-blue-800">View Hackathons</a>
              <a href="/hackathons/browse" class="px-4 py-2 rounded text-blue-600 hover:text-blue-800">Browse Hackathons</a>
            </div>
          </div>
        </nav>
        
        <main class="container mx-auto px-4">
          <div class="max-w-4xl mx-auto py-8 px-4">
            <h1 class="text-2xl font-bold mb-6">Edit Hackathon</h1>
            
            <form action="/hackathons/${hackathon._id}/update" method="POST" class="space-y-6">
              <div>
                <label for="title" class="block text-gray-700">Hackathon Title</label>
                <input type="text" name="title" id="title" value="${hackathon.title}" required 
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
              </div>
              
              <div>
                <label for="description" class="block text-gray-700">Description</label>
                <textarea name="description" id="description" rows="4" required 
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">${hackathon.description}</textarea>
                <p class="mt-1 text-sm text-gray-500">Describe the hackathon challenge and requirements.</p>
              </div>
              
              <div>
                <label for="evaluationCriteria" class="block text-gray-700">Evaluation Criteria</label>
                <textarea name="evaluationCriteria" id="evaluationCriteria" rows="4" required 
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">${hackathon.evaluationCriteria.join('\n')}</textarea>
                <p class="mt-1 text-sm text-gray-500">Enter each criterion on a new line.</p>
              </div>
              
              <div>
                <label for="roleDescription" class="block text-gray-700">Target Role Description</label>
                <input type="text" name="roleDescription" id="roleDescription" value="${hackathon.roleDescription}" required 
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
              </div>
              
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label for="startDate" class="block text-gray-700">Start Date</label>
                  <input type="datetime-local" name="startDate" id="startDate" value="${new Date(hackathon.startDate).toISOString().slice(0, 16)}" required 
                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
                </div>
                
                <div>
                  <label for="endDate" class="block text-gray-700">End Date</label>
                  <input type="datetime-local" name="endDate" id="endDate" value="${new Date(hackathon.endDate).toISOString().slice(0, 16)}" required 
                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
                </div>
              </div>
              
              <div class="flex justify-between">
                <form action="/hackathons/${hackathon._id}/delete" method="POST">
                  <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Hackathon
                  </button>
                </form>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Update Hackathon
                </button>
              </div>
            </form>
          </div>
        </main>
        
        <footer class="bg-white mt-8 py-4">
          <div class="container mx-auto px-4">
            <p class="text-center text-gray-500">&copy; 2023 HackHire</p>
          </div>
        </footer>
      </body>
      </html>
      `;
      
      res.send(html);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });

// Get hackathon data for the edit form
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

export default app;