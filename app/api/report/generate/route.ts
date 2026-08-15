import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { generateReportContent, ReportInput, ProposalData } from '@/lib/ai/report-generator';
import { buildReportLatex } from '@/lib/latex/report-latex';
import prisma, { withRetry } from '@/lib/prisma';

// Simple hash function for caching
function generateContentHash(data: any): string {
  const crypto = require('crypto');
  const str = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

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
  const startTime = Date.now();
  console.log('[PERF] Report generation START');
  
  try {
    const body = await request.json();
    const { eventId, formData, selectedPhotoIds } = body;

    if (!eventId || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId and formData' },
        { status: 400 }
      );
    }

    // Fetch all required data in parallel to reduce total time
    const dbFetchStart = Date.now();
    
    const [event, photos, registrations] = await Promise.all([
      // Event query - fetch all fields needed for report and hash generation
      withRetry(() => prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          venue: true,
          type: true,
          theme: true,
          mode: true,
          maxCapacity: true,
          currentCapacity: true,
          budget: true,
          actualCost: true,
          status: true,
          approvalStatus: true,
          tags: true,
          qrCode: true,
          qrCodeData: true,
          qrCodeMimeType: true,
          qrCodeFilename: true,
          facultyCoordinator: true,
          facultyIncharge: true,
          studentCoordinators: true,
          contactInfo: true,
          proposal: {
            select: {
              description: true,
              objectives: true,
              expectedOutcomes: true,
            }
          },
          club: {
            select: {
              name: true,
              department: true,
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })),
      // Photo query - only fetch fields needed for report
      withRetry(() => prisma.photo.findMany({
        where: { eventId },
        select: {
          id: true,
          url: true,
          caption: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: 'desc' }
      })),
      // Registration query - only count if stats not provided
      withRetry(() => prisma.registration.findMany({
        where: { eventId },
        select: {
          id: true
        }
      }))
    ]);

    const dbFetchEnd = Date.now();
    console.log(`[PERF] Database fetch (parallel): ${dbFetchEnd - dbFetchStart} ms`);
    console.log(`[REPORT-DB] Event fetched: ${!!event}`);
    console.log(`[REPORT-DB] Photos fetched: ${photos.length}`);
    console.log(`[REPORT-DB] Registrations fetched: ${registrations.length}`);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Filter photos if specific IDs were selected
    let filteredPhotos = photos;
    if (selectedPhotoIds && Array.isArray(selectedPhotoIds) && selectedPhotoIds.length > 0) {
      filteredPhotos = photos.filter((photo) => selectedPhotoIds.includes(photo.id));
      console.log(`[REPORT-GENERATE] Filtered to ${filteredPhotos.length} selected photos out of ${photos.length} total`);
    }

    console.log(`[REPORT-GENERATE] Using ${filteredPhotos.length} photos for event ${eventId}`);

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
      facultyCoordinator: formData.facultyCoordinator || event.facultyCoordinator || event.creator?.name || 'Faculty Coordinator',
      studentCoordinators: Array.isArray(formData.studentCoordinators) && formData.studentCoordinators.length > 0
        ? formData.studentCoordinators
        : Array.isArray(event.studentCoordinators) && event.studentCoordinators.length > 0
        ? event.studentCoordinators
        : ['Student Coordinator 1', 'Student Coordinator 2'],
      resourcePerson: formData.resourcePerson
        ? {
            name: formData.resourcePerson.name || 'Guest Speaker',
            designation: formData.resourcePerson.designation || 'Industry Expert',
            organization: formData.resourcePerson.organization || 'External Organization',
          }
        : (event.contactInfo as any)?.resourcePerson
        ? {
            name: (event.contactInfo as any).resourcePerson.name || 'Guest Speaker',
            designation: (event.contactInfo as any).resourcePerson.designation || 'Industry Expert',
            organization: (event.contactInfo as any).resourcePerson.organization || 'External Organization',
          }
        : {
            name: 'Guest Speaker',
            designation: 'Industry Expert',
            organization: 'External Organization',
          },
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

    // Generate content hash for caching - includes all relevant event fields
    const contentHash = generateContentHash({
      eventId: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      theme: event.theme,
      startDate: event.startDate?.toISOString(),
      endDate: event.endDate?.toISOString(),
      venue: event.venue,
      mode: event.mode,
      maxCapacity: event.maxCapacity,
      currentCapacity: event.currentCapacity,
      budget: event.budget?.toString(),
      actualCost: event.actualCost?.toString(),
      status: event.status,
      approvalStatus: event.approvalStatus,
      tags: event.tags,
      facultyCoordinator: event.facultyCoordinator,
      facultyIncharge: event.facultyIncharge,
      studentCoordinators: event.studentCoordinators,
      contactInfo: event.contactInfo,
      normalizedInput,
      photosCount: photos.length,
      photosTimestamps: photos.map(p => p.uploadedAt?.toISOString()).sort(),
      registrationsCount: registrations.length
    });
    console.log('[REPORT-CACHE] Generated content hash:', contentHash);
    console.log('[REPORT-CACHE] Hash includes all event fields to detect modifications');

    // Check filesystem cache for existing PDF with same hash
    const cacheDir = path.join(process.cwd(), 'public', 'cache', 'reports');
    const cacheFile = path.join(cacheDir, `${contentHash}.pdf`);

    if (fs.existsSync(cacheFile)) {
      console.log('[REPORT-CACHE] Cache hit! Returning existing PDF from filesystem');
      const cachedPdf = fs.readFileSync(cacheFile);
      return NextResponse.json({
        success: true,
        cached: true,
        message: 'Report retrieved from cache',
        pdfData: cachedPdf.toString('base64')
      });
    }

    console.log('[REPORT-CACHE] Cache miss - event data modified or first generation, regenerating from scratch');

    // Parallel: Load template and generate AI content simultaneously
    const aiGenStart = Date.now();
    const templateLoadStart = Date.now();
    
    const [aiContent, templateSource] = await Promise.all([
      generateReportContent(normalizedInput, proposalData),
      fs.promises.readFile(
        resolveTemplatePath('JAIN_Post_Event_Report_Template.tex'),
        'utf-8'
      )
    ]);
    
    const aiGenEnd = Date.now();
    const templateLoadEnd = Date.now();
    console.log(`[PERF] AI generation: ${aiGenEnd - aiGenStart} ms`);
    console.log(`[PERF] Template load: ${templateLoadEnd - templateLoadStart} ms`);

    const latexGenStart = Date.now();
    // Process QR code - fetch from database and prepare for LaTeX compilation
    let qrBuffer: Buffer | undefined;
    let qrFilename = 'qr-code.png';
    let qrImagePath: string | null = null;
    
    console.log('[REPORT-QR] Checking database for QR binary data...');
    console.log('[REPORT-QR] Event.qrCodeData exists:', !!event.qrCodeData);
    console.log('[REPORT-QR] Event.qrCode:', event.qrCode);
    
    if (event.qrCodeData) {
      console.log('[REPORT-QR] Fetching QR from database');
      try {
        qrBuffer = Buffer.from(event.qrCodeData);
        qrFilename = event.qrCodeFilename || 'qr-code.png';
        console.log('[REPORT-QR] QR fetched from database, byte length:', qrBuffer.length);
        console.log('[REPORT-QR] MIME type:', event.qrCodeMimeType);
        console.log('[REPORT-QR] QR filename:', qrFilename);
        
        if (qrBuffer.length === 0) {
          console.warn('[REPORT-QR] QR buffer is empty, skipping QR code');
          qrBuffer = undefined;
        }
      } catch (bufferError) {
        console.error('[REPORT-QR] Failed to convert QR data to buffer:', bufferError);
        qrBuffer = undefined;
      }
    } else if (event.qrCode) {
      const qrCode = event.qrCode;
      console.log('[REPORT-QR] QR not in database, checking filesystem:', qrCode);
      
      if (qrCode.startsWith('/uploads/qr/')) {
        try {
          const sourcePath = path.join(process.cwd(), 'public', qrCode);
          console.log('[REPORT-QR] Source path:', sourcePath);
          
          if (fs.existsSync(sourcePath)) {
            qrBuffer = fs.readFileSync(sourcePath);
            qrFilename = path.basename(qrCode);
            console.log('[REPORT-QR] Read from filesystem, byte length:', qrBuffer.length);
            
            if (qrBuffer.length === 0) {
              console.warn('[REPORT-QR] QR file is empty, skipping QR code');
              qrBuffer = undefined;
            }
          } else {
            console.log('[REPORT-QR] File not found at:', sourcePath);
          }
        } catch (qrError) {
          console.error('[REPORT-QR] QR processing failed:', qrError);
          qrBuffer = undefined;
        }
      }
    } else {
      console.log('[REPORT-QR] No QR code data available');
    }
    
    console.log('[REPORT-LATEX] QR filename for LaTeX:', qrFilename);
    
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
      qrCode: qrFilename || undefined
    });
    const latexGenEnd = Date.now();
    console.log(`[PERF] LaTeX generation: ${latexGenEnd - latexGenStart} ms`);

    // Update photos in normalizedInput to include uploaded photos
    normalizedInput.photos = filteredPhotos.map((p: any) => ({
      url: p.url,
      caption: p.caption || ''
    }));

    // Parallel: Database write and cache directory creation
    const dbWriteStart = Date.now();
    const cacheDirStart = Date.now();
    
    const [report] = await Promise.all([
      withRetry(() => prisma.eventReport.upsert({
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
      })),
      fs.promises.mkdir(cacheDir, { recursive: true })
    ]);
    
    const dbWriteEnd = Date.now();
    const cacheDirEnd = Date.now();
    console.log(`[PERF] Database write: ${dbWriteEnd - dbWriteStart} ms`);
    console.log(`[PERF] Cache dir creation: ${cacheDirEnd - cacheDirStart} ms`);

    // Save report content to filesystem cache
    const cacheContent = {
      reportId: report.id,
      aiContent,
      normalizedInput,
      generatedAt: new Date().toISOString()
    };
    await fs.promises.writeFile(cacheFile.replace('.pdf', '.json'), JSON.stringify(cacheContent));
    console.log('[REPORT-CACHE] Saved report content to filesystem cache:', cacheFile.replace('.pdf', '.json'));

    const totalEnd = Date.now();
    console.log(`[PERF] TOTAL: ${totalEnd - startTime} ms (${((totalEnd - startTime) / 1000).toFixed(2)} seconds)`);

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
