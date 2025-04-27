// services/openai.mjs
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a hackathon prompt based on company information and role
 * @param {Object} companyInfo - Information about the company
 * @param {string} companyInfo.companyName - Name of the company
 * @param {string} companyInfo.industry - Industry the company operates in
 * @param {string} companyInfo.companyDescription - Description of the company
 * @param {string} roleDescription - Description of the role being hired for
 * @returns {Promise<Object>} - Generated hackathon content
 */
export async function generateHackathonPrompt(companyInfo, roleDescription) {
  try {
    // Create a prompt for GPT
    const prompt = `
    Create a detailed hackathon prompt for a technical challenge. The hackathon is being hosted by ${companyInfo.companyName}, 
    a company in the ${companyInfo.industry} industry. Their company description is: "${companyInfo.companyDescription}".
    
    They are looking to hire for the role of: ${roleDescription}.
    
    Please provide:
    1. A catchy title for the hackathon
    2. A detailed description of the challenge (250-300 words)
    3. 5 specific evaluation criteria
    `;
    
    // Make API call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    
    // Extract title, description, and criteria
    const titleMatch = content.match(/Title: (.*?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : "AI-Generated Hackathon Challenge";
    
    // Extract description (assume it's between title and criteria)
    let description = "";
    if (content.includes("Description:")) {
      description = content.split("Description:")[1].split("Evaluation Criteria:")[0].trim();
    } else {
      // Fallback: get the text between the title and evaluation criteria
      const startIndex = content.indexOf(title) + title.length;
      const endIndex = content.indexOf("Evaluation Criteria:");
      if (endIndex > startIndex) {
        description = content.substring(startIndex, endIndex).trim();
      }
    }
    
    // Extract evaluation criteria
    const criteriaRegex = /\d+\.\s+(.*?)(?=\d+\.|$)/gs;
    const criteriaMatches = [...content.matchAll(criteriaRegex)];
    const criteria = criteriaMatches.map(match => match[1].trim());
    
    return {
      title,
      description,
      evaluationCriteria: criteria.length > 0 ? criteria : [
        "Technical complexity and implementation",
        "User experience and design",
        "Innovation and creativity",
        "Business impact and feasibility",
        "Code quality and documentation"
      ]
    };
  } catch (error) {
    console.error("Error generating hackathon prompt:", error);
    
    // Return default values if API call fails
    return {
      title: `${companyInfo.companyName} ${roleDescription} Challenge`,
      description: `Join our hackathon to showcase your skills as a ${roleDescription} at ${companyInfo.companyName}. Create a project that demonstrates your technical abilities and innovative thinking in the ${companyInfo.industry} industry.`,
      evaluationCriteria: [
        "Technical complexity and implementation",
        "User experience and design",
        "Innovation and creativity",
        "Business impact and feasibility",
        "Code quality and documentation"
      ]
    };
  }
}

export default {
  generateHackathonPrompt
};