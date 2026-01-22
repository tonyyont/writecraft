import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
}

/**
 * Check for available updates
 * Returns update info if available, null if up to date
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const update = await check();

    if (update) {
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body ?? undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw error;
  }
}

/**
 * Download and install an update, then relaunch the app
 */
export async function downloadAndInstall(
  onProgress?: (progress: UpdateProgress) => void
): Promise<void> {
  const update = await check();

  if (!update) {
    throw new Error('No update available');
  }

  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength ?? 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        if (onProgress) {
          onProgress({ downloaded, total });
        }
        break;
      case 'Finished':
        break;
    }
  });

  // Relaunch the app after installation
  await relaunch();
}
