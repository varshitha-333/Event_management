import { PrismaClient } from '@prisma/client';

// Create a fresh Prisma instance for each request to avoid stale connection issues
// This is necessary for Neon's auto-suspension behavior
let prismaInstance: PrismaClient | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;

const getPrisma = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Increase timeout for long-running operations like PDF generation
      transactionOptions: {
        timeout: 180000, // 3 minutes
        maxWait: 60000, // 60 seconds
      },
    });

    // Start keep-alive mechanism to prevent connection closure
    startKeepAlive();
  }
  return prismaInstance;
};

const prisma = getPrisma();

// Keep-alive mechanism to prevent Neon from closing connections
function startKeepAlive() {
  if (keepAliveInterval) return;

  keepAliveInterval = setInterval(async () => {
    try {
      if (prismaInstance) {
        // Execute a simple query to keep connection alive
        await prismaInstance.$queryRaw`SELECT 1`;
        console.log('[DB-KEEPALIVE] Connection kept alive');
      }
    } catch (error) {
      console.error('[DB-KEEPALIVE] Failed to keep connection alive:', error);
    }
  }, 10000); // Every 10 seconds
}

// Cleanup function to stop keep-alive
export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('[DB-KEEPALIVE] Stopped keep-alive mechanism');
  }
}

export default prisma;

// Helper function to retry database operations with exponential backoff
// Specifically handles Neon auto-suspension wake-up delays
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 2000
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error (Neon wake-up or network issue)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any).code;
      const errorKind = (error as any).kind;
      const errorCause = (error as any).cause;
      
      const isConnectionError = 
        errorMessage.includes('Can\'t reach database server') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Closed') ||
        errorMessage.includes('closed') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ConnectionReset') ||
        errorMessage.includes('forcibly closed') ||
        errorKind === 'Closed' ||
        errorKind === 'closed' ||
        errorKind === 'Io' ||
        errorCause === 'None' ||
        errorCode === 'P1001' ||
        errorCode === 'P1003';
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`[DB-RETRY] Connection failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      console.log(`[DB-RETRY] Error: ${errorMessage}`);
      console.log(`[DB-RETRY] Error kind: ${errorKind}, code: ${errorCode}, cause: ${errorCause}`);
      
      // Force reconnection by recreating Prisma instance
      try {
        if (prismaInstance) {
          await prismaInstance.$disconnect();
          prismaInstance = null;
          console.log('[DB-RETRY] Disconnected and cleared Prisma instance');
        }
        
        // Create fresh instance
        const freshPrisma = getPrisma();
        await freshPrisma.$connect();
        console.log('[DB-RETRY] Reconnected with fresh Prisma instance');
      } catch (reconnectError) {
        console.log('[DB-RETRY] Reconnection failed (continuing):', reconnectError);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    }
  }
  
  throw lastError!;
}
