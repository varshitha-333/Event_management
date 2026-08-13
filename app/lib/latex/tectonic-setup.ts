import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

let tectonicPath: string | null = null;

/**
 * Download Tectonic Linux binary for Vercel deployment
 */
export async function getTectonicBinary(): Promise<string> {
  if (tectonicPath) {
    return tectonicPath;
  }

  const tectonicDir = join(tmpdir(), 'tectonic');
  const tectonicFile = join(tectonicDir, 'tectonic');

  try {
    // Check if already downloaded
    await mkdir(tectonicDir, { recursive: true });
    
    // Download Tectonic Linux x86_64 binary
    const response = await fetch('https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.13.2/tectonic-0.13.2-x86_64-unknown-linux-gnu.tar.gz');
    
    if (!response.ok) {
      throw new Error(`Failed to download Tectonic: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Extract tar.gz (simple extraction for single file)
    // For simplicity, we'll download the direct binary instead
    const binaryResponse = await fetch('https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.13.2/tectonic-x86_64-unknown-linux-gnu');
    
    if (!binaryResponse.ok) {
      throw new Error(`Failed to download Tectonic binary: ${binaryResponse.statusText}`);
    }

    const binaryBuffer = Buffer.from(await binaryResponse.arrayBuffer());
    await writeFile(tectonicFile, binaryBuffer, { mode: 0o755 });
    
    // Make executable
    await chmod(tectonicFile, 0o755);
    
    tectonicPath = tectonicFile;
    console.log('Tectonic binary downloaded to:', tectonicPath);
    
    return tectonicPath;
  } catch (error) {
    console.error('Failed to download Tectonic:', error);
    
    // Fallback: try to use system tectonic if available
    try {
      await execAsync('which tectonic');
      return 'tectonic';
    } catch {
      throw new Error('Tectonic not available and download failed');
    }
  }
}

/**
 * Get Tectonic path for local development (Windows) or Vercel (Linux)
 */
export async function getTectonicPath(): Promise<string> {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  
  if (isVercel) {
    return await getTectonicBinary();
  }
  
  // Local development - use Windows binary
  return process.env.TECTONIC_PATH || 'D:\\event_folde\\Event_management\\tectonic.exe';
}
