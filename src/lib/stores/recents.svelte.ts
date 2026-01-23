// Recent files store using localStorage
const STORAGE_KEY = 'writecraft-recent-files';
const MAX_RECENTS = 10;

interface RecentFile {
  path: string;
  name: string;
  openedAt: string;
}

// Load from localStorage
function loadRecents(): RecentFile[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save to localStorage
function saveRecents(recents: RecentFile[]): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // Ignore storage errors
  }
}

// Extract filename from path
function getFilename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// Extract directory from path (for display)
function getDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop(); // Remove filename

  // Convert to ~ notation if in home directory
  const home = parts.join('/');
  if (home.startsWith('/Users/')) {
    const userParts = home.split('/');
    if (userParts.length >= 3) {
      return '~/' + userParts.slice(3).join('/');
    }
  }

  return home;
}

// Reactive state
let recentFiles = $state<RecentFile[]>(loadRecents());

// Add a file to recents
function addRecent(path: string): void {
  const now = new Date().toISOString();

  // Remove if already exists
  const filtered = recentFiles.filter((f) => f.path !== path);

  // Add to front
  const updated = [{ path, name: getFilename(path), openedAt: now }, ...filtered].slice(
    0,
    MAX_RECENTS
  );

  recentFiles = updated;
  saveRecents(updated);
}

// Remove a file from recents
function removeRecent(path: string): void {
  const updated = recentFiles.filter((f) => f.path !== path);
  recentFiles = updated;
  saveRecents(updated);
}

// Update a file's path in recents (for rename)
function updateRecentPath(oldPath: string, newPath: string): void {
  const updated = recentFiles.map((f) => {
    if (f.path === oldPath) {
      return { ...f, path: newPath, name: getFilename(newPath) };
    }
    return f;
  });
  recentFiles = updated;
  saveRecents(updated);
}

// Clear all recents
function clearRecents(): void {
  recentFiles = [];
  saveRecents([]);
}

// Export store
export const recentsStore = {
  get files() {
    return recentFiles;
  },

  addRecent,
  removeRecent,
  updateRecentPath,
  clearRecents,
  getDirectory,
};
