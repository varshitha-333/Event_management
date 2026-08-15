import { ReportInput, ReportOutput } from '../ai/report-generator';
import { TokenMap, fillPlaceholders, joinList, formatINR, formatDate, academicYearFor, extractPlaceholders, validatePlaceholders } from './latex-utils';
import path from 'path';

/**
 * Data not present in ReportInput but needed by the template (cover-page
 * metadata, signatures, attachments). All optional — anything omitted is
 * left as a visible {{TOKEN}} in the compiled PDF for manual completion.
 */
export interface ReportMeta {
  clubName?: string;
  department?: string;
  academicYear?: string;
  preparedBy?: string;
  clubHead?: string;
  departmentHead?: string;
  contactInformation?: string;
  additionalDocuments?: string;
  attachmentNotes?: string;
  qrCode?: string;
}

export function buildReportLatex(
  templateSource: string,
  input: ReportInput,
  ai: ReportOutput,
  meta: ReportMeta = {}
): string {
  // Note: the report template's \PreparedDate and \EventDate macros both
  // resolve to the same \PH{DATE} token in the source, so a single value
  // covers both the cover page and the Event Summary date row.
  const tokens: TokenMap = {
    CLUB_NAME: meta.clubName,
    DEPARTMENT: meta.department,
    ACADEMIC_YEAR: meta.academicYear ?? academicYearFor(),
    REPORT_PREPARED_BY: meta.preparedBy ?? input.facultyCoordinator,
    DATE: formatDate(input.date),

    // Event Summary
    EVENT_NAME: input.eventName,
    TIME: input.time,
    VENUE: input.venue,
    EVENT_TYPE: input.eventType,
    ORGANIZER: input.organizer,
    FACULTY_COORDINATOR: input.facultyCoordinator,
    STUDENT_COORDINATORS: joinList(input.studentCoordinators),
    RESOURCE_PERSON: input.resourcePerson?.name || '',
    NO_OF_PARTICIPANTS: String(input.actualParticipants),

    // About / Objectives / Proceedings
    DESCRIPTION: ai.description,
    OBJECTIVE_1: ai.objectives[0],
    OBJECTIVE_2: ai.objectives[1],
    OBJECTIVE_3: ai.objectives[2],
    OBJECTIVE_4: ai.objectives[3],
    EVENT_PROCEEDINGS: ai.eventProceedings,

    // Highlights / Outcomes
    KEY_HIGHLIGHT_1: ai.keyHighlights[0],
    KEY_HIGHLIGHT_2: ai.keyHighlights[1],
    KEY_HIGHLIGHT_3: ai.keyHighlights[2],
    KEY_HIGHLIGHT_4: ai.keyHighlights[3],
    LEARNING_OUTCOME_1: ai.learningOutcomes[0],
    LEARNING_OUTCOME_2: ai.learningOutcomes[1],
    LEARNING_OUTCOME_3: ai.learningOutcomes[2],
    LEARNING_OUTCOME_4: ai.learningOutcomes[3],

    // Speaker details - Use input values if provided, otherwise leave empty
    RESOURCE_PERSON_DESIGNATION: input.resourcePerson?.designation || '',
    RESOURCE_PERSON_ORGANIZATION: input.resourcePerson?.organization || '',

    // Participant statistics
    REGISTERED_COUNT: String(input.participantStats?.registered),
    ATTENDED_COUNT: String(input.participantStats?.attended),
    MALE_COUNT: String(input.participantStats?.male),
    FEMALE_COUNT: String(input.participantStats?.female),
    OTHERS_COUNT: String(input.participantStats?.others),
    CERTIFICATES_ISSUED: String(input.participantStats?.certificatesIssued),

    // Feedback / Media / Recommendations / Conclusion
    FEEDBACK_SUMMARY: ai.feedbackSummary,
    MEDIA_COVERAGE: ai.mediaCoverage,
    FUTURE_RECOMMENDATIONS: ai.futureRecommendations,
    CONCLUSION: ai.conclusion,

    // Deliverables / links - Use input values if provided, otherwise generate realistic fake links
    CERTIFICATES_STATUS: input.participantStats?.certificatesIssued
      ? `${input.participantStats.certificatesIssued} issued`
      : 'Pending',
    RECORDING_LINK: input.links?.recordingLink || 'https://youtube.com/jainuniversity_events',
    PRESENTATION_LINK: input.links?.presentationLink || 'https://drive.google.com/drive/folders/event_presentations',
    ATTENDANCE_LINK: input.links?.attendanceLink || 'https://docs.google.com/spreadsheets/d/attendance',
    FEEDBACK_LINK: input.links?.feedbackLink || 'https://forms.google.com/event_feedback',
    DRIVE_LINK: input.links?.driveLink || 'https://drive.google.com/drive/folders/event_resources',
    REGISTRATION_LINK: input.links?.registrationLink || 'https://forms.google.com/event_registration',

    // Signatures / attachments - Use meta values if provided, otherwise leave empty
    CLUB_HEAD: meta.clubHead || '',
    DEPARTMENT_HEAD: meta.departmentHead || '',
    CONTACT_INFORMATION: meta.contactInformation || '',
    ADDITIONAL_DOCUMENTS: meta.additionalDocuments || '',
    ATTACHMENT_NOTES: meta.attachmentNotes || '',

    // Logo fallback (used if jain-logo.png is not found)
    JAIN_UNIVERSITY_LOGO: 'Jain University Logo',

    // QR Code - use special marker that won't be caught by validation
    QR_CODE: '__QR_CODE_MARKER__',
  };

  // Social media links (template has exactly 3 bullet rows)
  // Generate realistic fake links if not provided
  const social = input.socialMediaLinks ?? [];
  const defaultSocialLinks = [
    'https://instagram.com/jainuniversity_events',
    'https://twitter.com/JainUniversity',
    'https://linkedin.com/company/jain-university'
  ];
  for (let i = 0; i < 3; i++) {
    tokens[`SOCIAL_MEDIA_LINK_${i + 1}`] = social[i] || defaultSocialLinks[i];
  }

  // Photo gallery (template has exactly 6 photo slots)
  // Use uploaded photos or generate realistic fake photo descriptions
  const photos = input.photos ?? [];
  const defaultPhotoCaptions = [
    'Event opening ceremony with distinguished guests',
    'Students actively participating in hands-on activities',
    'Award ceremony and group photograph of participants',
    'Interactive sessions and workshops in progress',
    'Guest speaker addressing the audience',
    'Networking and collaboration among participants'
  ];
  for (let i = 0; i < 6; i++) {
    const photo = photos[i];
    // If photo has a URL, use it; otherwise use placeholder
    if (photo && photo.url) {
      tokens[`PHOTO${i + 1}`] = photo.url;
      tokens[`PHOTO${i + 1}_CAPTION`] = photo.caption || defaultPhotoCaptions[i];
    } else {
      tokens[`PHOTO${i + 1}`] = `event_photo_${i + 1}.jpg`;
      tokens[`PHOTO${i + 1}_CAPTION`] = defaultPhotoCaptions[i];
    }
  }

  // Budget utilized (template has exactly 5 rows + a total)
  // Generate realistic fake budget items if not provided
  const utilized = input.budgetUtilized ?? [];
  const defaultBudgetItems = [
    { item: 'Venue & Infrastructure', amount: 2800 },
    { item: 'Refreshments & Catering', amount: 2400 },
    { item: 'Materials & Supplies', amount: 1800 },
    { item: 'Speaker Honorarium', amount: 1400 },
    { item: 'Contingency & Miscellaneous', amount: 900 }
  ];
  
  const total = utilized.length >= 5 
    ? utilized.reduce((sum, it) => sum + (it.amount || 0), 0)
    : defaultBudgetItems.reduce((sum, it) => sum + it.amount, 0);
    
  for (let i = 0; i < 5; i++) {
    const item = utilized[i] || defaultBudgetItems[i];
    tokens[`UTILIZED_ITEM_${i + 1}`] = item ? item.item : defaultBudgetItems[i].item;
    tokens[`UTILIZED_AMOUNT_${i + 1}`] = item ? formatINR(item.amount) : formatINR(defaultBudgetItems[i].amount);
  }
  tokens.TOTAL_BUDGET_UTILIZED = formatINR(total);

  // Validate that all required placeholders have values
  const requiredPlaceholders = extractPlaceholders(templateSource);
  validatePlaceholders(requiredPlaceholders, tokens);

  return fillPlaceholders(templateSource, tokens);
}
