import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

const CACHE_DIR = `${FileSystem.cacheDirectory}exercise-images/`;

/**
 * Gets the image server base URL.
 * The image server runs on port 3333 on the same machine as Metro.
 */
function getImageServerUrl(): string | null {
  try {
    const debuggerHost = Constants.expoGoConfig?.debuggerHost
      ?? (Constants as any).manifest?.debuggerHost
      ?? (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (!debuggerHost) return null;
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3333`;
  } catch {
    return null;
  }
}

/**
 * Gets the URI for an exercise image.
 * Checks cache first, then returns the server URL for streaming.
 * Image paths are like "exercises/Air_Bike/0.jpg"
 */
export async function getImageUri(imagePath: string): Promise<string | null> {
  // Check cache first
  const safeName = imagePath.replace(/\//g, '_');
  const localPath = `${CACHE_DIR}${safeName}`;
  
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 500) {
      console.log(`[IMG CACHE HIT] ${imagePath} -> ${localPath} (${info.size} bytes)`);
      return localPath;
    }
    if (info.exists) {
      // File exists but too small — probably a failed download, delete it
      console.log(`[IMG CACHE INVALID] ${imagePath} -> ${info.size} bytes, deleting`);
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
  } catch {}

  // Return server URL for direct streaming (expo-image will cache it)
  const baseUrl = getImageServerUrl();
  if (!baseUrl) {
    console.log(`[IMG NO SERVER] No image server URL available`);
    return null;
  }
  
  const serverPath = imagePath.startsWith('exercises/') 
    ? imagePath.substring('exercises/'.length) 
    : imagePath;
  
  const url = `${baseUrl}/${serverPath}`;
  console.log(`[IMG SERVER URL] ${imagePath} -> ${url}`);
  return url;
}

/**
 * Downloads all exercise images to local cache.
 */
export async function downloadAllImages(
  allImagePaths: string[],
  onProgress: (done: number, total: number) => void
): Promise<number> {
  const baseUrl = getImageServerUrl();
  if (!baseUrl) return 0;

  // Ensure cache dir
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch {}

  let done = 0;
  let downloaded = 0;

  for (const imgPath of allImagePaths) {
    const safeName = imgPath.replace(/\//g, '_');
    const localPath = `${CACHE_DIR}${safeName}`;

    // Skip if already cached
    try {
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists && info.size && info.size > 500) {
        done++;
        onProgress(done, allImagePaths.length);
        continue;
      }
    } catch {}

    // Download from image server
    const serverPath = imgPath.startsWith('exercises/') 
      ? imgPath.substring('exercises/'.length) 
      : imgPath;

    try {
      const result = await FileSystem.downloadAsync(`${baseUrl}/${serverPath}`, localPath);
      if (result.status === 200) downloaded++;
    } catch {}

    done++;
    onProgress(done, allImagePaths.length);
  }

  return downloaded;
}

/**
 * Gets cache stats.
 */
export async function getCacheStats(): Promise<{ count: number; sizeBytes: number }> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) return { count: 0, sizeBytes: 0 };
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;
    for (const file of files) {
      try {
        const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
        if (info.exists && 'size' in info) totalSize += (info as any).size ?? 0;
      } catch {}
    }
    return { count: files.length, sizeBytes: totalSize };
  } catch {
    return { count: 0, sizeBytes: 0 };
  }
}

/**
 * Clears all cached images.
 */
export async function clearImageCache(): Promise<void> {
  await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
}
