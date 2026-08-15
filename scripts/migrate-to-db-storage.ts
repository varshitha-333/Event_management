import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migrateQRCodeToDatabase() {
  console.log('[MIGRATION] Starting QR code migration from filesystem to database...');
  
  const events = await prisma.event.findMany({
    where: {
      qrCode: {
        not: null,
        startsWith: '/uploads/qr/'
      }
    }
  });
  
  console.log(`[MIGRATION] Found ${events.length} events with QR code paths`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const event of events) {
    if (!event.qrCode) continue;
    
    try {
      const sourcePath = path.join(process.cwd(), 'public', event.qrCode);
      console.log(`[MIGRATION] Processing event ${event.id}: ${event.qrCode}`);
      
      if (fs.existsSync(sourcePath)) {
        const buffer = fs.readFileSync(sourcePath);
        const filename = path.basename(event.qrCode);
        const mimeType = 'image/png'; // Assuming PNG based on current implementation
        
        await prisma.event.update({
          where: { id: event.id },
          data: {
            qrCodeData: buffer,
            qrCodeMimeType: mimeType,
            qrCodeFilename: filename,
            qrCode: null // Clear legacy path
          }
        });
        
        console.log(`[MIGRATION] ✓ Migrated QR for event ${event.id}, bytes: ${buffer.length}`);
        migrated++;
      } else {
        console.log(`[MIGRATION] ✗ File not found: ${sourcePath}`);
        failed++;
      }
    } catch (error) {
      console.log(`[MIGRATION] ✗ Failed to migrate QR for event ${event.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[MIGRATION] QR migration complete: ${migrated} migrated, ${failed} failed`);
}

async function migratePDFToDatabase() {
  console.log('[MIGRATION] Starting PDF migration from filesystem to database...');
  
  const proposals = await prisma.eventProposal.findMany({
    where: {
      pdfUrl: {
        not: null,
        startsWith: '/proposals/'
      },
      pdfData: null
    }
  });
  
  console.log(`[MIGRATION] Found ${proposals.length} proposals with PDF paths`);
  
  let migrated = 0;
  let failed = 0;
  
  for (const proposal of proposals) {
    if (!proposal.pdfUrl) continue;
    
    try {
      const sourcePath = path.join(process.cwd(), 'public', proposal.pdfUrl);
      console.log(`[MIGRATION] Processing proposal ${proposal.id}: ${proposal.pdfUrl}`);
      
      if (fs.existsSync(sourcePath)) {
        const buffer = fs.readFileSync(sourcePath);
        const filename = path.basename(proposal.pdfUrl);
        
        await prisma.eventProposal.update({
          where: { id: proposal.id },
          data: {
            pdfData: buffer,
            pdfMimeType: 'application/pdf',
            pdfFilename: filename,
            pdfUrl: proposal.pdfUrl // Keep legacy path for backward compatibility
          }
        });
        
        console.log(`[MIGRATION] ✓ Migrated PDF for proposal ${proposal.id}, bytes: ${buffer.length}`);
        migrated++;
      } else {
        console.log(`[MIGRATION] ✗ File not found: ${sourcePath}`);
        failed++;
      }
    } catch (error) {
      console.log(`[MIGRATION] ✗ Failed to migrate PDF for proposal ${proposal.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[MIGRATION] PDF migration complete: ${migrated} migrated, ${failed} failed`);
}

async function main() {
  try {
    await migrateQRCodeToDatabase();
    await migratePDFToDatabase();
    console.log('[MIGRATION] All migrations complete');
  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
