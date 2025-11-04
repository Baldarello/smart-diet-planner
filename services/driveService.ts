import { SyncedData } from '../types';
import { NutritionistSyncedData } from './syncService';


const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILE_PREFIX = 'lifepulse_backup_';
const NUTRITIONIST_BACKUP_PREFIX = 'lifepulse_nutritionist_backup_';
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

const listBackupFilesGeneric = async (accessToken: string, prefix: string): Promise<DriveFile[]> => {
    const params = new URLSearchParams({
        q: `name contains '${prefix}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error(`Drive API Error (list files with prefix ${prefix}):`, await response.json());
        throw new Error(`Failed to list backup files with prefix ${prefix}.`);
    }
    const data = await response.json();
    return data.files;
};

const deleteOldBackupsGeneric = async (accessToken: string, prefix: string) => {
    try {
        const files = await listBackupFilesGeneric(accessToken, prefix);
        if (files.length <= MAX_BACKUPS_TO_KEEP) {
            return;
        }
        const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);
        for (const file of filesToDelete) {
            await fetch(`${DRIVE_API_URL}/${file.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: createHeaders(accessToken),
            });
        }
    } catch (error) {
        console.error(`Failed during backup cleanup for prefix ${prefix}:`, error);
    }
};

// Patient-specific functions
export const findLatestBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
    const files = await listBackupFilesGeneric(accessToken, BACKUP_FILE_PREFIX);
    return files.length > 0 ? files[0] : null;
};
export const readBackupFile = async (accessToken: string, fileId: string): Promise<SyncedData> => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, { headers: createHeaders(accessToken) });
    if (!response.ok) throw new Error('Failed to read backup file.');
    return response.json();
};
export async function writeBackupFile(data: SyncedData, accessToken: string): Promise<void> {
    const filename = `${BACKUP_FILE_PREFIX}${Date.now()}.json`;
    const metadata = { name: filename, mimeType: 'application/json', parents: [FOLDER] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`;
    const response = await fetch(url, { method: 'POST', headers: createHeaders(accessToken), body: form });
    if (!response.ok) throw new Error('Failed to create backup file.');
    await deleteOldBackupsGeneric(accessToken, BACKUP_FILE_PREFIX);
}

// Nutritionist-specific functions
export const findLatestNutritionistBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
    const files = await listBackupFilesGeneric(accessToken, NUTRITIONIST_BACKUP_PREFIX);
    return files.length > 0 ? files[0] : null;
};
export const readNutritionistBackupFile = async (accessToken: string, fileId: string): Promise<NutritionistSyncedData> => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, { headers: createHeaders(accessToken) });
    if (!response.ok) throw new Error('Failed to read nutritionist backup file.');
    return response.json();
};
export async function writeNutritionistBackupFile(data: NutritionistSyncedData, accessToken: string): Promise<void> {
    const filename = `${NUTRITIONIST_BACKUP_PREFIX}${Date.now()}.json`;
    const metadata = { name: filename, mimeType: 'application/json', parents: [FOLDER] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`;
    const response = await fetch(url, { method: 'POST', headers: createHeaders(accessToken), body: form });
    if (!response.ok) throw new Error('Failed to create nutritionist backup file.');
    await deleteOldBackupsGeneric(accessToken, NUTRITIONIST_BACKUP_PREFIX);
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

    const uploadResponse = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id&supportsAllDrives=true`, {
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
    
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Reads the content of a publicly shared file from a Google Drive URL.
 * @param driveUrl The direct URL to the Google Drive file content.
 * @returns The JSON content of the file.
 */
export const readSharedFile = async (driveUrl: string): Promise<any> => {
    if (!driveUrl || !driveUrl.includes('drive.google.com')) {
        console.error("Invalid Google Drive URL provided for sharing:", driveUrl);
        throw new Error("Invalid shared plan URL provided.");
    }

    try {
        // Prepend a CORS proxy to the Google Drive URL to bypass browser restrictions.
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(driveUrl)}`;
        console.log("Fetching shared plan from URL:", proxyUrl);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            if (response.status === 404 && response.url.includes('corsproxy.io')) {
                throw new Error(`Failed to fetch from proxy. The original URL might be invalid or unreachable.`);
            }
            throw new Error(`Failed to fetch shared plan. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Basic validation to ensure the fetched data has the correct structure.
        if (data && data.weeklyPlan && data.shoppingList) {
            return data;
        } else {
            console.warn("Fetched data has invalid format.", data);
            throw new Error("Shared plan has an invalid format.");
        }
    } catch (error) {
        console.error("Failed to read or parse shared file:", error);
        // Re-throw the original error if it's already an Error instance, otherwise wrap it.
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(String(error));
    }
};