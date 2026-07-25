import { NextRequest, NextResponse } from 'next/server';
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

interface EventSuggestion {
  title: string;
  description: string;
  purpose: string;
  benefits: string;
  skillsDeveloped: {
    technical: string[];
    professional: string[];
    leadership: string[];
    communication: string[];
    innovation: string[];
  };
  suitableAudience: string;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedBudget: string;
  duration: string;
  teamSize: string;
  resourcesRequired: string[];
  expectedOutcome: string;
  previousSuccess: string[];
  whyStudentsWillLikeIt: string;
  futureScope: string;
  // Additional comprehensive details
  eventType: string;
  category: string;
  proposedFormat: string;
  venueRequirements: string;
  logisticsNeeded: string[];
  sponsorshipOpportunities: string[];
  marketingStrategy: string;
  riskMitigation: string;
  successMetrics: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, department, guests, audience, tone } = body;

    if (!theme || !department) {
      return NextResponse.json(
        { error: 'Theme and department are required' },
        { status: 400 }
      );
    }

    const suggestions = await generateAIEventIdeas(theme, department, guests, audience, tone);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

async function generateAIEventIdeas(
  theme: string,
  department: string,
  guests?: string,
  audience?: string,
  tone?: string
): Promise<EventSuggestion[]> {
  const { client, model } = getAIProvider();
  
  const prompt = `
You are an expert event planner for Jain University (Deemed-to-be University).

Generate 3 creative, engaging event suggestions based on the following inputs:
- Theme: ${theme}
- Department: ${department}
- Guests: ${guests || 'Not specified'}
- Target Audience: ${audience || 'Not specified'}
- Tone: ${tone || 'Professional'}

For each event suggestion, provide the following information in a concise, well-structured format:

1. **Event Title**: A clear, attractive title
2. **Short Description**: One concise paragraph (2-3 sentences)
3. **Purpose**: Why this event should be conducted (1-2 sentences)
4. **Benefits**: Benefits for students (1-2 sentences)
5. **Skills Developed**:
   - Technical: 2-3 skills
   - Professional: 2-3 skills
   - Leadership: 2-3 skills
   - Communication: 2-3 skills
   - Innovation: 2-3 skills
6. **Suitable Audience**: Which students should participate (1 sentence)
7. **Difficulty Level**: Beginner / Intermediate / Advanced
8. **Estimated Budget**: Approximate budget range
9. **Duration**: Expected duration (e.g., "2 days", "1 week")
10. **Team Size**: Recommended organizing team size
11. **Resources Required**: List of 3-5 key resources
12. **Expected Outcome**: Learning outcomes (1-2 sentences)
13. **Previous Success**: Mention representative examples where similar events have been conducted (universities, colleges, industry, hackathons). Do not fabricate specific institutions unless supported. Identify as representative examples.
14. **Why Students Will Like It**: Short explanation (1-2 sentences)
15. **Future Scope**: How it helps careers (1-2 sentences)
16. **Event Type**: Workshop, Seminar, Hackathon, Conference, Competition, etc.
17. **Category**: Academic, Cultural, Technical, Sports, Social, etc.
18. **Proposed Format**: How the event should be structured (e.g., "Keynote + Hands-on sessions", "Roundtable discussions")
19. **Venue Requirements**: Specific venue needs (e.g., "Lab with 30 computers", "Auditorium with stage")
20. **Logistics Needed**: List of 3-5 logistical requirements (e.g., "Projector", "Microphones", "Registration desk")
21. **Sponsorship Opportunities**: List of 2-3 potential sponsorship types (e.g., "Tech companies", "Local businesses")
22. **Marketing Strategy**: Brief marketing approach (1-2 sentences)
23. **Risk Mitigation**: Potential risks and mitigation strategies (1-2 sentences)
24. **Success Metrics**: List of 3-4 measurable success indicators

CRITICAL REQUIREMENTS:
- Keep each suggestion concise and easy to read
- Use multiple small headings and short paragraphs
- Avoid walls of text
- Each event should fit comfortably on one screen
- Be specific and realistic
- Align with university values
- Make suggestions engaging for students
- Do not fabricate unverifiable historical occurrences
- If giving examples, identify them as representative examples
- Generate realistic values for ALL fields even if not explicitly provided in input
- Make logistics, venue, and marketing suggestions practical for a university setting

Respond ONLY with valid JSON in this exact structure:
{
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "purpose": "string",
      "benefits": "string",
      "skillsDeveloped": {
        "technical": ["string", "string"],
        "professional": ["string", "string"],
        "leadership": ["string", "string"],
        "communication": ["string", "string"],
        "innovation": ["string", "string"]
      },
      "suitableAudience": "string",
      "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
      "estimatedBudget": "string",
      "duration": "string",
      "teamSize": "string",
      "resourcesRequired": ["string", "string", "string"],
      "expectedOutcome": "string",
      "previousSuccess": ["string", "string"],
      "whyStudentsWillLikeIt": "string",
      "futureScope": "string",
      "eventType": "string",
      "category": "string",
      "proposedFormat": "string",
      "venueRequirements": "string",
      "logisticsNeeded": ["string", "string", "string"],
      "sponsorshipOpportunities": ["string", "string"],
      "marketingStrategy": "string",
      "riskMitigation": "string",
      "successMetrics": ["string", "string", "string"]
    }
  ]
}
`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert event planner. Always respond with valid JSON only, no markdown, no explanations.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
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

  let parsed: { suggestions: EventSuggestion[] };
  try {
    const jsonPayload = extractJsonPayload(content);
    parsed = JSON.parse(jsonPayload) as { suggestions: EventSuggestion[] };
  } catch (parseError) {
    console.error('Raw AI content that failed to parse:', content);
    throw new Error('AI returned malformed JSON');
  }

  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw new Error('Invalid response structure');
  }

  return parsed.suggestions;
}

function extractJsonPayload(raw: string): string {
  let text = raw.trim();

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
