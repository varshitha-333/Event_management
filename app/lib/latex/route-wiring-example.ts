// app/api/proposal/generate/route.ts
// ---------------------------------------------------------------
// This replaces the earlier `latexContent: ''` placeholder fix with the
// real thing: load the template once, fill it with formData + aiContent,
// and store the rendered .tex source in latexContent.
//
// Only the pieces relevant to the latexContent fix are shown — keep the
// rest of your existing route (auth, validation, error handling) as-is.

import fs from 'fs';
import path from 'path';
import { buildProposalLatex } from '@/lib/proposal-latex';

// Read once per cold start rather than on every request.
const PROPOSAL_TEMPLATE = fs.readFileSync(
  path.join(process.cwd(), 'templates', 'event_proposal_template.tex'),
  'utf-8'
);

// ...inside your POST handler, after aiContent has been generated...
//
// const aiContent = await generateProposalContent(formData);

const latexContent = buildProposalLatex(PROPOSAL_TEMPLATE, formData, aiContent, {
  // Optional — fill in whatever you have on hand; anything omitted just
  // stays as a visible {{TOKEN}} in the compiled PDF for manual completion.
  // preparedBy: formData.facultyCoordinator,
  // clubHead: '...',
  // departmentHead: '...',
});

const proposal = await prisma.eventProposal.upsert({
  where: { eventId },
  update: {
    status: 'GENERATED',
    ...formData,
    description: aiContent.description,
    objectives: aiContent.objectives,
    targetAudience: aiContent.targetAudience,
    eventSchedule: aiContent.eventSchedule,
    publicityPlan: aiContent.publicityPlan,
    expectedOutcomes: aiContent.expectedOutcomes,
    risksAndMitigation: aiContent.risksAndMitigation,
    aiJson: { ...formData, ...aiContent },
    latexContent, // <-- real rendered LaTeX instead of ''
    generatedAt: new Date(),
    version: { increment: 1 },
  },
  create: {
    eventId,
    status: 'GENERATED',
    ...formData,
    description: aiContent.description,
    objectives: aiContent.objectives,
    targetAudience: aiContent.targetAudience,
    eventSchedule: aiContent.eventSchedule,
    publicityPlan: aiContent.publicityPlan,
    expectedOutcomes: aiContent.expectedOutcomes,
    risksAndMitigation: aiContent.risksAndMitigation,
    aiJson: { ...formData, ...aiContent },
    latexContent, // <-- real rendered LaTeX instead of ''
    generatedAt: new Date(),
  },
});

// The equivalent for app/api/report/generate/route.ts:
//
// import { buildReportLatex } from '@/lib/report-latex';
// const REPORT_TEMPLATE = fs.readFileSync(
//   path.join(process.cwd(), 'templates', 'JAIN_Post_Event_Report_Template.tex'),
//   'utf-8'
// );
// const latexContent = buildReportLatex(REPORT_TEMPLATE, formData, aiContent, {
//   clubName: '...',
//   department: '...',
// });
