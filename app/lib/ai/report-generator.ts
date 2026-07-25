import OpenAI from 'openai';

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

export interface ReportInput {
  eventName: string;
  date: string;
  time: string;
  venue: string;
  eventType: string;
  organizer: string;
  facultyCoordinator: string;
  studentCoordinators: string[];
  resourcePerson?: {
    name: string;
    designation: string;
    organization: string;
  };
  actualParticipants: number;
  participantStats: {
    registered: number;
    attended: number;
    male: number;
    female: number;
    others: number;
    certificatesIssued: number;
  };
  budgetUtilized: Array<{ item: string; amount: number }>;
  links: {
    driveLink: string;
    registrationLink: string;
    attendanceLink: string;
    feedbackLink: string;
    recordingLink?: string;
    presentationLink?: string;
  };
  socialMediaLinks: string[];
  photos: Array<{ url: string; caption: string }>;
}

export interface ProposalData {
  description: string;
  objectives: string[];
  expectedOutcomes: string[];
}

export interface ReportOutput {
  description: string;
  objectives: string[];
  eventProceedings: string;
  keyHighlights: string[];
  learningOutcomes: string[];
  feedbackSummary: string;
  mediaCoverage: string;
  futureRecommendations: string;
  conclusion: string;
}

const REPORT_GENERATION_PROMPT = `
You are an expert event report writer for Jain University (Deemed-to-be University).

Generate a comprehensive post-event report based on the provided information.

INPUT DATA:
{{INPUT_DATA}}

PRE-EVENT PROPOSAL DATA:
{{PROPOSAL_DATA}}

Generate the following sections in professional, formal language:

1. DESCRIPTION: A 2-3 paragraph summary of what the event was about and its significance.

2. OBJECTIVES: 4 objectives that were set for this event (can be from proposal or refined based on actual execution).

3. EVENT PROCEEDINGS: A detailed narrative of how the event unfolded, including key moments, flow, and atmosphere.

4. KEY HIGHLIGHTS: 4 standout moments or achievements from the event.

5. LEARNING OUTCOMES: 4 specific skills, knowledge, or takeaways that participants gained.

6. FEEDBACK SUMMARY: A comprehensive summary of participant feedback. If reviews are provided in the input data, analyze them to identify common themes, positive aspects, and constructive feedback. Include the average rating if available. If no reviews are provided, state that feedback collection is pending or not available.

7. MEDIA COVERAGE: Description of any media coverage, social media engagement, or publicity achieved.

8. FUTURE RECOMMENDATIONS: Suggestions for improving similar events in the future.

9. CONCLUSION: A concluding paragraph summarizing the event's success and impact.

CRITICAL REQUIREMENTS - ABSOLUTE MANDATORY:
- Use formal academic language
- Be specific and factual
- Highlight achievements and impact
- Acknowledge challenges constructively
- Align with university standards
- Keep descriptions professional yet engaging
- If resource person information is NOT provided in input, generate REALISTIC fake values for name, designation, and organization that match the event type
- If photos are NOT provided, generate realistic descriptions of what photos would show
- If social media links are NOT provided, generate realistic social media engagement descriptions
- If feedback data is NOT provided, generate realistic feedback summary appropriate for the event type
- Generate ALL required fields even if you have to create realistic assumptions
- NEVER leave any field empty or as placeholder text
- objectives MUST contain exactly 4 entries
- keyHighlights MUST contain exactly 4 entries
- learningOutcomes MUST contain exactly 4 entries
- The system will validate your response and reject it if required fields are missing or empty
- When generating fake data, make it sound realistic and appropriate for a university setting

Respond ONLY with valid JSON in this exact structure:
{
  "description": "string",
  "objectives": ["string", "string", "string", "string"],
  "eventProceedings": "string",
  "keyHighlights": ["string", "string", "string", "string"],
  "learningOutcomes": ["string", "string", "string", "string"],
  "feedbackSummary": "string",
  "mediaCoverage": "string",
  "futureRecommendations": "string",
  "conclusion": "string"
}
`;

function extractJsonPayload(raw: string): string {
  const text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export async function generateReportContent(
  input: ReportInput,
  proposalData?: ProposalData
): Promise<ReportOutput> {
  try {
    const { client, model } = getAIProvider();
    const inputData = JSON.stringify(input, null, 2);
    const proposalDataStr = proposalData ? JSON.stringify(proposalData, null, 2) : 'Not available';

    const prompt = REPORT_GENERATION_PROMPT
      .replace('{{INPUT_DATA}}', inputData)
      .replace('{{PROPOSAL_DATA}}', proposalDataStr);

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert event report writer. Always respond with valid JSON only, no markdown, no explanations.'
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

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices returned from AI API');
    }

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    let parsed: ReportOutput;
    try {
      parsed = JSON.parse(extractJsonPayload(content)) as ReportOutput;
    } catch (parseError) {
      console.error('Raw AI content that failed to parse:', content);
      throw new Error('AI returned malformed JSON');
    }

    if (!parsed.description || !Array.isArray(parsed.objectives) || parsed.objectives.length !== 4) {
      throw new Error('Invalid response structure');
    }

    return parsed;
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function regenerateReport(
  input: ReportInput,
  proposalData?: ProposalData,
  previousOutput?: ReportOutput
): Promise<ReportOutput> {
  // Add randomness to prompt for regeneration
  return generateReportContent(input, proposalData);
}
