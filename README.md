# Event Management System

A comprehensive event management platform built with Next.js 15, featuring AI-powered proposal and report generation, LaTeX PDF compilation, and PostgreSQL database integration.

## 🚀 Features

- **Event Management**: Create, update, and manage events with full CRUD operations
- **AI-Powered Content Generation**: Automatically generate event proposals and reports using OpenAI API
- **LaTeX PDF Generation**: Compile professional PDFs using Tectonic LaTeX compiler
- **File Upload System**: Upload posters, QR codes, and event photos
- **User Authentication**: JWT-based authentication with role-based access control
- **Reviews System**: Collect and manage event reviews and ratings
- **Photo Gallery**: Organize and display event photos with captions
- **Registration Management**: Track event registrations and participant statistics
- **Dashboard**: View event statistics and analytics
- **Background Processing**: Generate proposals asynchronously without blocking user experience

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Lucide Icons** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Database ORM with PostgreSQL
- **Neon PostgreSQL** - Serverless PostgreSQL database
- **OpenAI API** - AI content generation
- **Tectonic** - LaTeX compiler for PDF generation

### Authentication
- **JWT** - JSON Web Tokens for authentication
- **HTTP-only Cookies** - Secure token storage
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Tectonic LaTeX compiler (auto-downloaded for Vercel)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Event_management
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"

# JWT Secret
JWT_SECRET="your-jwt-secret-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. **Set up Prisma**
```bash
npx prisma generate
npx prisma db push
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄 Database Schema

### Main Models

#### Event
- Event listings with metadata (title, description, dates, venue, etc.)
- Relations: club, creator, proposal, report, photos, reviews, registrations

#### User
- User accounts with roles (student, faculty, admin, hod, dean)
- Authentication and authorization

#### Club
- Department clubs/organizations
- Relations: events

#### Photo
- Event photo gallery
- Fields: url, caption, albumTag, uploadedBy

#### Review
- Event reviews and ratings
- Fields: rating, suggestions, freeText, isAnonymous

#### EventProposal
- AI-generated event proposals
- Fields: description, objectives, schedule, budget, etc.

#### EventReport
- Post-event reports
- Fields: feedback summary, highlights, outcomes, etc.

#### Registration
- Event registrations
- Fields: userId, eventId, registeredAt

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Events
- `GET /api/events` - List all events (with filters)
- `POST /api/events` - Create new event
- `GET /api/events/[id]` - Get event details
- `PATCH /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### File Upload
- `POST /api/upload` - Upload files (poster, QR code, photos)

### Photos
- `GET /api/events/[id]/photos` - Get event photos
- `POST /api/events/[id]/photos` - Upload photo
- `DELETE /api/events/[id]/photos?photoId=xxx` - Delete photo

### Reviews
- `GET /api/events/[id]/reviews` - Get event reviews
- `POST /api/events/[id]/reviews` - Submit review
- `DELETE /api/events/[id]/reviews?reviewId=xxx` - Delete review

### Proposals
- `POST /api/proposal/generate` - Generate proposal PDF
- `GET /api/proposal/[eventId]` - Get proposal details

### Reports
- `POST /api/report/generate` - Generate report PDF
- `GET /api/report/[eventId]` - Get report details
- `GET /api/report/[eventId]/download` - Download report PDF

### Users
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update current user

### Departments
- `GET /api/departments` - List departments

### Stats
- `GET /api/stats/dashboard` - Get dashboard statistics

## 🔐 Authentication

The system uses JWT-based authentication with HTTP-only cookies:

1. **Login**: User credentials validated, JWT token issued
2. **Token Storage**: Token stored in HTTP-only cookie for security
3. **Token Validation**: Middleware validates token on protected routes
4. **Token Expiry**: Tokens expire after 7 days

### Roles
- **Student**: Can view events, register, submit reviews
- **Faculty**: Can create events, generate proposals/reports
- **Admin**: Full system access
- **HOD/Dean**: Department-level permissions

## 🤖 AI Content Generation

### Proposal Generation
- Uses OpenAI API to generate event proposals
- Includes: objectives, schedule, budget, publicity plan, outcomes
- Timing logs track: client setup, prompt construction, AI API call, parsing

### Report Generation
- Generates post-event reports with AI analysis
- Includes: proceedings, highlights, learning outcomes, recommendations
- Uses uploaded photos for visual content

## 📄 PDF Generation

### Tectonic LaTeX Compiler
- Compiles LaTeX templates to professional PDFs
- Supports custom fonts and styling
- Handles long content with line splitting
- Environment variables for font configuration

### Templates
- `event_proposal_template.tex` - Event proposal template
- `JAIN_Post_Event_Report_Template.tex` - Post-event report template

## 🚀 Deployment

### Vercel Deployment

1. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`

2. **Deploy**:
```bash
vercel
```

### Tectonic on Vercel
- Tectonic binary is auto-downloaded for Linux environment
- Font configuration handled via environment variables
- Compilation timeout set to 3 minutes

### Neon Database
- Serverless PostgreSQL with auto-suspend
- Retry logic handles sleep mode automatically
- Connection pooling for performance

## 📁 Project Structure

```
Event_management/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── events/       # Event CRUD
│   │   ├── upload/       # File upload
│   │   ├── proposal/     # Proposal generation
│   │   ├── report/       # Report generation
│   │   ├── users/        # User management
│   │   └── departments/  # Department data
│   ├── lib/              # Utility libraries
│   │   ├── ai/           # AI generation
│   │   ├── latex/        # LaTeX compilation
│   │   ├── auth.ts       # Authentication utilities
│   │   └── prisma.ts     # Prisma client
│   ├── register-event/   # Event creation page
│   └── manage-event/     # Event management page
├── prisma/
│   └── schema.prisma     # Database schema
├── public/
│   ├── uploads/          # Uploaded files
│   ├── proposals/        # Generated proposal PDFs
│   └── reports/          # Generated report PDFs
└── templates/            # LaTeX templates
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI generation | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `NEXT_PUBLIC_APP_URL` | Base URL for the application | Yes |

### Prisma Configuration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 🐛 Troubleshooting

### Database Connection Issues
- **Problem**: Connection timeouts with Neon
- **Solution**: Retry logic is implemented automatically with exponential backoff

### LaTeX Compilation Errors
- **Problem**: "unable to read an entire line"
- **Solution**: Content is sanitized to split long lines (>10,000 chars)

### AI Generation Slow
- **Problem**: AI generation taking 5+ minutes
- **Solution**: Check timing logs to identify bottleneck (API, prompt, or parsing)

### File Upload Failures
- **Problem**: Files not uploading
- **Solution**: Ensure `/public/uploads/` directory exists and is writable

## 📊 Performance Optimizations

- **Database Queries**: Retry logic with exponential backoff
- **AI Generation**: Background processing for proposal generation
- **File Uploads**: Immediate upload with URL storage
- **PDF Generation**: 3-minute timeout with proper environment variables
- **Caching**: Event data cached to reduce database queries

## 🔒 Security

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: HTTP-only cookies prevent XSS
- **Input Validation**: Zod schema validation
- **File Upload Validation**: Type and size checks
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **CORS**: Configured for allowed origins

## 📝 Recent Updates

See `ARCHITECTURAL_FIXES_SUMMARY.md` for detailed information about recent fixes:

- ✅ File upload pipeline for QR codes, posters, and photos
- ✅ Reviews API with full CRUD operations
- ✅ AI performance monitoring with timing logs
- ✅ LaTeX compilation fixes (line splitting, fontconfig)
- ✅ Background proposal generation
- ✅ Database connection resilience with retry logic
- ✅ Comprehensive logging throughout system
- ✅ Gitignore cleanup and organization
- ✅ **QR Code Rendering Fix**: Fixed QR code display in Post Event Report PDFs
  - Resolved template validation issues with QR placeholder
  - Fixed QR marker name mismatch between report generation and download
  - Restored QR replacement logic in LaTeX compilation
  - QR code now properly displays in PDF instead of showing as placeholder
- ✅ **Photo Gallery Image Size Optimization**: 
  - Increased photo gallery image sizes for better visibility
  - Adjusted dimensions to fit within page boundaries (no overflow)
  - 1 column: 14cm, 2 columns: 6.5cm, 3 columns: 4.2cm
  - QR code size: 3.5cm (standard size)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the architectural fixes summary

## 🎯 Roadmap

- [ ] Add email notifications for events
- [ ] Implement real-time chat for events
- [ ] Add calendar integration
- [ ] Implement payment processing for paid events
- [ ] Add analytics dashboard with charts
- [ ] Implement event feedback surveys
- [ ] Add multi-language support
- [ ] Implement event cloning feature
- [ ] Add bulk event import
- [ ] Implement event templates
