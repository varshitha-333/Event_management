import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    console.log(`[PROPOSAL-SERVE] filename=${filename}`);
    
    // Extract eventId from filename (format: eventId.pdf)
    const eventId = filename.replace('.pdf', '');
    
    // Fetch proposal from database
    const proposal = await prisma.eventProposal.findUnique({
      where: { eventId }
    });
    
    if (!proposal || !proposal.pdfData) {
      console.log(`[PROPOSAL-SERVE] Proposal or PDF data not found for eventId=${eventId}`);
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }
    
    console.log(`[PROPOSAL-SERVE] source=DATABASE`);
    console.log(`[PROPOSAL-SERVE] proposalId=${proposal.id}`);
    console.log(`[PROPOSAL-SERVE] pdfBytes=${proposal.pdfData.length}`);
    
    const pdfBuffer = Buffer.from(proposal.pdfData);
    
    // Return PDF from database
    const response = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('[PROPOSAL-SERVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve PDF' },
      { status: 500 }
    );
  }
}
