import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateReportContent, ReportInput, ProposalData } from '@/lib/ai/report-generator';
import { buildReportLatex } from '@/lib/latex/report-latex';

const prisma = new PrismaClient();

function resolveTemplatePath(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), 'templates', fileName),
    path.join(process.cwd(), 'src', 'templates', fileName),
    path.join(process.cwd(), 'src', 'lib', 'latex', fileName),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Template not found: ${fileName}`);
  }
  return found;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, formData } = body;

    if (!eventId || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId and formData' },
        { status: 400 }
      );
    }

    // Validate event exists and fetch complete event data
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { 
        proposal: true, 
        club: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }) as any;

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch registrations for participant stats (photos excluded to reduce AI context length)
    const registrations = await prisma.registration.findMany({
      where: { eventId }
    });

    let proposalData: ProposalData | undefined;
    if (event.proposal) {
      proposalData = {
        description: event.proposal.description,
        objectives: event.proposal.objectives,
        expectedOutcomes: event.proposal.expectedOutcomes,
      };
    }

    const participantStats = {
      registered: Number(formData.participantStats?.registered || registrations.length),
      attended: Number(formData.participantStats?.attended || formData.actualParticipants || 0),
      male: Number(formData.participantStats?.male || 0),
      female: Number(formData.participantStats?.female || 0),
      others: Number(formData.participantStats?.others || 0),
      certificatesIssued: Number(formData.participantStats?.certificatesIssued || 0),
    };

    const normalizedInput: ReportInput = {
      eventName: formData.eventName || event.title || 'Untitled Event',
      date: formData.date || event.startDate?.toISOString?.().split('T')[0] || '',
      time: formData.time || event.startDate?.toTimeString?.().slice(0, 5) || '09:00',
      venue: formData.venue || event.venue || 'TBD',
      eventType: formData.eventType || event.type?.toLowerCase() || 'Workshop',
      organizer: formData.organizer || event.club?.name || 'Organizer',
      facultyCoordinator: formData.facultyCoordinator || event.creator?.name || 'Faculty Coordinator',
      studentCoordinators: Array.isArray(formData.studentCoordinators)
        ? formData.studentCoordinators
        : [],
      resourcePerson: formData.resourcePerson
        ? {
            name: formData.resourcePerson.name || '',
            designation: formData.resourcePerson.designation || '',
            organization: formData.resourcePerson.organization || '',
          }
        : undefined,
      actualParticipants: Number(formData.actualParticipants || participantStats.attended || 0),
      participantStats,
      budgetUtilized: Array.isArray(formData.budgetUtilized) && formData.budgetUtilized.length > 0
        ? formData.budgetUtilized.map((item: any) => ({
            item: item?.item || '',
            amount: Number(item?.amount || 0),
          }))
        : [],
      links: {
        driveLink: formData.links?.driveLink || '',
        registrationLink: formData.links?.registrationLink || '',
        attendanceLink: formData.links?.attendanceLink || '',
        feedbackLink: formData.links?.feedbackLink || '',
        recordingLink: formData.links?.recordingLink || undefined,
        presentationLink: formData.links?.presentationLink || undefined,
      },
      socialMediaLinks: Array.isArray(formData.socialMediaLinks)
        ? formData.socialMediaLinks.filter(Boolean)
        : [],
      photos: [] // Empty array to satisfy schema, photos not sent to AI to avoid context length errors
    };

    // Generate AI content
    const aiContent = await generateReportContent(normalizedInput, proposalData);

    const templateSource = fs.readFileSync(
      resolveTemplatePath('JAIN_Post_Event_Report_Template.tex'),
      'utf-8'
    );

    const latexContent = buildReportLatex(templateSource, normalizedInput, aiContent, {
      clubName: formData.clubName || event.club?.name,
      department: formData.department || event.club?.department,
      academicYear: formData.academicYear,
      preparedBy: formData.preparedBy || normalizedInput.facultyCoordinator,
      clubHead: formData.clubHead,
      departmentHead: formData.departmentHead,
      contactInformation: formData.contactInformation,
      additionalDocuments: formData.additionalDocuments,
      attachmentNotes: formData.attachmentNotes,
      qrCode: event.qrCode || formData.qrCode || null
    });

    // Create or update report
    const report = await prisma.eventReport.upsert({
      where: { eventId },
      update: {
        status: 'SUBMITTED',
        description: aiContent.description,
        objectives: aiContent.objectives,
        eventProceedings: aiContent.eventProceedings,
        keyHighlights: aiContent.keyHighlights,
        learningOutcomes: aiContent.learningOutcomes,
        feedbackSummary: aiContent.feedbackSummary,
        mediaCoverage: aiContent.mediaCoverage,
        futureRecommendations: aiContent.futureRecommendations,
        conclusion: aiContent.conclusion,
        aiJson: { ...normalizedInput, ...aiContent },
        latexContent,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
      create: {
        eventId,
        status: 'SUBMITTED',
        eventName: normalizedInput.eventName,
        date: new Date(normalizedInput.date),
        time: normalizedInput.time,
        venue: normalizedInput.venue,
        eventType: normalizedInput.eventType,
        organizer: normalizedInput.organizer,
        facultyCoordinator: normalizedInput.facultyCoordinator,
        studentCoordinators: normalizedInput.studentCoordinators,
        resourcePerson: normalizedInput.resourcePerson,
        actualParticipants: normalizedInput.actualParticipants,
        participantStats: normalizedInput.participantStats,
        budgetUtilized: normalizedInput.budgetUtilized,
        links: normalizedInput.links,
        socialMediaLinks: normalizedInput.socialMediaLinks,
        photos: normalizedInput.photos,
        description: aiContent.description,
        objectives: aiContent.objectives,
        eventProceedings: aiContent.eventProceedings,
        keyHighlights: aiContent.keyHighlights,
        learningOutcomes: aiContent.learningOutcomes,
        feedbackSummary: aiContent.feedbackSummary,
        mediaCoverage: aiContent.mediaCoverage,
        futureRecommendations: aiContent.futureRecommendations,
        conclusion: aiContent.conclusion,
        aiJson: { ...normalizedInput, ...aiContent },
        latexContent,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({
      reportId: report.id,
      status: report.status,
      aiContent,
      version: report.version
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
