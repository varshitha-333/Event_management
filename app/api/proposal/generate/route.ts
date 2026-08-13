import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import child_process from 'child_process';
import { promisify } from 'util';
import { generateProposalContentWithRetry, ProposalInput } from '@/lib/ai/proposal-generator';
import { buildProposalLatex } from '@/lib/latex/proposal-latex';
import { getTectonicPath } from '@/lib/latex/tectonic-setup';

const execAsync = promisify(child_process.exec);
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
        club: true,
        creator: true
      }
    }) as any;

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch photos for this event
    const photos = await (prisma as any).photo.findMany({
      where: { eventId },
      orderBy: { uploadedAt: 'desc' }
    });

    // Fetch registrations for participant count
    const registrations = await prisma.registration.findMany({
      where: { eventId }
    });

    const normalizedInput: ProposalInput = {
      eventName: formData.eventName || event.title || 'Untitled Event',
      eventType: formData.eventType || event.type?.toLowerCase() || 'Workshop',
      eventTheme: formData.eventTheme || event.theme || 'General',
      proposedDate:
        formData.proposedDate || event.startDate?.toISOString?.().split('T')[0] || '',
      eventTime: formData.eventTime || event.startDate?.toTimeString?.().slice(0, 5) || '09:00',
      venue: formData.venue || event.venue || 'TBD',
      mode: formData.mode || event.mode?.toLowerCase() || 'Offline',
      facultyCoordinator: formData.facultyCoordinator || event.creator?.name || 'Faculty Coordinator',
      studentCoordinators: Array.isArray(formData.studentCoordinators)
        ? formData.studentCoordinators
        : [],
      clubName: formData.clubName || event.club?.name || 'Club / Unit',
      department: formData.department || event.club?.department || 'Department',
      resourcePerson: formData.resourcePerson
        ? {
            name: formData.resourcePerson.name || '',
            designation: formData.resourcePerson.designation || '',
            organization: formData.resourcePerson.organization || '',
            shortBio: formData.resourcePerson.shortBio || '',
          }
        : undefined,
      expectedParticipants: Number(formData.expectedParticipants || event.maxCapacity || 0),
      budgetItems: Array.isArray(formData.budgetItems) && formData.budgetItems.length > 0
        ? formData.budgetItems.map((item: any) => ({
            item: item?.item || '',
            amount: Number(item?.amount || 0),
          }))
        : [],
      logistics: {
        projector: Boolean(formData.logistics?.projector),
        mic: Boolean(formData.logistics?.mic),
        internet: Boolean(formData.logistics?.internet),
        certificates: Boolean(formData.logistics?.certificates),
        refreshments: Boolean(formData.logistics?.refreshments),
        photography: Boolean(formData.logistics?.photography),
        volunteers: Boolean(formData.logistics?.volunteers),
      },
      registrationLink: formData.registrationLink || undefined,
      brochureLink: formData.brochureLink || undefined,
      actualRegistrations: registrations.length
    };

    // Generate AI content with retry logic
    const templatePath = 'event_proposal_template.tex';
    const aiContent = await generateProposalContentWithRetry(normalizedInput, templatePath);

    const templateSource = fs.readFileSync(
      resolveTemplatePath('event_proposal_template.tex'),
      'utf-8'
    );

    const latexContent = buildProposalLatex(templateSource, normalizedInput, aiContent, {
      preparedBy: formData.preparedBy || normalizedInput.facultyCoordinator,
      preparedDate: formData.preparedDate || new Date(),
      academicYear: formData.academicYear,
      clubHead: formData.clubHead,
      departmentHead: formData.departmentHead,
      qrCode: event.qrCode || formData.qrCode || null
    });

    // Generate PDF using Tectonic
    let pdfUrl: string | null = null;
    try {
      const outputDir = path.join(process.cwd(), 'public', 'proposals');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const texFilePath = path.join(outputDir, `${eventId}.tex`);
      const pdfFilePath = path.join(outputDir, `${eventId}.pdf`);

      // Write LaTeX content to file
      fs.writeFileSync(texFilePath, latexContent);

      // Compile using Tectonic
      try {
        const tectonicPath = await getTectonicPath();
        
        // Set environment variables for Tectonic
        const env = {
          ...process.env,
          FONTCONFIG_PATH: path.join(process.cwd(), 'fonts'),
          FONTCONFIG_FILE: path.join(process.cwd(), 'fonts', 'fonts.conf')
        };
        
        await execAsync(`"${tectonicPath}" --keep-logs "${texFilePath}"`, {
          cwd: outputDir,
          timeout: 180000, // 3 minute timeout
          env
        });
        
        if (fs.existsSync(pdfFilePath)) {
          pdfUrl = `/proposals/${eventId}.pdf`;
          console.log('PDF generated successfully:', pdfUrl);
        } else {
          console.warn('PDF file not found after compilation');
        }
      } catch (tectonicError) {
        console.error('Tectonic compilation error:', tectonicError);
        // Continue without PDF if Tectonic fails
      }

      // Clean up .tex file
      if (fs.existsSync(texFilePath)) {
        fs.unlinkSync(texFilePath);
      }
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Continue without PDF if generation fails
    }

    // Create or update proposal
    const proposal = await prisma.eventProposal.upsert({
      where: { eventId },
      update: {
        status: 'GENERATED',
        eventName: normalizedInput.eventName,
        eventType: normalizedInput.eventType,
        eventTheme: normalizedInput.eventTheme,
        proposedDate: normalizedInput.proposedDate ? new Date(normalizedInput.proposedDate) : new Date(),
        eventTime: normalizedInput.eventTime,
        venue: normalizedInput.venue,
        mode: normalizedInput.mode,
        facultyCoordinator: normalizedInput.facultyCoordinator,
        studentCoordinators: normalizedInput.studentCoordinators,
        clubName: normalizedInput.clubName,
        department: normalizedInput.department,
        resourcePerson: normalizedInput.resourcePerson,
        expectedParticipants: normalizedInput.expectedParticipants,
        budgetItems: normalizedInput.budgetItems,
        logistics: normalizedInput.logistics,
        registrationLink: normalizedInput.registrationLink,
        brochureLink: normalizedInput.brochureLink,
        description: aiContent.description,
        objectives: aiContent.objectives,
        targetAudience: aiContent.targetAudience,
        eventSchedule: aiContent.eventSchedule,
        publicityPlan: aiContent.publicityPlan,
        expectedOutcomes: aiContent.expectedOutcomes,
        risksAndMitigation: aiContent.risksAndMitigation,
        aiJson: { ...normalizedInput, ...aiContent },
        latexContent,
        pdfUrl,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
      create: {
        eventId,
        status: 'GENERATED',
        eventName: normalizedInput.eventName,
        eventType: normalizedInput.eventType,
        eventTheme: normalizedInput.eventTheme,
        proposedDate: normalizedInput.proposedDate ? new Date(normalizedInput.proposedDate) : new Date(),
        eventTime: normalizedInput.eventTime,
        venue: normalizedInput.venue,
        mode: normalizedInput.mode,
        facultyCoordinator: normalizedInput.facultyCoordinator,
        studentCoordinators: normalizedInput.studentCoordinators,
        clubName: normalizedInput.clubName,
        department: normalizedInput.department,
        resourcePerson: normalizedInput.resourcePerson,
        expectedParticipants: normalizedInput.expectedParticipants,
        budgetItems: normalizedInput.budgetItems,
        logistics: normalizedInput.logistics,
        registrationLink: normalizedInput.registrationLink,
        brochureLink: normalizedInput.brochureLink,
        description: aiContent.description,
        objectives: aiContent.objectives,
        targetAudience: aiContent.targetAudience,
        eventSchedule: aiContent.eventSchedule,
        publicityPlan: aiContent.publicityPlan,
        expectedOutcomes: aiContent.expectedOutcomes,
        risksAndMitigation: aiContent.risksAndMitigation,
        aiJson: { 
          ...normalizedInput, 
          ...aiContent,
        },
        latexContent,
        pdfUrl,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({
      proposalId: proposal.id,
      status: proposal.status,
      aiContent,
      pdfUrl: proposal.pdfUrl,
      version: proposal.version
    });

  } catch (error) {
    console.error('Proposal generation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database error occurred while generating proposal', details: error.message },
          { status: 500 }
        );
      }
      if (error.message.includes('AI') || error.message.includes('API')) {
        return NextResponse.json(
          { error: 'AI service error occurred while generating proposal', details: error.message },
          { status: 503 }
        );
      }
      if (error.message.includes('LaTeX') || error.message.includes('template')) {
        return NextResponse.json(
          { error: 'LaTeX template error occurred while generating proposal', details: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
