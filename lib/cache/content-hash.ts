import crypto from 'crypto';

/**
 * Generate a content hash for event data to detect changes
 * This hash is used for caching generated reports and proposals
 */
export function generateContentHash(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Generate hash for proposal-specific data
 */
export function generateProposalHash(event: any, formData: any): string {
  const hashData = {
    eventId: event.id,
    title: event.title,
    type: event.type,
    theme: event.theme,
    startDate: event.startDate?.toISOString(),
    venue: event.venue,
    mode: event.mode,
    facultyCoordinator: event.facultyCoordinator,
    studentCoordinators: event.studentCoordinators,
    clubName: event.club?.name,
    department: event.club?.department,
    resourcePerson: event.contactInfo?.resourcePerson,
    maxCapacity: event.maxCapacity,
    // Include form data that affects proposal
    formData: {
      eventName: formData.eventName,
      eventType: formData.eventType,
      eventTheme: formData.eventTheme,
      budgetItems: formData.budgetItems,
      logistics: formData.logistics,
    }
  };
  return generateContentHash(hashData);
}

/**
 * Generate hash for report-specific data
 */
export function generateReportHash(event: any, formData: any, photos: any[], registrations: any[]): string {
  const hashData = {
    eventId: event.id,
    title: event.title,
    startDate: event.startDate?.toISOString(),
    venue: event.venue,
    facultyCoordinator: event.facultyCoordinator,
    studentCoordinators: event.studentCoordinators,
    resourcePerson: event.contactInfo?.resourcePerson,
    // Include photos count and timestamps (not full data to avoid huge hashes)
    photosCount: photos.length,
    photosTimestamps: photos.map(p => p.uploadedAt?.toISOString()).sort(),
    // Include registrations count
    registrationsCount: registrations.length,
    // Include form data that affects report
    formData: {
      actualParticipants: formData.actualParticipants,
      budgetUtilized: formData.budgetUtilized,
      links: formData.links,
    }
  };
  return generateContentHash(hashData);
}
