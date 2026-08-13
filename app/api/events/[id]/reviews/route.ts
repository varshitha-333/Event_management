import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import prisma, { withRetry } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;

    const reviews = await withRetry(() => prisma.review.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('[REVIEWS] Fetch error:', error);
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
    const { rating, suggestions, freeText, isAnonymous } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (!suggestions && !freeText) {
      return NextResponse.json({ error: 'At least one of suggestions or freeText is required' }, { status: 400 });
    }

    const review = await withRetry(() => prisma.review.create({
      data: {
        eventId,
        userId: authUser.userId,
        rating,
        suggestions: suggestions || '',
        freeText: freeText || '',
        isAnonymous: isAnonymous || false,
        attendance: 'ATTENDED'
      }
    }));

    console.log(`[REVIEWS] Review created: eventId=${eventId}, userId=${authUser.userId}, rating=${rating}`);
    
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('[REVIEWS] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user owns the review
    const review = await withRetry(() => prisma.review.findUnique({
      where: { id: reviewId }
    }));

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Not authorized to delete this review' }, { status: 403 });
    }

    await withRetry(() => prisma.review.delete({
      where: { id: reviewId }
    }));

    console.log(`[REVIEWS] Review deleted: reviewId=${reviewId} by user ${authUser.userId}`);
    
    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('[REVIEWS] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
