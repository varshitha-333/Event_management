import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir, readFile, readdir, copyFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { getTectonicPath } from '@/lib/latex/tectonic-setup';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

/**
 * Get the next available filename in the Downloads folder.
 * Returns a filename like "report1.pdf", "report2.pdf", etc.
 */
async function getNextDownloadFilename(): Promise<string> {
  const downloadsDir = join(homedir(), 'Downloads');
  
  try {
    await mkdir(downloadsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }

  const files = await readdir(downloadsDir).catch(() => []);
  const reportFiles = files.filter(f => f.match(/^report\d+\.pdf$/));
  
  // Extract the highest number from existing report files
  let maxNum = 0;
  for (const file of reportFiles) {
    const match = file.match(/^report(\d+)\.pdf$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  
  return `report${maxNum + 1}.pdf`;
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

async function compileLatexToPdf(latexContent: string): Promise<{ buffer: Buffer; filename: string }> {
  try {
    // Create temporary directory for compilation
    const tempDir = join(tmpdir(), `latex-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Copy logo file to temp directory if it exists
    const logoSource = 'D:\\event_folde\\Event_management\\jain-logo.png';
    const logoDest = join(tempDir, 'jain-logo.png');
    try {
      await copyFile(logoSource, logoDest);
      console.log('Logo file copied to temp directory');
    } catch (logoError) {
      console.log('Logo file not found or could not be copied, compilation will use fallback');
    }

    // Sanitize LaTeX content - split very long lines to avoid buffer overflow
    const sanitizedContent = latexContent.split('\n').map(line => {
      // If a line is longer than 10000 characters, split it
      if (line.length > 10000) {
        return line.match(/.{1,10000}/g)?.join('\n') || line;
      }
      return line;
    }).join('\n');

    // Write LaTeX file
    const texFile = join(tempDir, 'document.tex');
    await writeFile(texFile, sanitizedContent, 'utf-8');

    // Use Tectonic for compilation
    const tectonicPath = await getTectonicPath();
    const pdfFile = join(tempDir, 'document.pdf');
    
    // Use Tectonic compilation options with proper environment
    console.log('Starting Tectonic compilation...');
    console.log(`Tectonic path: ${tectonicPath}`);
    console.log(`Input file: ${texFile}`);
    console.log(`Output dir: ${tempDir}`);
    
    const startTime = Date.now();
    
    // Set environment variables for Tectonic
    const env = {
      ...process.env,
      FONTCONFIG_PATH: join(process.cwd(), 'fonts'),
      FONTCONFIG_FILE: join(process.cwd(), 'fonts', 'fonts.conf')
    };
    
    // Change to temp directory and run tectonic with correct syntax
    const { stdout, stderr } = await execAsync(`"${tectonicPath}" --keep-logs "${texFile}"`, {
      cwd: tempDir,
      timeout: 180000, // 3 minute timeout
      env
    });
    
    const compileTime = Date.now() - startTime;
    console.log(`Tectonic compilation completed in ${compileTime}ms`);
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);

    // Validate the generated PDF
    await validatePdf(pdfBuffer);

    // Get next available filename in Downloads folder
    const filename = await getNextDownloadFilename();
    const downloadsDir = join(homedir(), 'Downloads');
    const outputPath = join(downloadsDir, filename);
    
    // Save PDF to Downloads folder
    await writeFile(outputPath, pdfBuffer);
    console.log(`PDF saved to Downloads folder: ${outputPath}`);
    console.log(`PDF size in Downloads: ${pdfBuffer.length} bytes`);

    // Verify the saved file and return the verified buffer
    const savedBuffer = await readFile(outputPath);
    console.log(`Verified saved PDF size: ${savedBuffer.length} bytes`);
    console.log(`PDF signature check: ${savedBuffer.toString('ascii', 0, 5)}`);

    // Cleanup temp files
    await unlink(texFile).catch(() => {});
    await unlink(pdfFile).catch(() => {});
    await unlink(logoDest).catch(() => {});

    // Return the verified buffer from the saved file
    return { buffer: savedBuffer, filename };
  } catch (error) {
    console.error('Local LaTeX compilation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Local LaTeX compilation failed');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const report = await prisma.eventReport.findUnique({
      where: { eventId }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Use the stored LaTeX content from the database
    const latexContent = report.latexContent;
    if (!latexContent) {
      return NextResponse.json(
        { error: 'LaTeX content not found in report' },
        { status: 400 }
      );
    }

    // Compile LaTeX to PDF using Tectonic
    let pdfResult: { buffer: Buffer; filename: string };
    try {
      pdfResult = await compileLatexToPdf(latexContent);
      console.log(`PDF compilation successful. Returning buffer of size: ${pdfResult.buffer.length} bytes`);
      console.log(`Filename for download: ${pdfResult.filename}`);
    } catch (compileError) {
      console.error('LaTeX compilation error:', compileError);
      // Fallback: return LaTeX source as .tex file for manual compilation
      const texBuffer = Buffer.from(latexContent, 'utf-8');
      return new NextResponse(texBuffer as any, {
        headers: {
          'Content-Type': 'application/x-tex',
          'Content-Disposition': `attachment; filename="report-${eventId}.tex"`
        }
      });
    }

    // Create response with the verified buffer
    const response = new NextResponse(Buffer.from(pdfResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfResult.filename}"`,
        'Content-Length': pdfResult.buffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log(`Response headers: Content-Type=${response.headers.get('Content-Type')}, Content-Disposition=${response.headers.get('Content-Disposition')}, Content-Length=${response.headers.get('Content-Length')}`);
    console.log(`Response body size: ${pdfResult.buffer.length} bytes`);
    console.log(`Buffer type: ${pdfResult.buffer.constructor.name}`);
    
    return response;

  } catch (error) {
    console.error('Report download error:', error);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}
