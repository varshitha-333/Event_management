import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;

    const photos = await prisma.photo.findMany({
      where: { eventId },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Photos fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const authUser = getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { url, caption, albumTag } = body;

    if (!url) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        eventId,
        url,
        caption: caption || '',
        albumTag: albumTag || 'General',
        uploadedBy: authUser.userId
      }
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await prisma.photo.delete({
      where: { id: photoId }
    });

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
