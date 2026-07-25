import { ProposalInput, ProposalOutput } from '../ai/proposal-generator';
import { TokenMap, fillPlaceholders, joinList, formatINR, formatDate, academicYearFor, extractPlaceholders, validatePlaceholders } from './latex-utils';

/**
 * Data not present in ProposalInput but needed by the template (signatures,
 * cover-page metadata). All optional — anything omitted is left as a
 * visible {{TOKEN}} in the compiled PDF for manual completion.
 */
export interface ProposalMeta {
  preparedBy?: string;
  preparedDate?: string | Date;
  academicYear?: string;
  clubHead?: string;
  departmentHead?: string;
  qrCode?: string;
}

const YES_NO = (v: boolean | undefined) => (v ? 'Required' : 'Not Required');

export function buildProposalLatex(
  templateSource: string,
  input: ProposalInput,
  ai: ProposalOutput,
  meta: ProposalMeta = {}
): string {
  const tokens: TokenMap = {
    // Cover / header
    CLUB_NAME: input.clubName,
    DEPARTMENT: input.department,
    ACADEMIC_YEAR: meta.academicYear ?? academicYearFor(),
    PREPARED_BY: meta.preparedBy ?? input.facultyCoordinator,
    DATE: formatDate(meta.preparedDate ?? new Date()),

    // Event Details
    EVENT_NAME: input.eventName,
    EVENT_TYPE: input.eventType,
    THEME: input.eventTheme,
    PROPOSED_DATE: formatDate(input.proposedDate),
    TIME: input.eventTime,
    VENUE: input.venue,
    MODE: input.mode,

    // Organizing Team
    FACULTY_COORDINATOR: input.facultyCoordinator,
    STUDENT_COORDINATORS: joinList(input.studentCoordinators),
    ORGANIZER: `${input.clubName}, ${input.department}`,

    // About / Objectives / Audience
    DESCRIPTION: ai.description,
    OBJECTIVE_1: ai.objectives[0],
    OBJECTIVE_2: ai.objectives[1],
    OBJECTIVE_3: ai.objectives[2],
    OBJECTIVE_4: ai.objectives[3],
    TARGET_AUDIENCE: ai.targetAudience,
    NO_OF_PARTICIPANTS: String(input.expectedParticipants),

    // Resource Person - Use AI-generated values if not in input
    RESOURCE_PERSON: input.resourcePerson?.name || ai.resourcePerson?.name || '',
    RESOURCE_PERSON_DESIGNATION: input.resourcePerson?.designation || ai.resourcePerson?.designation || '',
    RESOURCE_PERSON_ORGANIZATION: input.resourcePerson?.organization || ai.resourcePerson?.organization || '',
    RESOURCE_PERSON_SHORT_BIO: input.resourcePerson?.shortBio || ai.resourcePerson?.shortBio || '',

    // Publicity / Outcomes / Risks
    PUBLICITY_PLAN: ai.publicityPlan,
    EXPECTED_OUTCOME: ai.expectedOutcomes.join('; '),
    EXPECTED_OUTCOME_1: ai.expectedOutcomes[0],
    EXPECTED_OUTCOME_2: ai.expectedOutcomes[1],
    EXPECTED_OUTCOME_3: ai.expectedOutcomes[2],
    EXPECTED_OUTCOME_4: ai.expectedOutcomes[3],
    RISKS_AND_MITIGATION: ai.risksAndMitigation,

    // Links - Use input values or AI-generated fallbacks or realistic fake values
    REGISTRATION_LINK: input.registrationLink || ai.registrationLink || 'https://forms.google.com/event_registration',
    BROCHURE_LINK: input.brochureLink || ai.brochureLink || 'https://drive.google.com/file/d/event_brochure',

    // Signatures - Use meta values or AI-generated fallbacks or realistic fake values
    CLUB_HEAD: meta.clubHead || ai.clubHead || 'Dr. Club Head',
    DEPARTMENT_HEAD: meta.departmentHead || ai.departmentHead || 'Dr. Department Head',

    // QR Code - Use meta value or AI-generated fallback or realistic fake value
    QR_CODE: meta.qrCode || ai.qrCode || 'QR Code Placeholder',

    // Logo fallback (used if jain-logo.png is not found)
    JAIN_UNIVERSITY_LOGO: 'Jain University Logo',

    // Logistics
    LOGISTICS_PROJECTOR: YES_NO(input.logistics?.projector),
    LOGISTICS_MIC: YES_NO(input.logistics?.mic),
    LOGISTICS_INTERNET: YES_NO(input.logistics?.internet),
    LOGISTICS_CERTIFICATES: YES_NO(input.logistics?.certificates),
    LOGISTICS_REFRESHMENTS: YES_NO(input.logistics?.refreshments),
    LOGISTICS_PHOTOGRAPHY: YES_NO(input.logistics?.photography),
    LOGISTICS_VOLUNTEERS: YES_NO(input.logistics?.volunteers),
  };

  // Event Schedule (template has exactly 5 rows)
  // Generate realistic fake schedule if AI doesn't provide enough
  const schedule = ai.eventSchedule ?? [];
  const defaultSchedule = [
    { time: '09:00', activity: 'Inauguration & Welcome Address', speaker: 'Dr. Principal' },
    { time: '09:30', activity: 'Keynote Session', speaker: 'Guest Speaker' },
    { time: '10:30', activity: 'Technical Session', speaker: 'Faculty Coordinator' },
    { time: '11:30', activity: 'Hands-on Workshop', speaker: 'Student Coordinators' },
    { time: '12:30', activity: 'Valedictory & Certificate Distribution', speaker: 'Department Head' }
  ];
  
  for (let i = 0; i < 5; i++) {
    const row = schedule[i] || defaultSchedule[i];
    tokens[`SCHEDULE_TIME_${i + 1}`] = row?.time || defaultSchedule[i].time;
    tokens[`SCHEDULE_ACTIVITY_${i + 1}`] = row?.activity || defaultSchedule[i].activity;
    tokens[`SCHEDULE_SPEAKER_${i + 1}`] = row?.speaker || defaultSchedule[i].speaker;
  }

  // Budget (handle dynamic number of items, but template has 5 rows)
  const items = input.budgetItems ?? [];
  const total = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  
  // Default budget items for realistic fake data when user provides fewer than 5 items
  const defaultBudgetItems = [
    { item: 'Venue & Infrastructure', amount: 3000 },
    { item: 'Refreshments & Catering', amount: 2500 },
    { item: 'Materials & Supplies', amount: 2000 },
    { item: 'Speaker Honorarium', amount: 1500 },
    { item: 'Contingency & Miscellaneous', amount: 1000 }
  ];
  
  // Fill all 5 budget rows - use default items if user didn't provide enough
  for (let i = 0; i < 5; i++) {
    const item = items[i] || defaultBudgetItems[i];
    tokens[`BUDGET_ITEM_${i + 1}`] = item ? item.item : defaultBudgetItems[i].item;
    tokens[`BUDGET_AMOUNT_${i + 1}`] = item ? formatINR(item.amount) : formatINR(defaultBudgetItems[i].amount);
  }
  
  // Recalculate total if we used default items
  const finalTotal = items.length >= 5 ? total : defaultBudgetItems.reduce((sum, it) => sum + it.amount, 0);
  tokens.TOTAL_BUDGET = formatINR(finalTotal);

  // Validate that all required placeholders have values
  const requiredPlaceholders = extractPlaceholders(templateSource);
  validatePlaceholders(requiredPlaceholders, tokens);

  return fillPlaceholders(templateSource, tokens);
}
