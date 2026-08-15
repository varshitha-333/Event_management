import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getTectonicPath } from '@/lib/latex/tectonic-setup';
import prisma from '@/lib/prisma';
import { writeFile, unlink, mkdir, readFile, readdir, copyFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Get the next available filename in the Downloads folder.
 * Returns a filename like "proposal1.pdf", "proposal2.pdf", etc.
 */
async function getNextDownloadFilename(): Promise<string> {
  const downloadsDir = join(homedir(), 'Downloads');
  
  try {
    await mkdir(downloadsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }

  const files = await readdir(downloadsDir).catch(() => []);
  const proposalFiles = files.filter(f => f.match(/^proposal\d+\.pdf$/));
  
  // Extract the highest number from existing proposal files
  let maxNum = 0;
  for (const file of proposalFiles) {
    const match = file.match(/^proposal(\d+)\.pdf$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  
  return `proposal${maxNum + 1}.pdf`;
}

/**
 * Validate the generated PDF buffer.
 * Checks that the PDF is valid and has content.
 */
async function validatePdf(pdfBuffer: Buffer): Promise<void> {
  // Check PDF exists and has content
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF validation failed: PDF buffer is empty');
  }

  // Check minimum size (a valid PDF should be at least 1KB)
  if (pdfBuffer.length < 1024) {
    throw new Error(`PDF validation failed: PDF size (${pdfBuffer.length} bytes) is too small`);
  }

  // Check PDF signature (PDF files start with %PDF-)
  const pdfSignature = pdfBuffer.toString('ascii', 0, 5);
  if (pdfSignature !== '%PDF-') {
    throw new Error('PDF validation failed: Invalid PDF signature');
  }

  console.log(`PDF validation passed: ${pdfBuffer.length} bytes`);
}

async function compileLatexToPdf(latexContent: string, eventId: string): Promise<{ buffer: Buffer; filename: string }> {
  try {
    // Create temporary directory for compilation
    const tempDir = join(tmpdir(), `latex-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    console.log('[PROPOSAL-LATEX] Temp directory:', tempDir);

    // Copy logo file to temp directory
    const logoSource = join(process.cwd(), 'jain-logo.png');
    const logoDest = join(tempDir, 'jain-logo.png');
    console.log('[PROPOSAL-LOGO] Configured logo:', logoSource);
    console.log('[PROPOSAL-LOGO] Destination:', logoDest);
    
    try {
      if (fs.existsSync(logoSource)) {
        const logoStats = fs.statSync(logoSource);
        console.log('[PROPOSAL-LOGO] Exists: true');
        console.log('[PROPOSAL-LOGO] File size:', logoStats.size, 'bytes');
        await copyFile(logoSource, logoDest);
        console.log('[PROPOSAL-LOGO] Copied successfully');
      } else {
        console.log('[PROPOSAL-LOGO] Exists: false - logo file not found');
      }
    } catch (logoError) {
      console.log('[PROPOSAL-LOGO] Logo copy failed:', logoError);
    }

    // Check if QR code is referenced in LaTeX and copy it
    // Extract QR filename from LaTeX content (it's in \includegraphics{filename})
    const qrMatch = latexContent.match(/\\includegraphics\[.*?\]\{([^}]+)\}/);
    let qrFilename = null;
    let qrDest = null;
    
    if (qrMatch) {
      qrFilename = qrMatch[1];
      console.log('[PROPOSAL-QR] QR filename extracted from LaTeX:', qrFilename);
    }
    
    if (qrFilename && qrFilename.includes('.png')) {
      // QR file is referenced in LaTeX
      const qrSource = join(process.cwd(), 'public', 'proposals', qrFilename);
      qrDest = join(tempDir, qrFilename);
      
      console.log('[PROPOSAL-QR] Looking for QR at:', qrSource);
      console.log('[PROPOSAL-QR] File exists:', fs.existsSync(qrSource));
      
      if (fs.existsSync(qrSource)) {
        try {
          await copyFile(qrSource, qrDest);
          console.log('[PROPOSAL-QR] QR code copied to temp directory');
        } catch (qrError) {
          console.log('[PROPOSAL-QR] QR copy failed:', qrError);
        }
      } else {
        console.log('[PROPOSAL-QR] QR source file not found, trying uploads directory');
        // Try to find it in uploads/qr directory
        const qrUploadSource = join(process.cwd(), 'public', 'uploads', 'qr', qrFilename);
        console.log('[PROPOSAL-QR] Checking uploads path:', qrUploadSource);
        
        if (fs.existsSync(qrUploadSource)) {
          try {
            await copyFile(qrUploadSource, qrDest);
            console.log('[PROPOSAL-QR] QR code copied from uploads directory');
          } catch (qrError) {
            console.log('[PROPOSAL-QR] QR copy from uploads failed:', qrError);
          }
        }
      }
    } else {
      console.log('[PROPOSAL-QR] No QR filename found in LaTeX content');
    }

    // Write LaTeX file
    const texFile = join(tempDir, 'document.tex');
    await writeFile(texFile, latexContent, 'utf-8');
    console.log('[PROPOSAL-LATEX] LaTeX file written:', texFile);

    // Use Tectonic for compilation
    const tectonicPath = process.env.TECTONIC_PATH || 'D:\\event_folde\\Event_management\\tectonic.exe';
    const pdfFile = join(tempDir, 'document.pdf');
    
    console.log('[PROPOSAL-TECTONIC] Starting compilation...');
    console.log('[PROPOSAL-TECTONIC] Tectonic path:', tectonicPath);
    console.log('[PROPOSAL-TECTONIC] Input file:', texFile);
    console.log('[PROPOSAL-TECTONIC] Output dir:', tempDir);
    
    const startTime = Date.now();
    
    // Set environment variables for Tectonic
    const env = {
      ...process.env,
      FONTCONFIG_PATH: join(process.cwd(), 'fonts'),
      FONTCONFIG_FILE: join(process.cwd(), 'fonts', 'fonts.conf')
    };
    
    const { stdout, stderr } = await execAsync(`"${tectonicPath}" --keep-logs "${texFile}"`, {
      cwd: tempDir,
      timeout: 180000, // 3 minute timeout
      env
    });
    
    const compileTime = Date.now() - startTime;
    console.log(`[PROPOSAL-TECTONIC] Compilation completed in ${compileTime}ms`);
    console.log('[PROPOSAL-TECTONIC] stdout:', stdout);
    if (stderr) console.log('[PROPOSAL-TECTONIC] stderr:', stderr);

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);
    console.log('[PROPOSAL-PDF] PDF buffer size:', pdfBuffer.length, 'bytes');

    // Validate the generated PDF
    await validatePdf(pdfBuffer);

    // Get next available filename in Downloads folder
    const filename = await getNextDownloadFilename();
    const downloadsDir = join(homedir(), 'Downloads');
    const outputPath = join(downloadsDir, filename);
    
    // Save PDF to Downloads folder
    await writeFile(outputPath, pdfBuffer);
    console.log('[PROPOSAL-PDF] PDF saved to Downloads:', outputPath);

    // Verify the saved file and return the verified buffer
    const savedBuffer = await readFile(outputPath);
    console.log('[PROPOSAL-PDF] Verified saved PDF size:', savedBuffer.length, 'bytes');

    // Cleanup temp files
    await unlink(texFile).catch(() => {});
    await unlink(pdfFile).catch(() => {});
    await unlink(logoDest).catch(() => {});
    if (qrDest) await unlink(qrDest).catch(() => {});
    console.log('[PROPOSAL-CLEANUP] Temp files cleaned up');

    // Return the verified buffer from the saved file
    return { buffer: savedBuffer, filename };
  } catch (error) {
    console.error('[PROPOSAL-ERROR] LaTeX compilation error:', error);
    throw new Error('LaTeX compilation failed');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    console.log(`[PROPOSAL-DOWNLOAD] eventId=${eventId}`);

    const proposal = await prisma.eventProposal.findUnique({
      where: { eventId }
    });

    if (!proposal) {
      console.log(`[PROPOSAL-DOWNLOAD] Proposal not found for eventId=${eventId}`);
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    console.log(`[PROPOSAL-DOWNLOAD] proposalId=${proposal.id}, status=${proposal.status}`);

    // Priority 1: Fetch PDF binary data from database
    if (proposal.pdfData) {
      console.log('[PROPOSAL-DOWNLOAD] source=DATABASE');
      console.log('[PROPOSAL-DOWNLOAD] proposalId=', proposal.id);
      console.log('[PROPOSAL-DOWNLOAD] pdfBytes=', proposal.pdfData.length);
      console.log('[PROPOSAL-DOWNLOAD] generationSkipped=true');
      
      const pdfBuffer = Buffer.from(proposal.pdfData);
      
      // Validate PDF
      await validatePdf(pdfBuffer);
      
      // Get next available filename in Downloads folder
      const filename = await getNextDownloadFilename();
      
      // Save PDF to Downloads folder
      const downloadsDir = join(homedir(), 'Downloads');
      const outputPath = join(downloadsDir, filename);
      await writeFile(outputPath, pdfBuffer);
      console.log(`[PROPOSAL-DOWNLOAD] PDF saved to Downloads: ${outputPath}`);
      
      // Return the PDF from database
      const response = new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache'
        }
      });
      
      return response;
    }

    // Priority 2: Legacy filesystem path (for backward compatibility)
    if (proposal.pdfUrl) {
      const pdfPath = path.join(process.cwd(), 'public', proposal.pdfUrl);
      console.log(`[PROPOSAL-DOWNLOAD] PDF not in database, checking filesystem: ${pdfPath}`);
      
      try {
        const pdfBuffer = await readFile(pdfPath);
        await validatePdf(pdfBuffer);
        
        console.log(`[PROPOSAL-DOWNLOAD] Filesystem PDF found and valid (${pdfBuffer.length} bytes)`);
        console.log(`[PROPOSAL-DOWNLOAD] generationSkipped=true, aiSkipped=true, tectonicSkipped=true`);
        
        // Get next available filename in Downloads folder
        const filename = await getNextDownloadFilename();
        
        // Save PDF to Downloads folder
        const downloadsDir = join(homedir(), 'Downloads');
        const outputPath = join(downloadsDir, filename);
        await writeFile(outputPath, pdfBuffer);
        console.log(`[PROPOSAL-DOWNLOAD] PDF saved to Downloads: ${outputPath}`);
        
        // Return the stored PDF
        const response = new NextResponse(Buffer.from(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length.toString(),
            'Cache-Control': 'no-cache'
          }
        });
        
        return response;
      } catch (pdfError) {
        console.log(`[PROPOSAL-DOWNLOAD] Filesystem PDF not accessible, falling back to recompilation: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
    }

    // Fallback: Recompile from LaTeX if PDF is not available
    console.log(`[PROPOSAL-DOWNLOAD] No stored PDF available, recompiling from LaTeX`);
    
    const latexContent = proposal.latexContent;
    if (!latexContent) {
      return NextResponse.json(
        { error: 'LaTeX content not found in proposal' },
        { status: 400 }
      );
    }

    // Compile LaTeX to PDF using Tectonic
    let pdfResult: { buffer: Buffer; filename: string };
    try {
      pdfResult = await compileLatexToPdf(latexContent, eventId);
      console.log(`[PROPOSAL-DOWNLOAD] PDF compilation successful. Returning buffer of size: ${pdfResult.buffer.length} bytes`);
    } catch (compileError) {
      console.error('LaTeX compilation error:', compileError);
      // Fallback: return LaTeX source as .tex file for manual compilation
      const texBuffer = Buffer.from(latexContent, 'utf-8');
      return new NextResponse(texBuffer as any, {
        headers: {
          'Content-Type': 'application/x-tex',
          'Content-Disposition': `attachment; filename="proposal-${eventId}.tex"`
        }
      });
    }

    // Create response with the compiled buffer
    const response = new NextResponse(Buffer.from(pdfResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfResult.filename}"`,
        'Content-Length': pdfResult.buffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
    
    return response;

  } catch (error) {
    console.error('Proposal download error:', error);
    return NextResponse.json(
      { error: 'Failed to download proposal' },
      { status: 500 }
    );
  }
}
