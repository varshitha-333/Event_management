import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Singleton pattern for AI clients to reuse HTTP connections
let openRouterClient: OpenAI | null = null;
let nvidiaClient: OpenAI | null = null;

// Initialize OpenRouter API (singleton)
function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Jain University Event Management',
      }
    });
  }
  return openRouterClient;
}

// Initialize NVIDIA API (singleton)
function getNvidiaClient(): OpenAI {
  if (!nvidiaClient) {
    nvidiaClient = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY || '',
    });
  }
  return nvidiaClient;
}

// Function to select AI provider
function getAIProvider() {
  // Prefer NVIDIA API if available, fallback to OpenRouter
  if (process.env.NVIDIA_API_KEY) {
    // Use faster 8B model for 3-minute target while maintaining quality
    return { client: getNvidiaClient(), model: 'meta/llama-3.1-8b-instruct' };
  }
  // Use faster model on OpenRouter for 3-minute target
  return { client: getOpenRouterClient(), model: 'meta-llama/llama-3.1-8b-instruct:free' };
}

// Simple in-memory cache for identical requests
const suggestionCache = new Map<string, { suggestions: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(theme: string, department: string, guests?: string, audience?: string, tone?: string): string {
  return `${theme}|${department}|${guests || ''}|${audience || ''}|${tone || 'professional'}`;
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
  const startTime = Date.now();
  console.log('[EVENT-SUGGESTION-PERF] START');
  
  try {
    const parseStart = Date.now();
    const body = await request.json();
    const { theme, department, guests, audience, tone } = body;
    console.log(`[EVENT-SUGGESTION-PERF] Request parsing: ${Date.now() - parseStart}ms`);

    if (!theme || !department) {
      return NextResponse.json(
        { error: 'Theme and department are required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheStart = Date.now();
    const cacheKey = getCacheKey(theme, department, guests, audience, tone);
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[EVENT-SUGGESTION-PERF] Cache hit: ${Date.now() - cacheStart}ms`);
      console.log(`[EVENT-SUGGESTION-PERF] Total (cached): ${Date.now() - startTime}ms`);
      return NextResponse.json({ suggestions: cached.suggestions });
    }
    console.log(`[EVENT-SUGGESTION-PERF] Cache miss: ${Date.now() - cacheStart}ms`);

    const aiStart = Date.now();
    const suggestions = await generateAIEventIdeas(theme, department, guests, audience, tone);
    console.log(`[EVENT-SUGGESTION-PERF] AI generation: ${Date.now() - aiStart}ms`);

    // Cache the result
    suggestionCache.set(cacheKey, { suggestions, timestamp: Date.now() });

    const responseStart = Date.now();
    const response = NextResponse.json({ suggestions });
    console.log(`[EVENT-SUGGESTION-PERF] Response serialization: ${Date.now() - responseStart}ms`);
    console.log(`[EVENT-SUGGESTION-PERF] Total: ${Date.now() - startTime}ms`);
    
    return response;

  } catch (error) {
    console.error('[EVENT-SUGGESTION-PERF] Error:', error);
    console.log(`[EVENT-SUGGESTION-PERF] Total (with error): ${Date.now() - startTime}ms`);
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
  const functionStart = Date.now();
  console.log('[EVENT-SUGGESTION-PERF] generateAIEventIdeas START');
  
  const providerStart = Date.now();
  const { client, model } = getAIProvider();
  console.log(`[EVENT-SUGGESTION-PERF] Provider selection: ${Date.now() - providerStart}ms`);
  console.log(`[EVENT-SUGGESTION-PERF] Using provider: ${model}`);
  
  const promptStart = Date.now();
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
8. **Estimated Budget**: MUST be between ₹30,000 to ₹50,000 only - do not exceed this range
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
- BUDGET MUST BE BETWEEN ₹30,000 TO ₹50,000 ONLY - NEVER EXCEED THIS RANGE

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
  console.log(`[EVENT-SUGGESTION-PERF] Prompt construction: ${Date.now() - promptStart}ms`);

  const apiCallStart = Date.now();
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
    max_tokens: 2048, // Increased back for 3 suggestions
    response_format: { type: 'json_object' }
  });
  console.log(`[EVENT-SUGGESTION-PERF] AI API call: ${Date.now() - apiCallStart}ms`);

  if (!response.choices || response.choices.length === 0) {
    throw new Error('No choices returned from AI API');
  }

  const content = response.choices[0].message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  const parseStart = Date.now();
  let parsed: { suggestions: EventSuggestion[] };
  try {
    const jsonPayload = extractJsonPayload(content);
    parsed = JSON.parse(jsonPayload) as { suggestions: EventSuggestion[] };
  } catch (parseError) {
    console.error('Raw AI content that failed to parse:', content);
    throw new Error('AI returned malformed JSON');
  }
  console.log(`[EVENT-SUGGESTION-PERF] JSON parsing: ${Date.now() - parseStart}ms`);

  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw new Error('Invalid response structure');
  }

  console.log(`[EVENT-SUGGESTION-PERF] generateAIEventIdeas Total: ${Date.now() - functionStart}ms`);
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
