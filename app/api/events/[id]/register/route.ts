import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Check if event exists and has capacity
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event is still open for registration
    if (event.status !== 'UPCOMING') {
      return NextResponse.json({ error: 'Event is not open for registration' }, { status: 400 });
    }

    // Check capacity
    if (event.currentCapacity >= event.maxCapacity) {
      return NextResponse.json({ error: 'Event is fully booked' }, { status: 400 });
    }

    // Check if user is already registered
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: authUser.userId
        }
      }
    });

    if (existingRegistration) {
      return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 });
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId: authUser.userId,
        status: 'REGISTERED'
      }
    });

    // Update event capacity
    await prisma.event.update({
      where: { id: eventId },
      data: {
        currentCapacity: event.currentCapacity + 1
      }
    });

    return NextResponse.json({
      message: 'Successfully registered for event',
      registrationId: registration.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Find and delete registration
    const registration = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: authUser.userId
        }
      }
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Delete registration
    await prisma.registration.delete({
      where: {
        eventId_userId: {
          eventId,
          userId: authUser.userId
        }
      }
    });

    // Update event capacity
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (event && event.currentCapacity > 0) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          currentCapacity: event.currentCapacity - 1
        }
      });
    }

    return NextResponse.json({ message: 'Registration cancelled successfully' });

  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
