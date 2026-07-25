import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        club: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviews: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Transform event to match frontend format
    const transformedEvent = {
      id: event.id,
      name: event.title,
      department: event.club.department,
      date: event.startDate.toISOString().split('T')[0],
      time: event.startDate.toTimeString().slice(0, 5),
      location: event.venue,
      description: event.description,
      capacity: event.maxCapacity,
      organizer: event.creator.name,
      color: getDepartmentColor(event.club.department),
      poster: event.poster || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
      type: event.type.toLowerCase(),
      mode: event.mode.toLowerCase(),
      status: event.status.toLowerCase(),
      theme: event.theme,
      endDate: event.endDate.toISOString().split('T')[0],
      reviews: event.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        text: review.freeText || '',
        name: review.isAnonymous ? 'Anonymous' : 'User',
        department: review.department || 'Unknown',
        date: review.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }))
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only staff roles can delete events
    const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
    if (!staffRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only staff members can delete events' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete event (cascade will handle related records)
    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Event deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}

function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    'computer-science': '#6366f1',
    'mathematics': '#8b5cf6',
    'physics': '#ec4899',
    'chemistry': '#f59e0b',
    'biology': '#10b981',
    'english': '#3b82f6',
    'history': '#ef4444'
  };
  return colors[department] || '#6366f1';
}
