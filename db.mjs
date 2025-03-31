// db.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// load environment variables
dotenv.config();

// connect to MongoDB
const mongooseOpts = {
  useNewUrlParser: true,  
  useUnifiedTopology: true,
};

// replace with your own connection string if needed
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost/hackhire';
mongoose.connect(dbUrl, mongooseOpts);

// define schemas
const Schema = mongoose.Schema;

// company user schema
const CompanySchema = new Schema({
  username: {type: String, required: true, unique: true},
  companyName: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  hash: {type: String, required: true},
  industry: {type: String, required: true},
  companySize: {type: String},
  companyDescription: {type: String},
  hackathons: [{type: Schema.Types.ObjectId, ref: 'Hackathon'}]
});

// applicant user schema
const ApplicantSchema = new Schema({
  username: {type: String, required: true, unique: true},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  hash: {type: String, required: true},
  skills: [{type: String}],
  githubProfile: {type: String},
  submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});

// hackathon schema
const HackathonSchema = new Schema({
  company: {type: Schema.Types.ObjectId, ref: 'Company', required: true},
  title: {type: String, required: true},
  description: {type: String, required: true},
  evaluationCriteria: [{type: String}],
  roleDescription: {type: String, required: true},
  startDate: {type: Date, required: true},
  endDate: {type: Date, required: true},
  isActive: {type: Boolean, default: true},
  submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}],
  createdAt: {type: Date, default: Date.now}
});

// submission schema
const SubmissionSchema = new Schema({
  hackathon: {type: Schema.Types.ObjectId, ref: 'Hackathon', required: true},
  applicant: {type: Schema.Types.ObjectId, ref: 'Applicant', required: true},
  githubLink: {type: String, required: true},
  devpostLink: {type: String, required: true},
  coverLetter: {type: String, required: true, maxlength: 1000}, // Limit to ~200 words
  submissionDate: {type: Date, default: Date.now},
  status: {type: String, default: 'submitted'}
});

// register models
const Company = mongoose.model('Company', CompanySchema);
const Applicant = mongoose.model('Applicant', ApplicantSchema);
const Hackathon = mongoose.model('Hackathon', HackathonSchema);
const Submission = mongoose.model('Submission', SubmissionSchema);

// export models
export {
  Company,
  Applicant,
  Hackathon,
  Submission
};