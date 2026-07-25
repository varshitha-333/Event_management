import fs from 'fs';
import path from 'path';
import { TokenMap, escapeLatex, fillPlaceholders } from './latex-utils';

export interface TemplateData {
  // Common fields
  CLUB_NAME: string;
  DEPARTMENT: string;
  ACADEMIC_YEAR: string;
  PREPARED_BY: string;
  REPORT_PREPARED_BY?: string; // For report template
  DATE: string;
  JAIN_UNIVERSITY_LOGO?: string;

  // Event details
  EVENT_NAME: string;
  EVENT_TYPE?: string;
  THEME?: string;
  PROPOSED_DATE?: string;
  TIME?: string;
  VENUE: string;
  MODE?: string;

  // People
  FACULTY_COORDINATOR: string;
  STUDENT_COORDINATORS: string;
  ORGANIZER?: string;
  RESOURCE_PERSON?: string;
  RESOURCE_PERSON_DESIGNATION?: string;
  RESOURCE_PERSON_ORGANIZATION?: string;
  RESOURCE_PERSON_SHORT_BIO?: string;

  // Content
  DESCRIPTION: string;
  TARGET_AUDIENCE?: string;
  NO_OF_PARTICIPANTS?: string;
  PUBLICITY_PLAN?: string;
  EXPECTED_OUTCOME?: string;
  RISKS_AND_MITIGATION?: string;

  // Objectives (array)
  OBJECTIVE_1?: string;
  OBJECTIVE_2?: string;
  OBJECTIVE_3?: string;
  OBJECTIVE_4?: string;

  // Schedule (for proposal)
  SCHEDULE_TIME_1?: string;
  SCHEDULE_ACTIVITY_1?: string;
  SCHEDULE_SPEAKER_1?: string;
  SCHEDULE_TIME_2?: string;
  SCHEDULE_ACTIVITY_2?: string;
  SCHEDULE_SPEAKER_2?: string;
  SCHEDULE_TIME_3?: string;
  SCHEDULE_ACTIVITY_3?: string;
  SCHEDULE_SPEAKER_3?: string;
  SCHEDULE_TIME_4?: string;
  SCHEDULE_ACTIVITY_4?: string;
  SCHEDULE_SPEAKER_4?: string;
  SCHEDULE_TIME_5?: string;
  SCHEDULE_ACTIVITY_5?: string;
  SCHEDULE_SPEAKER_5?: string;

  // Budget (for proposal)
  BUDGET_ITEM_1?: string;
  BUDGET_AMOUNT_1?: string;
  BUDGET_ITEM_2?: string;
  BUDGET_AMOUNT_2?: string;
  BUDGET_ITEM_3?: string;
  BUDGET_AMOUNT_3?: string;
  BUDGET_ITEM_4?: string;
  BUDGET_AMOUNT_4?: string;
  BUDGET_ITEM_5?: string;
  BUDGET_AMOUNT_5?: string;
  TOTAL_BUDGET?: string;

  // Logistics (for proposal)
  LOGISTICS_PROJECTOR?: string;
  LOGISTICS_MIC?: string;
  LOGISTICS_INTERNET?: string;
  LOGISTICS_CERTIFICATES?: string;
  LOGISTICS_REFRESHMENTS?: string;
  LOGISTICS_PHOTOGRAPHY?: string;
  LOGISTICS_VOLUNTEERS?: string;

  // Expected outcomes (for proposal)
  EXPECTED_OUTCOME_1?: string;
  EXPECTED_OUTCOME_2?: string;
  EXPECTED_OUTCOME_3?: string;
  EXPECTED_OUTCOME_4?: string;

  // Report specific fields
  EVENT_PROCEEDINGS?: string;
  KEY_HIGHLIGHT_1?: string;
  KEY_HIGHLIGHT_2?: string;
  KEY_HIGHLIGHT_3?: string;
  KEY_HIGHLIGHT_4?: string;
  LEARNING_OUTCOME_1?: string;
  LEARNING_OUTCOME_2?: string;
  LEARNING_OUTCOME_3?: string;
  LEARNING_OUTCOME_4?: string;
  FEEDBACK_SUMMARY?: string;
  MEDIA_COVERAGE?: string;
  FUTURE_RECOMMENDATIONS?: string;
  CONCLUSION?: string;

  // Report statistics
  REGISTERED_COUNT?: string;
  ATTENDED_COUNT?: string;
  MALE_COUNT?: string;
  FEMALE_COUNT?: string;
  OTHERS_COUNT?: string;
  CERTIFICATES_ISSUED?: string;

  // Report budget
  UTILIZED_ITEM_1?: string;
  UTILIZED_AMOUNT_1?: string;
  UTILIZED_ITEM_2?: string;
  UTILIZED_AMOUNT_2?: string;
  UTILIZED_ITEM_3?: string;
  UTILIZED_AMOUNT_3?: string;
  UTILIZED_ITEM_4?: string;
  UTILIZED_AMOUNT_4?: string;
  UTILIZED_ITEM_5?: string;
  UTILIZED_AMOUNT_5?: string;
  TOTAL_BUDGET_UTILIZED?: string;

  // Report deliverables
  CERTIFICATES_STATUS?: string;
  RECORDING_LINK?: string;
  PRESENTATION_LINK?: string;
  FEEDBACK_LINK?: string;

  // Links
  REGISTRATION_LINK?: string;
  BROCHURE_LINK?: string;
  DRIVE_LINK?: string;
  ATTENDANCE_LINK?: string;
  SOCIAL_MEDIA_LINK_1?: string;
  SOCIAL_MEDIA_LINK_2?: string;
  SOCIAL_MEDIA_LINK_3?: string;

  // Photos
  PHOTO1?: string;
  PHOTO2?: string;
  PHOTO3?: string;
  PHOTO1_CAPTION?: string;
  PHOTO2_CAPTION?: string;
  PHOTO3_CAPTION?: string;

  // Other
  CONTACT_INFORMATION?: string;
  ADDITIONAL_DOCUMENTS?: string;
  ATTACHMENT_NOTES?: string;
  QR_CODE?: string;
  CLUB_HEAD?: string;
  DEPARTMENT_HEAD?: string;
}

/**
 * Safe template fill: injects escaped values into literal \PH{TOKEN} placeholders.
 * Missing values are intentionally left untouched so unresolved placeholders remain visible.
 */
export function fillTemplateSource(templateSource: string, data: TemplateData): string {
  return fillPlaceholders(templateSource, data as unknown as TokenMap);
}

export function fillLatexTemplate(templatePath: string, data: TemplateData): string {
  return fillTemplateSource(fs.readFileSync(templatePath, 'utf-8'), data);
}

/**
 * Fill the proposal template with event data
 */
export function fillProposalTemplate(data: TemplateData): string {
  const templatePath = path.join(process.cwd(), 'event_proposal_template.tex');
  return fillLatexTemplate(templatePath, data);
}

/**
 * Fill the post-event report template with report data
 */
export function fillReportTemplate(data: TemplateData): string {
  const templatePath = path.join(process.cwd(), 'JAIN_Post_Event_Report_Template.tex');
  return fillLatexTemplate(templatePath, data);
}

/**
 * Convert array to numbered list for LaTeX
 */
export function arrayToLatexList(items: string[]): string {
  return items.map((item) => `\\item ${escapeLatex(item)}`).join('\n');
}

/**
 * Convert schedule array to LaTeX table rows
 */
export function scheduleToLatexTable(
  schedule: Array<{ time: string; activity: string; speaker: string }>
): string {
  return schedule
    .map((s) => `${escapeLatex(s.time)} & ${escapeLatex(s.activity)} & ${escapeLatex(s.speaker)} \\\\`)
    .join('\n');
}

/**
 * Convert budget array to LaTeX table rows
 */
export function budgetToLatexTable(
  budget: Array<{ item: string; amount: string | number }>
): string {
  const rows = budget
    .map((b, i) => `${i + 1} & ${escapeLatex(b.item)} & ${escapeLatex(String(b.amount))} \\\\`)
    .join('\n');

  const total = budget.reduce((sum, b) => {
    const parsed = typeof b.amount === 'number'
      ? b.amount
      : Number.parseFloat(String(b.amount).replace(/[^0-9.-]/g, '')) || 0;
    return sum + parsed;
  }, 0);

  return [
    rows,
    '\\rowcolor{JainFill}',
    `\\multicolumn{2}{>{\\raggedleft\\arraybackslash}p{0.70\\textwidth}}{\\textbf{Total Estimated Budget}} & \\textbf{${escapeLatex(total)}} \\\\`,
  ].join('\n');
}
