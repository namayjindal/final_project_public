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

// passport setup (placeholder for future authentication implementation)
app.use(passport.initialize());
app.use(passport.session());

// routes placeholder
// TODO: split these into separate route files

// home route
app.get('/', (req, res) => {
  res.render('index', { title: 'HackHire' });
});

// company routes (placeholder)
app.get('/company/register', (req, res) => {
  res.render('company-register');
});

app.get('/company/login', (req, res) => {
  res.render('company-login');
});

app.get('/company/dashboard', (req, res) => {
  // TODO: Add authentication check
  res.render('company-dashboard');
});

app.get('/company/create-hackathon', (req, res) => {
  // TODO: Add authentication check
  res.render('create-hackathon');
});

// applicant routes (placeholder)
app.get('/applicant/register', (req, res) => {
  res.render('applicant-register');
});

app.get('/applicant/login', (req, res) => {
  res.render('applicant-login');
});

app.get('/applicant/dashboard', (req, res) => {
  // TODO: Add authentication check
  res.render('applicant-dashboard');
});

app.get('/hackathons', (req, res) => {
  res.render('hackathons');
});

app.get('/hackathons/:id', (req, res) => {
  // TODO: Fetch hackathon details
  res.render('hackathon-details');
});

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

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;