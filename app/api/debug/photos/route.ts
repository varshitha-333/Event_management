import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const allPhotos = await prisma.photo.findMany({
      select: {
        id: true,
        eventId: true,
        url: true,
        caption: true,
        uploadedAt: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    // Group by eventId
    const photosByEvent = allPhotos.reduce((acc, photo) => {
      if (!acc[photo.eventId]) {
        acc[photo.eventId] = [];
      }
      acc[photo.eventId].push(photo);
      return acc;
    }, {} as Record<string, typeof allPhotos>);

    return NextResponse.json({
      totalPhotos: allPhotos.length,
      photosByEvent: Object.entries(photosByEvent).map(([eventId, photos]) => ({
        eventId,
        count: photos.length,
        photos: photos.map(p => ({
          id: p.id,
          url: p.url,
          caption: p.caption
        }))
      }))
    });
  } catch (error) {
    console.error('[DEBUG-PHOTOS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
