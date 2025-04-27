# Milestone 04 - Final Project Documentation

## NetID
nj2197

## Name
Namay Jindal

## Repository Link
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal

## URL for deployed site 
[TODO]

## URL for form 1 (from previous milestone) 
/hackathons/create

## Special Instructions for Form 1
No special instructions needed. Simply fill out the create hackathon form with the required information like title, description, evaluation criteria, role description, and date range.

## URL for form 2 (from previous milestone)
/hackathons/:id/apply

## Special Instructions for Form 2
This form allows applicants to submit their projects for a specific hackathon. You'll need to:
1. Browse available hackathons at /hackathons/browse
2. Click "View Details" on a hackathon
3. Click "Apply for Hackathon" to access the application form
4. Submit your GitHub link, Devpost link, and cover letter for the hackathon

## URL for form 3 (for current milestone) 
/register/company

## Special Instructions for Form 3
This form allows companies to register for an account. Fill out all required fields including username, company name, email, password, industry, company size, and company description.

## First link to github line number(s) for constructor, HOF, etc.
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/app.mjs#L273-L288

## Second link to github line number(s) for constructor, HOF, etc.
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/public/js/HackathonManager.js#L6-L29

## Short description for links above
The first link shows a higher-order function that processes form data through a filter pipeline, applying multiple validation functions before passing the data to the database. The second link demonstrates an ES6 class HackathonManager that handles loading, filtering, and displaying hackathon data with methods that utilize array higher-order functions like map and filter.

## Link to github line number(s) for schemas (db.js or models folder)
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/db.mjs#L15-L49

## Description of research topics above with points
- 5 points - User authentication with Passport.js: Implemented secure authentication with separate strategies for companies and applicants, including session management, secure password hashing, and proper authentication middleware.
- 3 points - External API integration: Integrated OpenAI API to generate custom hackathon prompts based on company information and role requirements.
- 2 points - Tailwind CSS framework: Implemented responsive design across all pages with customized components and consistent styling.

## Links to github line number(s) for research topics described above (one link per line)
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/app.mjs#L39-L76
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/services/openai.mjs#L5-L30
https://github.com/nyu-csci-ua-0467-001-002-spring-2025/final-project-deployment-namayjindal/blob/master/public/create-hackathon.html#L7

## Optional project notes 
The OpenAI integration requires a valid API key to be set in the .env file as OPENAI_API_KEY. For testing purposes, you can create hackathons without the AI prompt generation functionality.

## Attributions
See source code comments for specific attributions to tutorials and documentation used for Passport.js implementation and Tailwind CSS configuration.