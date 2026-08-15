import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir, readFile, readdir, copyFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { getTectonicPath } from '@/lib/latex/tectonic-setup';
import prisma from '@/lib/prisma';

const execAsync = promisify(exec);

/**
 * Generate dynamic LaTeX photo gallery section with unlimited photos.
 * Uses actual \includegraphics commands instead of text placeholders.
 * Implements responsive layout with aspect ratio preservation.
 */
function generatePhotoGalleryLatex(copiedImages: string[], photos: any[]): string {
  console.log(`[PHOTO-GALLERY] Generating gallery with ${copiedImages.length} images`);
  
  if (copiedImages.length === 0) {
    // No photos available - simple message
    return '\\begin{center}\n\\textbf{No photos available for this event}\n\\end{center}\n\n\\vspace{0.6cm}\n\n\\SectionBox{\n\\textbf{Captions}\\\\\n\\InfoRow{Photo 1 Caption}{}\n\\InfoRow{Photo 2 Caption}{}\n\\InfoRow{Photo 3 Caption}{}\n\\InfoRow{Photo 4 Caption}{}\n\\InfoRow{Photo 5 Caption}{}\n\\InfoRow{Photo 6 Caption}{}\n}\n';
  }

  // Generate photo grid with flexible layout
  let galleryLatex = '';
  
  galleryLatex += '\\begin{center}\n';
  
  // Determine optimal columns based on image count
  let columns = 3;
  if (copiedImages.length === 1) columns = 1;
  else if (copiedImages.length === 2) columns = 2;
  else if (copiedImages.length >= 4) columns = 3;
  
  console.log(`[PHOTO-GALLERY] Using ${columns} columns for ${copiedImages.length} images`);
  
  // Create column specification for tabular
  const columnSpec = Array(columns).fill('c').join('');
  galleryLatex += `\\begin{tabular}{${columnSpec}}\n`;
  
  for (let i = 0; i < copiedImages.length; i++) {
    const filename = copiedImages[i];
    const photo = photos[i];
    const caption = photo?.caption || '';
    
    // Calculate appropriate width based on column count - fit within page boundaries
    const maxWidth = columns === 1 ? '14cm' : columns === 2 ? '6.5cm' : '4.2cm';
    
    // Include image with aspect ratio preservation
    galleryLatex += `\\includegraphics[width=${maxWidth},keepaspectratio]{${filename}}`;
    
    // Add column separator or end row
    if ((i + 1) % columns === 0) {
      galleryLatex += ' \\\\\n';
    } else if (i === copiedImages.length - 1) {
      // End of last row - fill remaining columns
      const remainingInRow = columns - (copiedImages.length % columns);
      if (remainingInRow < columns) {
        for (let j = 0; j < remainingInRow; j++) {
          galleryLatex += ' & ';
        }
      }
      galleryLatex += ' \\\\\n';
    } else {
      galleryLatex += ' & ';
    }
  }
  
  galleryLatex += '\\end{tabular}\n\\end{center}\n';
  
  // Skip captions section to avoid LaTeX syntax errors
  // galleryLatex += '\\vspace{0.6cm}\n\n\\SectionBox{\n\\textbf{Captions}\\\\\n';
  // for (let i = 0; i < 6; i++) {
  //   galleryLatex += `\\InfoRow{Photo ${i + 1} Caption}{}\n`;
  // }
  // galleryLatex += '}\n';
  
  console.log(`[PHOTO-GALLERY] Generated LaTeX for ${copiedImages.length} photos`);
  return galleryLatex;
}

/**
 * Copy image files from public uploads to temp directory for LaTeX compilation.
 * Returns array of successfully copied image filenames.
 */
export async function copyImagesToTempDir(photos: any[], tempDir: string): Promise<string[]> {
  const copiedImages: string[] = [];
  
  console.log('[PHOTO-PIPELINE] copyImagesToTempDir called');
  console.log('[PHOTO-PIPELINE] Input photo count:', photos.length);
  console.log('[PHOTO-PIPELINE] Temp directory:', tempDir);
  
  if (photos.length === 0) {
    console.log('[PHOTO-PIPELINE] WARNING: No photos provided to copyImagesToTempDir');
    return [];
  }
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    console.log(`[PHOTO-PIPELINE] Processing photo ${i + 1}/${photos.length}:`);
    console.log(`[PHOTO-PIPELINE]   Photo ID: ${photo.id}`);
    console.log(`[PHOTO-PIPELINE]   Photo URL: ${photo.url?.substring(0, 50)}...`);
    console.log(`[PHOTO-PIPELINE]   Photo caption: ${photo.caption}`);
    
    if (!photo.url) {
      console.log(`[PHOTO-PIPELINE]   ERROR: Photo has no URL`);
      continue;
    }
    
    try {
      let filename: string;
      let sourceBuffer: Buffer;
      
      // Check if URL is base64 data URL
      if (photo.url.startsWith('data:')) {
        console.log(`[PHOTO-PIPELINE]   Detected base64 data URL`);
        
        // Parse base64 data URL: data:image/png;base64,iVBORw0KGgo...
        const matches = photo.url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
          console.log(`[PHOTO-PIPELINE]   ERROR: Invalid base64 data URL format`);
          continue;
        }
        
        const mimeType = matches[1]; // e.g., image/png
        const base64Data = matches[2];
        console.log(`[PHOTO-PIPELINE]   MIME type: ${mimeType}`);
        
        // Decode base64 to buffer
        sourceBuffer = Buffer.from(base64Data, 'base64');
        console.log(`[PHOTO-PIPELINE]   Decoded buffer size: ${sourceBuffer.length} bytes`);
        
        // Generate filename based on MIME type
        const extension = mimeType.split('/')[1]; // e.g., png, jpeg
        filename = `photo-${photo.id}.${extension}`;
      } else {
        // Regular file path URL
        console.log(`[PHOTO-PIPELINE]   Detected regular file path URL`);
        
        // Extract filename from URL (e.g., /uploads/photo/12345.jpg -> 12345.jpg)
        const urlParts = photo.url.split('/');
        filename = urlParts[urlParts.length - 1];
        console.log(`[PHOTO-PIPELINE]   Extracted filename: ${filename}`);
        
        // Source path in public directory
        const sourcePath = join(process.cwd(), 'public', photo.url.replace(/^\//, ''));
        console.log(`[PHOTO-PIPELINE]   Source path: ${sourcePath}`);
        
        // Check if source file exists
        try {
          await access(sourcePath);
          console.log(`[PHOTO-PIPELINE]   Source file EXISTS`);
        } catch (accessError) {
          console.log(`[PHOTO-PIPELINE]   ERROR: Source file does NOT exist`);
          console.log(`[PHOTO-PIPELINE]   Access error:`, accessError);
          continue;
        }
        
        // Read file to buffer
        const fs = require('fs');
        sourceBuffer = fs.readFileSync(sourcePath);
        console.log(`[PHOTO-PIPELINE]   Read buffer size: ${sourceBuffer.length} bytes`);
      }
      
      // Destination path in temp directory
      const destPath = join(tempDir, filename);
      console.log(`[PHOTO-PIPELINE]   Destination path: ${destPath}`);
      
      // Write buffer to temp file
      await writeFile(destPath, sourceBuffer);
      copiedImages.push(filename);
      
      console.log(`[PHOTO-PIPELINE]   SUCCESS: Wrote ${filename} to temp directory (${sourceBuffer.length} bytes)`);
    } catch (error) {
      console.error(`[PHOTO-PIPELINE]   ERROR: Failed to process photo ${photo.id}:`, error);
      // Continue with other photos even if one fails
    }
  }
  
  console.log(`[PHOTO-PIPELINE] Total copied images: ${copiedImages.length}`);
  console.log(`[PHOTO-PIPELINE] Copied filenames:`, copiedImages);
  return copiedImages;
}

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

async function compileLatexToPdf(latexContent: string, eventId: string, photos: any[] = []): Promise<{ buffer: Buffer; filename: string }> {
  let tempDir: string | null = null;
  let copiedImages: string[] = [];
  
  try {
    // Create temporary directory for compilation
    tempDir = join(tmpdir(), `latex-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    console.log(`[LATEX-TEMP] Created temp directory: ${tempDir}`);

    // Copy logo file to temp directory if it exists
    const logoSource = 'D:\\event_folde\\Event_management\\jain-logo.png';
    const logoDest = join(tempDir, 'jain-logo.png');
    try {
      await copyFile(logoSource, logoDest);
      console.log('[LOGO-COPY] Logo file copied to temp directory');
    } catch (logoError) {
      console.log('[LOGO-COPY] Logo file not found or could not be copied, compilation will use fallback');
    }

    // Copy QR code file to temp directory if it exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        qrCode: true,
        qrCodeData: true,
        qrCodeFilename: true
      }
    });

    console.log('[QR-COPY] Event QR data check:');
    console.log('[QR-COPY] - event.qrCode:', event?.qrCode);
    console.log('[QR-COPY] - event.qrCodeData exists:', !!event?.qrCodeData);
    console.log('[QR-COPY] - event.qrCodeFilename:', event?.qrCodeFilename);

    let qrImagePath: string | null = null;
    let qrFilenameForLatex: string | null = null;
    
    if (event?.qrCodeData) {
      console.log('[QR-COPY] QR code found in database');
      try {
        const qrBuffer = Buffer.from(event.qrCodeData);
        qrFilenameForLatex = event.qrCodeFilename || 'qr-code.png';
        qrImagePath = join(tempDir, qrFilenameForLatex);
        await writeFile(qrImagePath, qrBuffer);
        console.log('[QR-COPY] QR code copied from database to temp directory');
        console.log('[QR-COPY] QR filename for LaTeX:', qrFilenameForLatex);
        console.log('[QR-COPY] QR file path:', qrImagePath);
        console.log('[QR-COPY] QR buffer size:', qrBuffer.length, 'bytes');
        
        // Verify file exists after copy
        const { existsSync, statSync } = await import('fs');
        if (existsSync(qrImagePath)) {
          const stats = statSync(qrImagePath);
          console.log('[QR-COPY] QR file verified - size:', stats.size, 'bytes');
        } else {
          console.error('[QR-COPY] ERROR: QR file does not exist after copy!');
        }
      } catch (qrError) {
        console.error('[QR-COPY] Failed to copy QR from database:', qrError);
      }
    } else if (event?.qrCode) {
      const qrCode = event.qrCode;
      console.log('[QR-COPY] QR code not in database, checking filesystem:', qrCode);
      
      if (qrCode.startsWith('/uploads/qr/')) {
        try {
          const sourcePath = join(process.cwd(), 'public', qrCode);
          console.log('[QR-COPY] Source path:', sourcePath);
          
          if (await access(sourcePath).then(() => true).catch(() => false)) {
            const filename = qrCode.split('/').pop() || 'qr-code.png';
            qrFilenameForLatex = filename;
            qrImagePath = join(tempDir, filename);
            await copyFile(sourcePath, qrImagePath);
            console.log('[QR-COPY] QR code copied from filesystem to temp directory');
            console.log('[QR-COPY] QR filename for LaTeX:', qrFilenameForLatex);
            console.log('[QR-COPY] QR file path:', qrImagePath);
            
            // Verify file exists after copy
            const { existsSync, statSync } = await import('fs');
            if (existsSync(qrImagePath)) {
              const stats = statSync(qrImagePath);
              console.log('[QR-COPY] QR file verified, size:', stats.size, 'bytes');
            } else {
              console.error('[QR-COPY] ERROR: QR file does not exist after copy');
            }
          } else {
            console.log('[QR-COPY] QR file not found at:', sourcePath);
          }
        } catch (fsError) {
          console.error('[QR-COPY] Failed to copy QR code from filesystem:', fsError);
        }
      }
    } else {
      console.log('[QR-COPY] No QR code data available');
    }

    // Use photos passed as parameter instead of fetching from database
    console.log('[PHOTO-PIPELINE] Using pre-fetched photos for event:', eventId);
    console.log(`[PHOTO-PIPELINE] Photo count: ${photos.length}`);
    console.log('[PHOTO-PIPELINE] Photo IDs:', photos.map(p => p.id));
    console.log('[PHOTO-PIPELINE] Photo URLs:', photos.map(p => p.url));
    console.log('[PHOTO-PIPELINE] Photo captions:', photos.map(p => p.caption));

    // Copy images to temp directory
    copiedImages = await copyImagesToTempDir(photos, tempDir);
    console.log(`[IMAGE-COPY] Successfully copied ${copiedImages.length} images to temp directory`);

    // Start with original LaTeX content
    let modifiedLatexContent = latexContent;
    
    // Check QR placeholder BEFORE any modifications
    console.log('[QR-DEBUG] QR placeholder count BEFORE photo replacement:', (modifiedLatexContent.match(/\\PH\{QR_CODE\}/g) || []).length);
    console.log('[QR-DEBUG] Total LaTeX content length:', modifiedLatexContent.length);
    
    // Check if QR_CODE appears anywhere in the content
    if (modifiedLatexContent.includes('QR_CODE')) {
      console.log('[QR-DEBUG] QR_CODE string found in content');
      const qrIndex = modifiedLatexContent.indexOf('QR_CODE');
      console.log('[QR-DEBUG] QR_CODE index:', qrIndex);
      console.log('[QR-DEBUG] Context around QR_CODE:', modifiedLatexContent.substring(Math.max(0, qrIndex - 20), Math.min(modifiedLatexContent.length, qrIndex + 20)));
    } else {
      console.log('[QR-DEBUG] QR_CODE string NOT found in content at all');
    }
    
    // Generate dynamic photo gallery LaTeX section
    const photoGalleryLatex = generatePhotoGalleryLatex(copiedImages, photos);
    console.log('[DEBUG] Generated photo gallery LaTeX:', photoGalleryLatex.substring(0, 200));
    
    // Replace ONLY the photo grid part, keep the section header and skip captions
    // Find the photo grid start: first \begin{center} after Photo Gallery section
    const photoSectionStart = modifiedLatexContent.indexOf('\\section*{\\color{JainBlue}Photo Gallery}');
    console.log('[DEBUG] Photo section start index:', photoSectionStart);
    
    if (photoSectionStart !== -1) {
      // Find the first \begin{center} after the photo section
      const photoGridStart = modifiedLatexContent.indexOf('\\begin{center}', photoSectionStart);
      console.log('[DEBUG] Photo grid start index:', photoGridStart);
      
      if (photoGridStart !== -1) {
        // Find the FIRST \end{center} after the grid starts (end of photo grid only)
        const photoGridEnd = modifiedLatexContent.indexOf('\\end{center}', photoGridStart);
        console.log('[DEBUG] Photo grid end index:', photoGridEnd);
        
        if (photoGridEnd !== -1) {
          // Replace just the photo grid content, skip captions section
          const beforePhotoGrid = modifiedLatexContent.substring(0, photoGridStart);
          const afterPhotoGrid = modifiedLatexContent.substring(photoGridEnd + '\\end{center}'.length);
          modifiedLatexContent = beforePhotoGrid + photoGalleryLatex + afterPhotoGrid;
          console.log('[LATEX-MOD] Replaced photo grid only, skipping captions section');
        } else {
          console.error('[LATEX-MOD] ERROR: Could not find photo grid end pattern');
        }
      } else {
        console.error('[LATEX-MOD] ERROR: Could not find photo grid start pattern');
      }
    } else {
      console.error('[LATEX-MOD] ERROR: Could not find Photo Gallery section');
    }

    // Replace QR_CODE placeholder with actual includegraphics command if QR is available
    console.log('[LATEX-QR] QR replacement verification:');
    console.log('[LATEX-QR] - qrFilenameForLatex:', qrFilenameForLatex);
    console.log('[LATEX-QR] - QR placeholder count before:', (modifiedLatexContent.match(/\\PH\{QR_CODE\}/g) || []).length);
    
    if (qrFilenameForLatex) {
      console.log('[LATEX-QR] Replacing QR_CODE placeholder with actual QR image');
      const qrIncludeCommand = `\\includegraphics[width=3.5cm]{${qrFilenameForLatex}}`;
      console.log('[LATEX-QR] - Replacement command:', qrIncludeCommand);
      
      modifiedLatexContent = modifiedLatexContent.replace(/\\PH\{QR_CODE\}/g, qrIncludeCommand);
      
      const placeholderCountAfter = (modifiedLatexContent.match(/\\PH\{QR_CODE\}/g) || []).length;
      console.log('[LATEX-QR] - QR placeholder count after:', placeholderCountAfter);
      
      if (placeholderCountAfter > 0) {
        console.error('[LATEX-QR] ERROR: QR placeholder still exists after replacement!');
      } else {
        console.log('[LATEX-QR] SUCCESS: QR placeholder replaced completely');
      }
      
      // Verify the includegraphics command is in the content
      if (modifiedLatexContent.includes(qrIncludeCommand)) {
        console.log('[LATEX-QR] SUCCESS: includegraphics command found in LaTeX content');
      } else {
        console.error('[LATEX-QR] ERROR: includegraphics command NOT found in LaTeX content');
      }
    } else {
      console.log('[LATEX-QR] No QR available, leaving placeholder');
    }

    // Sanitize LaTeX content - split very long lines to avoid buffer overflow
    const sanitizedContent = modifiedLatexContent.split('\n').map(line => {
      // If a line is longer than 10000 characters, split it
      if (line.length > 10000) {
        return line.match(/.{1,10000}/g)?.join('\n') || line;
      }
      return line;
    }).join('\n');

    // Write LaTeX file
    const texFile = join(tempDir, 'document.tex');
    await writeFile(texFile, sanitizedContent, 'utf-8');
    console.log(`[LATEX-WRITE] Wrote LaTeX content to ${texFile}`);

    // Use Tectonic for compilation
    const tectonicPath = await getTectonicPath();
    const pdfFile = join(tempDir, 'document.pdf');
    
    // Use Tectonic compilation options with proper environment
    console.log('[TECTONIC] Starting Tectonic compilation...');
    console.log(`[TECTONIC] Tectonic path: ${tectonicPath}`);
    console.log(`[TECTONIC] Input file: ${texFile}`);
    console.log(`[TECTONIC] Output dir: ${tempDir}`);
    
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
    console.log(`[TECTONIC] Compilation completed in ${compileTime}ms`);
    console.log('[TECTONIC] stdout:', stdout);
    if (stderr) {
      console.log('[TECTONIC] stderr:', stderr);
      
      // Check for QR-related LaTeX errors
      if (stderr.includes('File') && stderr.includes('not found')) {
        console.error('[LATEX-ERROR] File not found error detected - check QR filename');
      }
      if (stderr.includes('graphicx')) {
        console.error('[LATEX-ERROR] graphicx package error detected');
      }
      if (stderr.includes('includegraphics')) {
        console.error('[LATEX-ERROR] includegraphics command error detected');
      }
    }

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);
    console.log(`[PDF-READ] Read PDF buffer: ${pdfBuffer.length} bytes`);

    // Validate the generated PDF
    await validatePdf(pdfBuffer);

    // Get next available filename in Downloads folder
    const filename = await getNextDownloadFilename();
    const downloadsDir = join(homedir(), 'Downloads');
    const outputPath = join(downloadsDir, filename);
    
    // Save PDF to Downloads folder
    await writeFile(outputPath, pdfBuffer);
    console.log(`[PDF-SAVE] Saved PDF to Downloads folder: ${outputPath}`);
    console.log(`[PDF-SAVE] PDF size in Downloads: ${pdfBuffer.length} bytes`);

    // Verify the saved file and return the verified buffer
    const savedBuffer = await readFile(outputPath);
    console.log(`[PDF-VERIFY] Verified saved PDF size: ${savedBuffer.length} bytes`);
    console.log(`[PDF-VERIFY] PDF signature check: ${savedBuffer.toString('ascii', 0, 5)}`);

    // Cleanup temp files
    console.log('[CLEANUP] Starting cleanup of temp files...');
    await unlink(texFile).catch(() => {});
    await unlink(pdfFile).catch(() => {});
    await unlink(logoDest).catch(() => {});
    
    // Cleanup copied images
    for (const imageFile of copiedImages) {
      const imagePath = join(tempDir, imageFile);
      await unlink(imagePath).catch(() => {});
      console.log(`[CLEANUP] Deleted temp image: ${imageFile}`);
    }
    
    console.log('[CLEANUP] Temp files cleanup completed');

    // Return the verified buffer from the saved file
    return { buffer: savedBuffer, filename };
  } catch (error) {
    console.error('[LATEX-ERROR] Local LaTeX compilation error:', error);
    console.error('[LATEX-ERROR] Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    // Cleanup temp files on error
    if (tempDir) {
      try {
        await unlink(join(tempDir, 'document.tex')).catch(() => {});
        await unlink(join(tempDir, 'document.pdf')).catch(() => {});
        await unlink(join(tempDir, 'jain-logo.png')).catch(() => {});
        for (const imageFile of copiedImages) {
          await unlink(join(tempDir, imageFile)).catch(() => {});
        }
        console.log('[CLEANUP] Cleanup completed after error');
      } catch (cleanupError) {
        console.error('[CLEANUP-ERROR] Error during cleanup:', cleanupError);
      }
    }
    
    throw new Error('Local LaTeX compilation failed');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    console.log('[REPORT-DB] ============================================');
    console.log('[REPORT-DB] Report download requested for event ID:', eventId);
    console.log('[REPORT-DB] ============================================');

    const dbFetchStart = Date.now();
    
    // Fetch report and photos in parallel before long-running operations
    const [report, photos] = await Promise.all([
      prisma.eventReport.findUnique({
        where: { eventId },
        select: {
          id: true,
          eventId: true,
          latexContent: true,
          status: true,
          pdfData: true,
          pdfMimeType: true,
          pdfFilename: true
        }
      }),
      prisma.photo.findMany({
        where: { eventId },
        select: {
          id: true,
          url: true,
          caption: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: 'desc' }
      })
    ]);

    const dbFetchEnd = Date.now();
    console.log(`[REPORT-DB] Database fetch: ${dbFetchEnd - dbFetchStart} ms`);
    console.log(`[REPORT-DB] Report found: ${!!report}`);
    console.log(`[REPORT-DB] Photos fetched: ${photos.length}`);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check if PDF already exists in database and return it directly
    if (report.pdfData && report.pdfMimeType === 'application/pdf') {
      console.log('[PDF-CACHE] PDF found in database, returning cached PDF');
      const pdfBuffer = Buffer.from(report.pdfData);
      const filename = report.pdfFilename || `report-${eventId}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Use the stored LaTeX content from the database
    let latexContent = report.latexContent;
    if (!latexContent) {
      return NextResponse.json(
        { error: 'LaTeX content not found in report' },
        { status: 400 }
      );
    }

    // Replace QR marker with placeholder for compileLatexToPdf to handle
    // Handle both old and new marker names for backward compatibility
    const qrMarkers = ['__QR_CODE_MARKER__', '__QR_CODE_PLACEHOLDER__'];
    let markerFound = false;
    
    for (const qrMarker of qrMarkers) {
      if (latexContent.includes(qrMarker)) {
        latexContent = latexContent.replace(new RegExp(qrMarker, 'g'), '\\PH{QR_CODE}');
        console.log(`[QR-REPLACE] QR marker ${qrMarker} converted to placeholder for compileLatexToPdf`);
        markerFound = true;
        break;
      }
    }
    
    if (!markerFound) {
      console.log('[QR-REPLACE] No QR marker found in LaTeX content');
    }

    // Compile LaTeX to PDF using Tectonic - pass pre-fetched photos
    let pdfResult: { buffer: Buffer; filename: string };
    try {
      pdfResult = await compileLatexToPdf(latexContent, eventId, photos);
      console.log(`[PDF-COMPILATION] PDF compilation successful. Returning buffer of size: ${pdfResult.buffer.length} bytes`);
      console.log(`[PDF-COMPILATION] Filename for download: ${pdfResult.filename}`);
    } catch (compileError) {
      console.error('[PDF-COMPILATION-ERROR] LaTeX compilation error:', compileError);
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
