import { SyncedData } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILE_PREFIX = 'lifepulse_backup_';
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

export async function getOrCreateFolderId(accessToken: string, name: string, parentId: string = 'root'): Promise<string> {
    const headers = createHeaders(accessToken);
    // Search for folder first
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
    const searchResponse = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(q)}&fields=files(id)`, { headers });
    if (!searchResponse.ok) throw new Error(`Failed to search for folder '${name}'.`);
    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // Create folder if not found
    const metadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] };
    const createResponse = await fetch(DRIVE_API_URL, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
    });
    if (!createResponse.ok) throw new Error(`Failed to create folder '${name}'.`);
    const createData = await createResponse.json();
    return createData.id;
}

// Finds a file by name in a specific parent folder.
export async function findFileByName(accessToken: string, parentId: string, name: string): Promise<DriveFile | null> {
    const q = `name = '${name}' and '${parentId}' in parents and trashed=false`;
    const response = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(q)}&fields=files(id, name, createdTime)`, { headers: createHeaders(accessToken) });
    if (!response.ok) throw new Error(`Failed to find file by name '${name}'.`);
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
}

// Uploads or updates a file. If fileId is provided, it updates. Otherwise, it creates.
export async function uploadOrUpdateFile(accessToken: string, parentId: string, fileName: string, data: object, fileId?: string): Promise<string> {
    const metadata: { name: string, mimeType: string, parents?: string[] } = { name: fileName, mimeType: 'application/json' };
    if (!fileId) {
        metadata.parents = [parentId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const url = fileId
        ? `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart&supportsAllDrives=true`
        : `${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true`;
    
    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(url, { method, headers: createHeaders(accessToken), body: form });
    if (!response.ok) {
        const errorBody = await response.json();
        console.error(`Failed to ${method} file '${fileName}'.`, errorBody);
        throw new Error(`Failed to ${method} file '${fileName}'.`);
    }
    const responseData = await response.json();
    return responseData.id;
}

export async function uploadOrUpdateFileByName(accessToken: string, parentId: string, fileName: string, data: object): Promise<string> {
    const existingFile = await findFileByName(accessToken, parentId, fileName);
    return uploadOrUpdateFile(accessToken, parentId, fileName, data, existingFile?.id);
}


export async function readFile(accessToken: string, fileId: string): Promise<any> {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media&supportsAllDrives=true`, { headers: createHeaders(accessToken) });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to read file ID ${fileId}.`);
    }
    return response.json();
}

export async function readFileByName(accessToken: string, parentId: string, fileName: string): Promise<any | null> {
    const file = await findFileByName(accessToken, parentId, fileName);
    if (!file) {
        return null;
    }
    return readFile(accessToken, file.id);
}


export async function listFiles(accessToken: string, folderId: string, mimeType?: string): Promise<DriveFile[]> {
    let q = `'${folderId}' in parents and trashed=false`;
    if (mimeType) {
        q += ` and mimeType='${mimeType}'`;
    }
    const params = new URLSearchParams({
        q,
        fields: 'files(id, name, createdTime)',
        orderBy: 'name',
        pageSize: '1000'
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, { headers: createHeaders(accessToken) });
    if (!response.ok) throw new Error(`Failed to list files in folder ${folderId}.`);
    const data = await response.json();
    return data.files || [];
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?supportsAllDrives=true`, { method: 'DELETE', headers: createHeaders(accessToken) });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete file ID ${fileId}.`);
    }
}

export async function deleteFolder(accessToken: string, folderId: string): Promise<void> {
    const files = await listFiles(accessToken, folderId);
    for (const file of files) {
        if (file.name.startsWith('patient_')) { // It's a folder
            await deleteFolder(accessToken, file.id);
        } else {
            await deleteFile(accessToken, file.id);
        }
    }
    await deleteFile(accessToken, folderId); // Delete the now-empty folder
}


// Patient-specific functions (legacy backup system, retained for patient app)
export const listBackupFilesGeneric = async (accessToken: string, prefix: string, parentFolderId: string): Promise<DriveFile[]> => {
    const params = new URLSearchParams({
        q: `name contains '${prefix}' and '${parentFolderId}' in parents and trashed=false`,
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

const deleteOldBackupsGeneric = async (accessToken: string, prefix: string, parentFolderId: string) => {
    try {
        const files = await listBackupFilesGeneric(accessToken, prefix, parentFolderId);
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

export const findLatestBackupFile = async (accessToken: string, parentFolderId: string): Promise<DriveFile | null> => {
    const files = await listBackupFilesGeneric(accessToken, BACKUP_FILE_PREFIX, parentFolderId);
    return files.length > 0 ? files[0] : null;
};
export const readBackupFile = async (accessToken: string, fileId: string): Promise<SyncedData> => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, { headers: createHeaders(accessToken) });
    if (!response.ok) throw new Error('Failed to read backup file.');
    return response.json();
};
export async function writeBackupFile(data: SyncedData, accessToken: string, parentFolderId: string): Promise<void> {
    const filename = `${BACKUP_FILE_PREFIX}${Date.now()}.json`;
    const metadata = { name: filename, mimeType: 'application/json', parents: [parentFolderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`;
    const response = await fetch(url, { method: 'POST', headers: createHeaders(accessToken), body: form });
    if (!response.ok) throw new Error('Failed to create backup file.');
    await deleteOldBackupsGeneric(accessToken, BACKUP_FILE_PREFIX, parentFolderId);
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
