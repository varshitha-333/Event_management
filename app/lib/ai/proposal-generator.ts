import OpenAI from 'openai';
import { extractPlaceholders } from '../latex/latex-utils';
import fs from 'fs';
import path from 'path';

// Initialize OpenRouter API
const openRouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Jain University Event Management',
  }
});

// Initialize NVIDIA API
const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY || '',
});

// Function to select AI provider
function getAIProvider() {
  // Prefer NVIDIA API if available, fallback to OpenRouter
  if (process.env.NVIDIA_API_KEY) {
    return { client: nvidia, model: 'meta/llama-3.1-70b-instruct' };
  }
  return { client: openRouter, model: 'deepseek/deepseek-chat' };
}

// Function to resolve template path
function resolveTemplatePath(fileName: string): string {
  // If fileName is already an absolute path, check if it exists directly
  if (path.isAbsolute(fileName)) {
    if (fs.existsSync(fileName)) {
      return fileName;
    }
    // If absolute path doesn't exist, try relative paths
    fileName = path.basename(fileName);
  }

  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), 'templates', fileName),
    path.join(process.cwd(), 'src', 'templates', fileName),
    path.join(process.cwd(), 'src', 'lib', 'latex', fileName),
    path.join(process.cwd(), 'app', 'lib', 'latex', fileName),
    path.join(process.cwd(), 'latex generation', fileName),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Template not found: ${fileName}. Searched in: ${candidates.join(', ')}`);
  }
  return found;
}

export interface ProposalInput {
  eventName: string;
  eventType: string;
  eventTheme: string;
  proposedDate: string;
  eventTime: string;
  venue: string;
  mode: string;
  facultyCoordinator: string;
  studentCoordinators: string[];
  clubName: string;
  department: string;
  resourcePerson?: {
    name: string;
    designation: string;
    organization: string;
    shortBio: string;
  };
  expectedParticipants: number;
  budgetItems: Array<{ item: string; amount: number }>;
  logistics: {
    projector: boolean;
    mic: boolean;
    internet: boolean;
    certificates: boolean;
    refreshments: boolean;
    photography: boolean;
    volunteers: boolean;
  };
  registrationLink?: string;
  brochureLink?: string;
  photos?: Array<{ id: string; url: string; caption: string; albumTag: string }>;
  actualRegistrations?: number;
}

export interface ProposalOutput {
  description: string;
  objectives: string[];
  targetAudience: string;
  eventSchedule: Array<{
    time: string;
    activity: string;
    speaker: string;
  }>;
  publicityPlan: string;
  expectedOutcomes: string[];
  risksAndMitigation: string;
  // AI-generated fallback values for missing data
  resourcePerson?: {
    name: string;
    designation: string;
    organization: string;
    shortBio: string;
  };
  registrationLink?: string;
  brochureLink?: string;
  clubHead?: string;
  departmentHead?: string;
  qrCode?: string;
}

const PROPOSAL_GENERATION_PROMPT = `
You are an expert event proposal writer for Jain University (Deemed-to-be University).

Generate a professional event proposal based on the provided information.

INPUT DATA:
{{INPUT_DATA}}

REQUIRED PLACEHOLDERS:
{{REQUIRED_PLACEHOLDERS}}

Generate the following sections in professional, formal language suitable for university approval:

1. DESCRIPTION: A compelling 2-3 paragraph description of the event explaining its purpose, relevance, and significance.

2. OBJECTIVES: Generate 4 specific, measurable objectives that this event aims to achieve. Each should be clear and action-oriented.

3. TARGET AUDIENCE: Describe the target audience in detail (year, branch, interests, etc.).

4. EVENT SCHEDULE: Create a detailed schedule with EXACTLY 5 time blocks. For each, provide:
   - Time (e.g., "9:00 AM - 9:30 AM")
   - Activity (specific session or activity)
   - Speaker/Lead (who will conduct it)
   MUST provide exactly 5 schedule entries, no more, no less.

5. PUBLICITY PLAN: A comprehensive plan for promoting the event including channels, timeline, and strategies.

6. EXPECTED OUTCOMES: Generate EXACTLY 4 specific benefits or outcomes that participants will gain from attending.

7. RISKS & MITIGATION: Identify potential risks and provide mitigation strategies for each.

CRITICAL REQUIREMENTS - ABSOLUTE MANDATORY:
- Use formal academic language
- Be specific and realistic
- Align with university values and academic goals
- Keep descriptions concise but comprehensive
- Ensure all generated content is relevant to the event type and theme
- If resource person information is NOT provided in input, generate REALISTIC fake values for name, designation, organization, and bio that match the event type
- If club head or department head information is NOT provided, generate realistic fake names and titles appropriate for Jain University
- If QR code or registration links are NOT provided, generate realistic placeholder text
- Generate ALL required fields even if you have to create realistic assumptions
- NEVER leave any field empty or as placeholder text
- eventSchedule MUST contain exactly 5 entries with all fields filled
- objectives MUST contain exactly 4 entries
- expectedOutcomes MUST contain exactly 4 entries
- The system will validate your response and reject it if required fields are missing or empty
- You MUST provide values for ALL required placeholders listed above
- When generating fake data, make it sound realistic and appropriate for a university setting

Respond ONLY with valid JSON in this exact structure:
{
  "description": "string",
  "objectives": ["string", "string", "string", "string"],
  "targetAudience": "string",
  "eventSchedule": [
    {"time": "string", "activity": "string", "speaker": "string"},
    {"time": "string", "activity": "string", "speaker": "string"},
    {"time": "string", "activity": "string", "speaker": "string"},
    {"time": "string", "activity": "string", "speaker": "string"},
    {"time": "string", "activity": "string", "speaker": "string"}
  ],
  "publicityPlan": "string",
  "expectedOutcomes": ["string", "string", "string", "string"],
  "risksAndMitigation": "string",
  "resourcePerson": {
    "name": "string",
    "designation": "string",
    "organization": "string",
    "shortBio": "string"
  },
  "registrationLink": "string",
  "brochureLink": "string",
  "clubHead": "string",
  "departmentHead": "string",
  "qrCode": "string"
}
`;

// Some models (deepseek-chat in particular) still wrap JSON output in
// markdown code fences even when asked for raw JSON / json_object mode.
// This strips a leading/trailing ```json ... ``` or ``` ... ``` fence,
// and falls back to extracting the first {...} block if needed, before
// we hand the string to JSON.parse.
function extractJsonPayload(raw: string): string {
  let text = raw.trim();

  // Strip a fenced code block if present, e.g. ```json\n{...}\n```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Fallback: grab the first top-level {...} block in case there's
  // stray text before/after the JSON without fences.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export async function generateProposalContent(input: ProposalInput, templatePath?: string): Promise<ProposalOutput> {
  try {
    const { client, model } = getAIProvider();
    
    // Extract placeholders from template if path is provided
    let requiredPlaceholders: string[] = [];
    if (templatePath) {
      try {
        const resolvedPath = resolveTemplatePath(templatePath);
        const templateContent = fs.readFileSync(resolvedPath, 'utf-8');
        requiredPlaceholders = extractPlaceholders(templateContent);
      } catch (error) {
        console.warn('Could not extract placeholders from template:', error);
      }
    }

    let prompt = PROPOSAL_GENERATION_PROMPT.replace('{{INPUT_DATA}}', JSON.stringify(input, null, 2));
    
    // Add required placeholders to prompt if available
    if (requiredPlaceholders.length > 0) {
      const placeholdersText = requiredPlaceholders
        .filter(p => !['CLUB_HEAD', 'DEPARTMENT_HEAD', 'QR_CODE', 'BROCHURE_LINK', 'REGISTRATION_LINK'].includes(p))
        .join(', ');
      prompt = prompt.replace('{{REQUIRED_PLACEHOLDERS}}', placeholdersText || 'None - use standard fields');
    } else {
      prompt = prompt.replace('{{REQUIRED_PLACEHOLDERS}}', 'None - use standard fields');
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert event proposal writer. Always respond with valid JSON only, no markdown, no explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    console.log('AI response:', JSON.stringify(response, null, 2));

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices returned from AI API');
    }

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    let parsed: ProposalOutput;
    try {
      parsed = JSON.parse(extractJsonPayload(content)) as ProposalOutput;
    } catch (parseError) {
      console.error('Raw AI content that failed to parse:', content);
      throw new Error('AI returned malformed JSON');
    }

    // Validate structure
    if (!parsed.description || !Array.isArray(parsed.objectives) || parsed.objectives.length !== 4) {
      throw new Error('Invalid response structure');
    }

    return parsed;
  } catch (error) {
    console.error('Proposal generation error:', error);
    throw new Error(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateProposalContentWithRetry(
  input: ProposalInput, 
  templatePath?: string,
  maxRetries: number = 3
): Promise<ProposalOutput> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateProposalContent(input, templatePath);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Proposal generation attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to generate proposal after multiple attempts');
}

export async function regenerateProposal(input: ProposalInput, previousOutput: ProposalOutput): Promise<ProposalOutput> {
  // Add randomness to prompt for regeneration
  return generateProposalContent(input);
}