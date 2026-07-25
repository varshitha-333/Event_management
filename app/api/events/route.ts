import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, EventType, EventMode } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const timeline = searchParams.get('timeline');
    const search = searchParams.get('search');

    const where: any = {};

    if (department && department !== 'all') {
      where.club = {
        department: department
      };
    }

    if (timeline && timeline !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (timeline === 'future') {
        where.startDate = { gte: today };
      } else if (timeline === 'past') {
        where.startDate = { lt: today };
      } else if (timeline === 'present') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        where.startDate = { gte: today, lt: tomorrow };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } }
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        club: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Transform events to match frontend format
    const transformedEvents = events.map((event: any) => ({
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
      status: event.status.toLowerCase()
    }));

    // Remove duplicates by ID
    const uniqueEvents = Array.from(
      new Map(transformedEvents.map((event: any) => [event.id, event])).values()
    );

    return NextResponse.json(uniqueEvents);
  } catch (error) {
    console.error('Events fetch error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database error occurred while fetching events', details: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // --- resolve the real logged-in user from the cookie, not the body ---
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      theme,
      startDate,
      endDate,
      venue,
      mode,
      maxCapacity,
      clubId,
      qrCode
    } = body;

    if (!title || !description || !startDate || !venue) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, startDate, venue' },
        { status: 400 }
      );
    }

    const normalizedType = String(type || 'workshop').toUpperCase();
    if (!Object.values(EventType).includes(normalizedType as EventType)) {
      return NextResponse.json(
        { error: `Invalid event type: ${type}. Valid types: ${Object.values(EventType).join(', ')}` },
        { status: 400 }
      );
    }

    const normalizedMode = String(mode || 'offline').toUpperCase();
    if (!Object.values(EventMode).includes(normalizedMode as EventMode)) {
      return NextResponse.json(
        { error: `Invalid event mode: ${mode}. Valid modes: ${Object.values(EventMode).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dates
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start date format' },
        { status: 400 }
      );
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        );
      }
      if (endDateObj < startDateObj) {
        return NextResponse.json(
          { error: 'End date cannot be before start date' },
          { status: 400 }
        );
      }
    }

    // Validate capacity
    if (maxCapacity !== undefined && (maxCapacity < 1 || maxCapacity > 10000)) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 10000' },
        { status: 400 }
      );
    }

    let resolvedClubId = clubId;
    const club = clubId
      ? await prisma.club.findUnique({ where: { id: clubId } })
      : null;

    if (!club) {
      const fallbackClub = await prisma.club.findFirst();
      if (!fallbackClub) {
        return NextResponse.json(
          { error: 'No club found. Create a Club record first.' },
          { status: 400 }
        );
      }
      resolvedClubId = fallbackClub.id;
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        type: normalizedType as EventType,
        theme,
        startDate: startDateObj,
        endDate: endDate ? new Date(endDate) : startDateObj,
        venue,
        mode: normalizedMode as EventMode,
        maxCapacity: maxCapacity || 50,
        status: 'UPCOMING',
        clubId: resolvedClubId,
        createdBy: authUser.userId,
        qrCode: qrCode || null
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Event creation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database error occurred while creating event', details: error.message },
          { status: 500 }
        );
      }
      if (error.message.includes('JSON')) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create event', details: error instanceof Error ? error.message : 'Unknown error' },
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
    'history': '#ef4444',
    'CS': '#6366f1',
    'MATH': '#8b5cf6',
    'PHY': '#ec4899',
    'CHEM': '#f59e0b',
    'BIO': '#10b981',
    'ENG': '#3b82f6',
    'HIST': '#ef4444'
  };
  return colors[department] || '#6366f1';
}