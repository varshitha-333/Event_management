import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CS' },
      update: {},
      create: {
        name: 'Computer Science',
        code: 'CS',
        color: '#6366f1',
        icon: 'fa-laptop-code',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'MATH' },
      update: {},
      create: {
        name: 'Mathematics',
        code: 'MATH',
        color: '#8b5cf6',
        icon: 'fa-square-root-alt',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'PHY' },
      update: {},
      create: {
        name: 'Physics',
        code: 'PHY',
        color: '#ec4899',
        icon: 'fa-atom',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'CHEM' },
      update: {},
      create: {
        name: 'Chemistry',
        code: 'CHEM',
        color: '#f59e0b',
        icon: 'fa-flask',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'BIO' },
      update: {},
      create: {
        name: 'Biology',
        code: 'BIO',
        color: '#10b981',
        icon: 'fa-dna',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'ENG' },
      update: {},
      create: {
        name: 'English',
        code: 'ENG',
        color: '#3b82f6',
        icon: 'fa-book-open',
        isActive: true
      }
    }),
    prisma.department.upsert({
      where: { code: 'HIST' },
      update: {},
      create: {
        name: 'History',
        code: 'HIST',
        color: '#ef4444',
        icon: 'fa-landmark',
        isActive: true
      }
    })
  ]);

  console.log('✓ Created departments');

  // Create Clubs
  const csDept = departments.find(d => d.code === 'CS');
  const mathDept = departments.find(d => d.code === 'MATH');
  const phyDept = departments.find(d => d.code === 'PHY');
  const chemDept = departments.find(d => d.code === 'CHEM');
  const bioDept = departments.find(d => d.code === 'BIO');
  const engDept = departments.find(d => d.code === 'ENG');
  const histDept = departments.find(d => d.code === 'HIST');

  const clubs = await Promise.all([
    prisma.club.upsert({
      where: { name: 'Tech Club' },
      update: {},
      create: {
        name: 'Tech Club',
        department: csDept?.code || 'CS',
        description: 'Technology and innovation club',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'Math Society' },
      update: {},
      create: {
        name: 'Math Society',
        department: mathDept?.code || 'MATH',
        description: 'Mathematics enthusiasts club',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'Physics Forum' },
      update: {},
      create: {
        name: 'Physics Forum',
        department: phyDept?.code || 'PHY',
        description: 'Physics discussion and experiments',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'Chem Society' },
      update: {},
      create: {
        name: 'Chem Society',
        department: chemDept?.code || 'CHEM',
        description: 'Chemistry research club',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'Bio Club' },
      update: {},
      create: {
        name: 'Bio Club',
        department: bioDept?.code || 'BIO',
        description: 'Biology and life sciences club',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'Literary Society' },
      update: {},
      create: {
        name: 'Literary Society',
        department: engDept?.code || 'ENG',
        description: 'Literature and creative writing',
        isActive: true
      }
    }),
    prisma.club.upsert({
      where: { name: 'History Club' },
      update: {},
      create: {
        name: 'History Club',
        department: histDept?.code || 'HIST',
        description: 'Historical research and discussions',
        isActive: true
      }
    })
  ]);

  console.log('✓ Created clubs');

  // Create sample user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const sampleUser = await prisma.user.upsert({
    where: { email: 'student@jainuniversity.edu' },
    update: {},
    create: {
      email: 'student@jainuniversity.edu',
      name: 'John Doe',
      password: hashedPassword,
      role: 'STUDENT',
      department: csDept?.code || 'CS',
      year: 2,
      branch: 'CSE'
    }
  });

  console.log('✓ Created sample user (student@jainuniversity.edu / password123)');

  // Create sample events
  const techClub = clubs.find(c => c.name === 'Tech Club');
  const mathClub = clubs.find(c => c.name === 'Math Society');
  const phyClub = clubs.find(c => c.name === 'Physics Forum');
  const chemClub = clubs.find(c => c.name === 'Chem Society');
  const bioClub = clubs.find(c => c.name === 'Bio Club');
  const litClub = clubs.find(c => c.name === 'Literary Society');
  const histClub = clubs.find(c => c.name === 'History Club');

  const sampleEvents = [
    {
      title: 'AI & Machine Learning Workshop',
      description: 'Learn the fundamentals of AI and Machine Learning with hands-on examples.',
      clubId: techClub?.id,
      type: 'WORKSHOP',
      theme: 'Artificial Intelligence',
      venue: 'CS Lab 301',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-20T14:00:00'),
      endDate: new Date('2024-12-20T17:00:00'),
      maxCapacity: 50,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
      tags: ['AI', 'ML', 'Workshop'],
      createdBy: sampleUser.id
    },
    {
      title: 'Calculus Study Session',
      description: 'Comprehensive review session covering derivatives, integrals, and applications.',
      clubId: mathClub?.id,
      type: 'LECTURE',
      theme: 'Calculus',
      venue: 'Math Building Room 205',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-25T10:00:00'),
      endDate: new Date('2024-12-25T13:00:00'),
      maxCapacity: 30,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
      tags: ['Math', 'Calculus', 'Study'],
      createdBy: sampleUser.id
    },
    {
      title: 'Quantum Physics Lecture',
      description: 'Explore the fascinating world of quantum mechanics and wave-particle duality.',
      clubId: phyClub?.id,
      type: 'LECTURE',
      theme: 'Quantum Mechanics',
      venue: 'Physics Auditorium',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-18T15:30:00'),
      endDate: new Date('2024-12-18T17:30:00'),
      maxCapacity: 100,
      status: 'COMPLETED',
      poster: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80',
      tags: ['Physics', 'Quantum', 'Lecture'],
      createdBy: sampleUser.id
    },
    {
      title: 'Organic Chemistry Lab',
      description: 'Hands-on laboratory session focusing on organic synthesis and reaction mechanisms.',
      clubId: chemClub?.id,
      type: 'WORKSHOP',
      theme: 'Organic Chemistry',
      venue: 'Chemistry Lab B',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-28T13:00:00'),
      endDate: new Date('2024-12-28T16:00:00'),
      maxCapacity: 25,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      tags: ['Chemistry', 'Lab', 'Organic'],
      createdBy: sampleUser.id
    },
    {
      title: 'Cell Biology Seminar',
      description: 'Latest research in cellular processes, genetics, and biotechnology applications.',
      clubId: bioClub?.id,
      type: 'SEMINAR',
      theme: 'Cell Biology',
      venue: 'Biology Hall 102',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-22T11:00:00'),
      endDate: new Date('2024-12-22T13:00:00'),
      maxCapacity: 40,
      status: 'COMPLETED',
      poster: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&auto=format&fit=crop&q=80',
      tags: ['Biology', 'Seminar', 'Research'],
      createdBy: sampleUser.id
    },
    {
      title: 'Shakespeare Reading Group',
      description: 'Discussion and analysis of Hamlet with focus on literary themes.',
      clubId: litClub?.id,
      type: 'LECTURE',
      theme: 'Shakespeare',
      venue: 'Library Reading Room',
      mode: 'OFFLINE',
      startDate: new Date('2025-01-05T16:00:00'),
      endDate: new Date('2025-01-05T18:00:00'),
      maxCapacity: 20,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80',
      tags: ['Literature', 'Shakespeare', 'Reading'],
      createdBy: sampleUser.id
    },
    {
      title: 'World War II History Discussion',
      description: 'Examining the causes, events, and aftermath of World War II.',
      clubId: histClub?.id,
      type: 'LECTURE',
      theme: 'World War II',
      venue: 'History Department Room 401',
      mode: 'OFFLINE',
      startDate: new Date('2025-01-08T14:30:00'),
      endDate: new Date('2025-01-08T16:30:00'),
      maxCapacity: 35,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
      tags: ['History', 'WWII', 'Discussion'],
      createdBy: sampleUser.id
    },
    {
      title: 'Web Development Bootcamp',
      description: 'Intensive full-day workshop on HTML, CSS, JavaScript, and modern web frameworks.',
      clubId: techClub?.id,
      type: 'WORKSHOP',
      theme: 'Web Development',
      venue: 'Computer Lab A',
      mode: 'OFFLINE',
      startDate: new Date('2025-01-10T09:00:00'),
      endDate: new Date('2025-01-10T17:00:00'),
      maxCapacity: 30,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
      tags: ['Web', 'Development', 'Bootcamp'],
      createdBy: sampleUser.id
    },
    {
      title: 'Statistics & Data Analysis',
      description: 'Applied statistics for research, including hypothesis testing and regression analysis.',
      clubId: mathClub?.id,
      type: 'LECTURE',
      theme: 'Statistics',
      venue: 'Math Building Room 310',
      mode: 'OFFLINE',
      startDate: new Date('2024-12-15T10:30:00'),
      endDate: new Date('2024-12-15T12:30:00'),
      maxCapacity: 45,
      status: 'COMPLETED',
      poster: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      tags: ['Math', 'Statistics', 'Data'],
      createdBy: sampleUser.id
    },
    {
      title: 'Environmental Science Field Trip',
      description: 'Full-day field trip to study local ecosystems and biodiversity.',
      clubId: bioClub?.id,
      type: 'EXHIBITION',
      theme: 'Environmental Science',
      venue: 'Campus Parking Lot (Bus Departure)',
      mode: 'OFFLINE',
      startDate: new Date('2025-01-15T08:00:00'),
      endDate: new Date('2025-01-15T17:00:00'),
      maxCapacity: 30,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&auto=format&fit=crop&q=80',
      tags: ['Biology', 'Environment', 'Field Trip'],
      createdBy: sampleUser.id
    },
    {
      title: 'Annual Tech Symposium 2026',
      description: 'Flagship annual tech event featuring student projects, industry talks and competitions.',
      clubId: techClub?.id,
      type: 'SYMPOSIUM',
      theme: 'Technology Symposium',
      venue: 'Main Auditorium',
      mode: 'HYBRID',
      startDate: new Date('2026-03-11T10:00:00'),
      endDate: new Date('2026-03-11T17:00:00'),
      maxCapacity: 200,
      status: 'UPCOMING',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
      tags: ['Tech', 'Symposium', 'Competition'],
      createdBy: sampleUser.id
    }
  ];

  for (const eventData of sampleEvents) {
    if (eventData.clubId) {
      await prisma.event.create({
        data: eventData
      });
    }
  }

  console.log('✓ Created sample events');

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
