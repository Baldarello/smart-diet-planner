import { SyncedData } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILE_PREFIX = 'lifepulse_backup_';
const FOLDER = 'appDataFolder'; // Special, hidden folder for app data
const MAX_BACKUPS_TO_KEEP = 5;

export interface DriveFile {
    id: string;
    name: string;
    createdTime: string; // From Drive API
}

// Helper to create common headers
const createHeaders = (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
});

/**
 * Finds the latest backup file in the appDataFolder.
 * @param accessToken The user's OAuth2 access token.
 * @returns The latest backup file or null if not found.
 */
export const findLatestBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
    const params = new URLSearchParams({
        q: `name contains '${BACKUP_FILE_PREFIX}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc', // Get the newest first
        pageSize: '1',
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error("Drive API Error (find latest file):", await response.json());
        throw new Error('Failed to search for backup file.');
    }

    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
};

/**
 * Lists all backup files for cleanup purposes.
 * @param accessToken The user's OAuth2 access token.
 * @returns An array of backup files, sorted from newest to oldest.
 */
export const listBackupFiles = async (accessToken: string): Promise<DriveFile[]> => {
    const params = new URLSearchParams({
        q: `name contains '${BACKUP_FILE_PREFIX}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc', // Newest first
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
     if (!response.ok) {
        console.error("Drive API Error (list files):", await response.json());
        throw new Error('Failed to list backup files.');
    }
    const data = await response.json();
    return data.files;
};

/**
 * Deletes old backups, keeping only the most recent ones defined by MAX_BACKUPS_TO_KEEP.
 * @param accessToken The user's OAuth2 access token.
 */
export const deleteOldBackups = async (accessToken: string) => {
    try {
        const files = await listBackupFiles(accessToken);
        if (files.length <= MAX_BACKUPS_TO_KEEP) {
            console.log("Backup cleanup: No old backups to delete.");
            return;
        }
        const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);
        console.log(`Backup cleanup: Deleting ${filesToDelete.length} old backups.`);
        
        for (const file of filesToDelete) {
            await fetch(`${DRIVE_API_URL}/${file.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: createHeaders(accessToken),
            });
        }
    } catch (error) {
        console.error("Failed during backup cleanup:", error);
        // Don't throw, as cleanup is not a critical failure.
    }
};

/**
 * Reads the content of a specific backup file from Google Drive.
 * @param accessToken The user's OAuth2 access token.
 * @param fileId The ID of the file to read.
 * @returns The synced data from the file.
 */
export const readBackupFile = async (accessToken: string, fileId: string): Promise<SyncedData> => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error("Drive API Error (read file):", await response.json());
        throw new Error('Failed to read backup file.');
    }
    return response.json();
};

/**
 * Creates a new, timestamped backup file in the appDataFolder and cleans up old backups.
 * @param data The application state to save.
 * @param accessToken The user's OAuth2 access token.
 */
export async function writeBackupFile(data: SyncedData, accessToken: string): Promise<void> {
    const timestamp = Date.now();
    const filename = `${BACKUP_FILE_PREFIX}${timestamp}.json`;
    
    const metadata = {
        name: filename,
        mimeType: 'application/json',
        parents: [FOLDER],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    
    const url = new URL(DRIVE_UPLOAD_URL);
    url.searchParams.set('uploadType', 'multipart');
    url.searchParams.set('fields', 'id, name');

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: createHeaders(accessToken),
        body: form,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Drive API Error (write file):", errorData);
        throw new Error(`Failed to create backup file.`);
    }

    console.log('State successfully saved to new backup file in Google Drive.');

    await deleteOldBackups(accessToken);
}

/**
 * Uploads a file for public sharing, used by nutritionists to share plans.
 * @param data The plan data to upload.
 * @param planName The name of the plan, used for the filename.
 * @param accessToken The user's OAuth2 access token.
 * @returns The file ID of the created public file.
 */
export async function uploadAndShareFile(data: object, planName: string, accessToken: string): Promise<string | null> {
    const safePlanName = planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `lifepulse-plan-${safePlanName}-${Date.now()}.json`;

    const metadata = {
        name: fileName,
        mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const uploadResponse = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: createHeaders(accessToken),
        body: form
    });
    
    if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.json();
        console.error("Google Drive Upload Error:", errorBody);
        throw new Error('Failed to upload file to Google Drive.');
    }

    const fileData = await uploadResponse.json();
    const fileId = fileData.id;

    if (!fileId) {
        throw new Error('Could not get file ID after upload.');
    }

    const permissionsResponse = await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
        method: 'POST',
        headers: {
            ...createHeaders(accessToken),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
        })
    });

    if (!permissionsResponse.ok) {
        try {
            await fetch(`${DRIVE_API_URL}/${fileId}`, {
                method: 'DELETE',
                headers: createHeaders(accessToken)
            });
        } catch(e) {
            console.error("Failed to clean up file after permission error", e);
        }
        
        const errorBody = await permissionsResponse.json();
        console.error("Google Drive Permissions Error:", errorBody);
        throw new Error('Failed to set public permissions for the file.');
    }
    
    return fileId;
}

/**
 * Reads the content of a publicly shared file from Google Drive using an API key.
 * @param fileId The ID of the public file.
 * @returns The JSON content of the file.
 */
export const readSharedFile = async (fileId: string): Promise<any> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is not configured for file downloads.");
    }
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        let errorMessage = `Failed to download plan from Google Drive. Status: ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody.error?.message) {
                errorMessage = errorBody.error.message;
            }
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMessage);
    }
    return response.json();
};