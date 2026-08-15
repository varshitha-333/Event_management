import fs from 'fs';
import path, { join } from 'path';
import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import child_process from 'child_process';
import { promisify } from 'util';
import { generateProposalContent, ProposalInput } from '@/lib/ai/proposal-generator';
import { buildProposalLatex } from '@/lib/latex/proposal-latex';
import { getTectonicPath } from '@/lib/latex/tectonic-setup';
import prisma, { withRetry } from '@/lib/prisma';

// Simple hash function for caching (inline to avoid import issues)
function generateContentHash(data: any): string {
  const crypto = require('crypto');
  const str = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

const execAsync = promisify(child_process.exec);

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

    // Fetch all database data in parallel before AI generation with retry logic
    const [event, photos, registrations] = await withRetry(async () => {
      return await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          include: { 
            club: true,
            creator: true
          }
        }) as any,
        (prisma as any).photo.findMany({
          where: { eventId },
          orderBy: { uploadedAt: 'desc' }
        }),
        prisma.registration.findMany({
          where: { eventId }
        })
      ]);
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const normalizedInput: ProposalInput = {
      eventName: formData.eventName || event.title || 'Untitled Event',
      eventType: formData.eventType || event.type?.toLowerCase() || 'Workshop',
      eventTheme: formData.eventTheme || event.theme || 'General',
      proposedDate:
        formData.proposedDate || event.startDate?.toISOString?.().split('T')[0] || '',
      eventTime: formData.eventTime || event.startDate?.toTimeString?.().slice(0, 5) || '09:00',
      venue: formData.venue || event.venue || 'TBD',
      mode: formData.mode || event.mode?.toLowerCase() || 'Offline',
      facultyCoordinator: formData.facultyCoordinator || event.facultyCoordinator || event.creator?.name || 'Faculty Coordinator',
      studentCoordinators: Array.isArray(formData.studentCoordinators) && formData.studentCoordinators.length > 0
        ? formData.studentCoordinators
        : (Array.isArray(event.studentCoordinators) ? event.studentCoordinators : []),
      clubName: formData.clubName || event.club?.name || 'Club / Unit',
      department: formData.department || event.club?.department || 'Department',
      resourcePerson: formData.resourcePerson
        ? {
            name: formData.resourcePerson.name || '',
            designation: formData.resourcePerson.designation || '',
            organization: formData.resourcePerson.organization || '',
            shortBio: formData.resourcePerson.shortBio || '',
          }
        : (event.contactInfo as any)?.resourcePerson
          ? {
              name: (event.contactInfo as any).resourcePerson.name || '',
              designation: (event.contactInfo as any).resourcePerson.designation || '',
              organization: (event.contactInfo as any).resourcePerson.organization || '',
              shortBio: (event.contactInfo as any).resourcePerson.shortBio || '',
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
      registrationsCount: registrations.length
    });
    console.log('[PROPOSAL-CACHE] Generated content hash:', contentHash);
    console.log('[PROPOSAL-CACHE] Hash includes all event fields to detect modifications');

    // Check filesystem cache for existing PDF with same hash
    const cacheDir = path.join(process.cwd(), 'public', 'cache', 'proposals');
    const cacheFile = path.join(cacheDir, `${contentHash}.pdf`);

    if (fs.existsSync(cacheFile)) {
      console.log('[PROPOSAL-CACHE] Cache hit! Returning existing PDF from filesystem');
      const cachedPdf = fs.readFileSync(cacheFile);
      return NextResponse.json({
        success: true,
        cached: true,
        message: 'Proposal retrieved from cache',
        pdfData: cachedPdf.toString('base64')
      });
    }

    console.log('[PROPOSAL-CACHE] Cache miss - event data modified or first generation, regenerating from scratch');

    // Parallel: Load template and generate AI content simultaneously
    const templatePath = 'event_proposal_template.tex';
    
    const [aiContent, templateSource] = await Promise.all([
      generateProposalContent(normalizedInput, templatePath),
      fs.promises.readFile(
        resolveTemplatePath('event_proposal_template.tex'),
        'utf-8'
      )
    ]);

    // Parallel: Prepare directories for LaTeX compilation
    const outputDir = path.join(process.cwd(), 'public', 'proposals');
    const tempDir = path.join(os.tmpdir(), `tectonic-${Date.now()}`);
    
    await Promise.all([
      fs.promises.mkdir(outputDir, { recursive: true }),
      fs.promises.mkdir(tempDir, { recursive: true })
    ]);
    
    console.log('[PROPOSAL-SETUP] Temporary compilation directory:', tempDir);

    // Variables for PDF storage
    let pdfData: Buffer | undefined;
    let pdfMimeType: string | undefined;
    let pdfFilename: string | undefined;
    let pdfUrl: string | undefined;

    // Parallel: Copy Jain logo to temporary compilation directory
    const logoSource = path.join(process.cwd(), 'jain-logo.png');
    const logoDest = path.join(tempDir, 'jain-logo.png');
    console.log('[PROPOSAL-LOGO] Configured logo:', logoSource);
    console.log('[PROPOSAL-LOGO] Destination:', logoDest);
    
    const logoCopyPromise = (async () => {
      try {
        if (fs.existsSync(logoSource)) {
          const logoStats = await fs.promises.stat(logoSource);
          console.log('[PROPOSAL-LOGO] Exists: true');
          console.log('[PROPOSAL-LOGO] File size:', logoStats.size, 'bytes');
          await fs.promises.copyFile(logoSource, logoDest);
          console.log('[PROPOSAL-LOGO] Copied successfully');
        } else {
          console.log('[PROPOSAL-LOGO] Exists: false - logo file not found');
        }
      } catch (logoError) {
        console.log('[PROPOSAL-LOGO] Logo copy failed:', logoError);
      }
    })();

    // Handle QR code - fetch from database first, then fallback to filesystem
    const qrPromise = (async () => {
      let qrBuffer: Buffer | undefined;
      let qrFilename = 'qr-code.png';
      
      console.log('[PROPOSAL-QR] Checking database for QR binary data...');
      console.log('[PROPOSAL-QR] Event.qrCodeData exists:', !!event.qrCodeData);
      console.log('[PROPOSAL-QR] Event.qrCodeMimeType:', event.qrCodeMimeType);
      console.log('[PROPOSAL-QR] Event.qrCodeFilename:', event.qrCodeFilename);
      
      // Priority 1: Fetch QR binary data from database
      if (event.qrCodeData) {
        console.log('[PROPOSAL-QR] Fetching QR from database');
        try {
          qrBuffer = Buffer.from(event.qrCodeData);
          qrFilename = event.qrCodeFilename || 'qr-code.png';
          console.log('[PROPOSAL-QR] QR fetched from database, byte length:', qrBuffer.length);
          console.log('[PROPOSAL-QR] MIME type:', event.qrCodeMimeType);
          
          // Validate buffer is not empty
          if (qrBuffer.length === 0) {
            console.warn('[PROPOSAL-QR] QR buffer is empty, skipping QR code');
            qrBuffer = undefined;
          }
        } catch (bufferError) {
          console.error('[PROPOSAL-QR] Failed to convert QR data to buffer:', bufferError);
          qrBuffer = undefined;
        }
      } 
      // Priority 2: Legacy filesystem path (for backward compatibility)
      else if (event.qrCode || formData.qrCode) {
        const qrCode = event.qrCode || formData.qrCode || null;
        console.log('[PROPOSAL-QR] QR not in database, checking filesystem:', qrCode);
        
        if (qrCode) {
          try {
            // Check if QR is a URL path (from upload endpoint)
            if (qrCode.startsWith('/uploads/qr/')) {
              const sourcePath = join(process.cwd(), 'public', qrCode);
              console.log('[PROPOSAL-QR] Source path:', sourcePath);
              console.log('[PROPOSAL-QR] File exists:', await fs.promises.access(sourcePath).then(() => true).catch(() => false));
              
              try {
                qrBuffer = await fs.promises.readFile(sourcePath);
                qrFilename = path.basename(qrCode);
                console.log('[PROPOSAL-QR] Read from filesystem, byte length:', qrBuffer.length);
                
                // Validate buffer is not empty
                if (qrBuffer.length === 0) {
                  console.warn('[PROPOSAL-QR] QR file is empty, skipping QR code');
                  qrBuffer = undefined;
                }
              } catch {
                console.log('[PROPOSAL-QR] File not found at:', sourcePath);
              }
            } else if (qrCode.startsWith('data:image')) {
              const matches = qrCode.match(/^data:image\/(\w+);base64,(.+)$/);
              if (matches) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                console.log('[PROPOSAL-QR] MIME type:', mimeType);
                qrBuffer = Buffer.from(base64Data, 'base64');
                console.log('[PROPOSAL-QR] Decoded byte length:', qrBuffer.length);
                qrFilename = `qr-code.${mimeType}`;
                
                // Validate buffer is not empty
                if (qrBuffer.length === 0) {
                  console.warn('[PROPOSAL-QR] Decoded QR buffer is empty, skipping QR code');
                  qrBuffer = undefined;
                }
              }
            } else if (qrCode.startsWith('data:')) {
              const matches = qrCode.match(/^data:.*;base64,(.+)$/);
              if (matches) {
                const base64Data = matches[2];
                qrBuffer = Buffer.from(base64Data, 'base64');
                console.log('[PROPOSAL-QR] Decoded byte length:', qrBuffer.length);
                
                // Validate buffer is not empty
                if (qrBuffer.length === 0) {
                  console.warn('[PROPOSAL-QR] Decoded QR buffer is empty, skipping QR code');
                  qrBuffer = undefined;
                }
              }
            } else if (qrCode.match(/^\d+.*\.png$/)) {
              const possiblePaths = [
                join(process.cwd(), 'public', 'uploads', 'qr', qrCode),
                join(process.cwd(), 'public', 'proposals', qrCode),
                join(process.cwd(), qrCode)
              ];
              
              console.log('[PROPOSAL-QR] QR is a filename, checking possible paths...');
              for (const possiblePath of possiblePaths) {
                const exists = await fs.promises.access(possiblePath).then(() => true).catch(() => false);
                console.log('[PROPOSAL-QR] Checking:', possiblePath, 'exists:', exists);
                if (exists) {
                  qrBuffer = await fs.promises.readFile(possiblePath);
                  qrFilename = qrCode;
                  console.log('[PROPOSAL-QR] Found at:', possiblePath, 'byte length:', qrBuffer.length);
                  
                  // Validate buffer is not empty
                  if (qrBuffer.length === 0) {
                    console.warn('[PROPOSAL-QR] QR file is empty, skipping QR code');
                    qrBuffer = undefined;
                  }
                  break;
                }
              }
            } else {
              const exists = await fs.promises.access(qrCode).then(() => true).catch(() => false);
              if (exists) {
                qrBuffer = await fs.promises.readFile(qrCode);
                qrFilename = path.basename(qrCode);
                console.log('[PROPOSAL-QR] Read from file path, byte length:', qrBuffer.length);
                
                // Validate buffer is not empty
                if (qrBuffer.length === 0) {
                  console.warn('[PROPOSAL-QR] QR file is empty, skipping QR code');
                  qrBuffer = undefined;
                }
              } else {
                console.log('[PROPOSAL-QR] File not found at path:', qrCode);
              }
            }
          } catch (qrError) {
            console.error('[PROPOSAL-QR] QR processing failed:', qrError);
            qrBuffer = undefined;
          }
        }
      } else {
        console.log('[PROPOSAL-QR] No QR code data available');
      }
      
      return { buffer: qrBuffer, filename: qrFilename };
    })();

    // Wait for logo copy to complete
    await logoCopyPromise;

    // Write QR buffer to temporary file for LaTeX compilation
    const qrResult = await qrPromise;
    let qrImagePath: string | null = null;
    if (qrResult.buffer) {
      try {
        qrImagePath = join(tempDir, qrResult.filename);
        await fs.promises.writeFile(qrImagePath, qrResult.buffer);
        console.log('[PROPOSAL-QR] Temporary path:', qrImagePath);
        console.log('[PROPOSAL-QR] Exists after write:', await fs.promises.access(qrImagePath).then(() => true).catch(() => false));
        console.log('[PROPOSAL-QR] File size:', qrResult.buffer.length, 'bytes');
        console.log('[PROPOSAL-QR] Filename for LaTeX:', qrResult.filename);
        
        // Verify file was written successfully
        const stats = await fs.promises.stat(qrImagePath);
        if (stats.size === 0) {
          console.error('[PROPOSAL-QR] Temporary QR file is empty after write');
          qrImagePath = null;
        }
      } catch (writeError) {
        console.error('[PROPOSAL-QR] Failed to write QR temporary file:', writeError);
        qrImagePath = null;
      }
    } else {
      console.log('[PROPOSAL-QR] No QR buffer obtained, QR will not be included');
    }

    const latexContent = buildProposalLatex(templateSource, normalizedInput, aiContent, {
      preparedBy: formData.preparedBy || normalizedInput.facultyCoordinator,
      preparedDate: formData.preparedDate || new Date(),
      academicYear: formData.academicYear,
      clubHead: formData.clubHead,
      departmentHead: formData.departmentHead,
      qrCode: qrImagePath || undefined, // Pass full path for now, will extract basename in LaTeX builder
      logoPath: fs.existsSync(logoDest) ? logoDest : undefined
    });

    // Generate PDF using Tectonic
    try {
      const texFilePath = path.join(tempDir, `${eventId}.tex`);
      const pdfFilePath = path.join(tempDir, `${eventId}.pdf`);

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
        
        console.log('[PROPOSAL-TECTONIC] Running Tectonic in directory:', tempDir);
        console.log('[PROPOSAL-TECTONIC] QR file exists in temp dir:', qrImagePath ? fs.existsSync(qrImagePath) : 'N/A');
        console.log('[PROPOSAL-TECTONIC] Logo file exists in temp dir:', fs.existsSync(logoDest));
        
        await execAsync(`"${tectonicPath}" --keep-logs "${texFilePath}"`, {
          cwd: tempDir,
          timeout: 180000, // 3 minute timeout
          env
        });
        
        if (fs.existsSync(pdfFilePath)) {
          // Read PDF buffer for database storage
          const pdfBuffer = fs.readFileSync(pdfFilePath);
          console.log('[PROPOSAL-PDF] PDF generated, byte length:', pdfBuffer.length);
          
          // Store PDF binary data in database
          pdfData = pdfBuffer;
          pdfMimeType = 'application/pdf';
          pdfFilename = `${eventId}.pdf`;

          console.log('[PROPOSAL-PERSIST] storage=postgresql');
          console.log('[PROPOSAL-PERSIST] proposalId=', eventId);
          console.log('[PROPOSAL-PERSIST] pdfBytes=', pdfBuffer.length);
          console.log('[PROPOSAL-PERSIST] stored=true');

          // Save to filesystem cache
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          fs.writeFileSync(cacheFile, pdfBuffer);
          console.log('[PROPOSAL-CACHE] Saved PDF to filesystem cache:', cacheFile);

          // Keep legacy pdfUrl for backward compatibility
          pdfUrl = `/proposals/${eventId}.pdf`;
        } else {
          console.warn('[PROPOSAL-GENERATE] PDF file not found after compilation');
        }
      } catch (tectonicError) {
        console.error('[PROPOSAL-GENERATE] Tectonic compilation error:', tectonicError);
        // Continue without PDF if Tectonic fails
      }

      // Clean up .tex file
      if (fs.existsSync(texFilePath)) {
        fs.unlinkSync(texFilePath);
      }

      // Clean up temporary QR file
      if (qrImagePath && fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath);
        console.log('[PROPOSAL-CLEANUP] Temporary QR file deleted:', qrImagePath);
      }

      // Clean up temporary PDF file - PDF is stored in database only
      if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath);
        console.log('[PROPOSAL-CLEANUP] Temporary PDF file deleted (database is source of truth)');
      }

      // Clean up temporary compilation directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('[PROPOSAL-CLEANUP] Temporary directory deleted:', tempDir);
      } catch (cleanupError) {
        console.log('[PROPOSAL-CLEANUP] Failed to delete temp directory:', cleanupError);
      }
    } catch (pdfError) {
      console.error('[PROPOSAL-GENERATE] PDF generation error:', pdfError);
      // Continue without PDF if generation fails
    }

    // Create or update proposal with retry logic
    const proposal = await withRetry(async () => {
      return await prisma.eventProposal.upsert({
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
          publicityPlan: aiContent.publicityPlan,
          expectedOutcomes: aiContent.expectedOutcomes,
          risksAndMitigation: aiContent.risksAndMitigation,
          eventSchedule: aiContent.eventSchedule,
          aiJson: aiContent as any,
          latexContent,
          pdfUrl,
          pdfData: pdfData || undefined,
          pdfMimeType: pdfMimeType || undefined,
          pdfFilename: pdfFilename || undefined,
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
          publicityPlan: aiContent.publicityPlan,
          expectedOutcomes: aiContent.expectedOutcomes,
          risksAndMitigation: aiContent.risksAndMitigation,
          eventSchedule: aiContent.eventSchedule,
          aiJson: aiContent as any,
          latexContent,
          pdfUrl,
          pdfData: pdfData || undefined,
          pdfMimeType: pdfMimeType || undefined,
          pdfFilename: pdfFilename || undefined,
          generatedAt: new Date(),
        },
      });
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
