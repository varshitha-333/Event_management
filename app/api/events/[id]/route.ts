import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Return full event data without transformation for edit page
    return NextResponse.json(event);
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only staff roles can edit events
    const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
    if (!staffRoles.includes(authUser.role)) {
      return NextResponse.json(
        { error: 'Only staff members can edit events' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

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

    // Build update data with only provided fields (partial update)
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type.toUpperCase();
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      startDate.setHours(0, 0, 0, 0);
      updateData.startDate = startDate;
    }
    if (body.endDate !== undefined) {
      const endDate = new Date(body.endDate);
      endDate.setHours(0, 0, 0, 0);
      updateData.endDate = endDate;
    }
    if (body.venue !== undefined) updateData.venue = body.venue;
    if (body.mode !== undefined) updateData.mode = body.mode.toUpperCase();
    if (body.maxCapacity !== undefined) updateData.maxCapacity = body.maxCapacity;
    if (body.poster !== undefined) updateData.poster = body.poster;
    if (body.qrCode !== undefined) updateData.qrCode = body.qrCode;
    if (body.studentCoordinators !== undefined) updateData.studentCoordinators = body.studentCoordinators;
    if (body.facultyCoordinator !== undefined) updateData.facultyCoordinator = body.facultyCoordinator;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo;

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        club: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`[EVENT] Event updated: ${id}`);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: error instanceof Error ? error.message : 'Unknown error' },
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
