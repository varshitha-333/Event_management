import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('qr') as File;
    const eventId = formData.get('eventId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No QR file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;
    const filename = file.name;

    console.log('[QR-UPLOAD] QR code received');
    console.log('[QR-UPLOAD] File size:', buffer.length, 'bytes');
    console.log('[QR-UPLOAD] MIME type:', mimeType);
    console.log('[QR-UPLOAD] Filename:', filename);

    // Store binary data in database
    if (eventId) {
      console.log('[QR-UPLOAD] Storing QR in database for event:', eventId);
      
      const event = await prisma.event.update({
        where: { id: eventId },
        data: {
          qrCodeData: buffer,
          qrCodeMimeType: mimeType,
          qrCodeFilename: filename,
          qrCode: null // Clear legacy path
        }
      });

      console.log('[QR-DB-PERSIST] storage=postgresql');
      console.log('[QR-DB-PERSIST] eventId=', eventId);
      console.log('[QR-DB-PERSIST] bytes=', buffer.length);
      console.log('[QR-DB-PERSIST] mime=', mimeType);
      console.log('[QR-DB-PERSIST] stored=true');

      return NextResponse.json({
        success: true,
        eventId: eventId,
        filename: filename,
        bytes: buffer.length,
        mimeType: mimeType,
        storage: 'database'
      });
    } else {
      // If no eventId provided, save to filesystem as temporary storage
      // This is for backward compatibility with existing flow
      console.log('[QR-UPLOAD] No eventId provided, saving to filesystem (temporary)');
      
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'qr');
      await mkdir(uploadDir, { recursive: true });

      const fileExtension = file.name.split('.').pop() || 'png';
      const uniqueFilename = `qr-${randomUUID()}.${fileExtension}`;
      const filepath = join(uploadDir, uniqueFilename);
      
      await writeFile(filepath, buffer);

      console.log('[QR-UPLOAD] Temporary file saved:', uniqueFilename);

      const urlPath = `/uploads/qr/${uniqueFilename}`;

      return NextResponse.json({
        success: true,
        url: urlPath,
        filename: uniqueFilename,
        storage: 'filesystem',
        warning: 'No eventId provided - saved to filesystem temporarily'
      });
    }

  } catch (error) {
    console.error('[QR-UPLOAD] Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload QR code' },
      { status: 500 }
    );
  }
}
