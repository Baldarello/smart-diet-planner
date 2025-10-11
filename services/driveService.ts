import { SyncedData } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const FILENAME = 'diet-plan-data.json';

/**
 * Finds the ID of the app's data file in the user's Google Drive AppData folder.
 * @param accessToken The user's OAuth2 access token.
 * @returns The file ID or null if not found.
 */
async function findFileId(accessToken: string): Promise<string | null> {
    const url = `${DRIVE_API_URL}?spaces=appDataFolder&fields=files(id,name)`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error('Could not search for file in Google Drive.');
    }
    const data = await response.json();
    const file = data.files.find((f: { name: string }) => f.name === FILENAME);
    return file ? file.id : null;
}

/**
 * Saves the application state to a file in the user's Google Drive AppData folder.
 * This will create the file if it doesn't exist, or update it if it does.
 * @param data The entire application state and progress history to save.
 * @param accessToken The user's OAuth2 access token.
 */
export async function saveStateToDrive(data: SyncedData, accessToken: string): Promise<void> {
    const fileId = await findFileId(accessToken);
    
    const metadata = {
        name: FILENAME,
        mimeType: 'application/json',
        ...(fileId ? {} : { parents: ['appDataFolder'] }) // Create in appDataFolder if new
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const uploadUrl = fileId 
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const response = await fetch(uploadUrl, {
        method: fileId ? 'PATCH' : 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Google Drive API Error:", errorBody);
        throw new Error('Failed to save data to Google Drive.');
    }

    console.log('State successfully saved to Google Drive.');
}

/**
 * Loads the application state from Google Drive.
 * @param accessToken The user's OAuth2 access token.
 * @returns The stored state or null if not found or on error.
 */
export async function loadStateFromDrive(accessToken: string): Promise<SyncedData | null> {
    const fileId = await findFileId(accessToken);
    if (!fileId) {
        console.log("No data file found in Google Drive.");
        return null;
    }

    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error('Failed to load data from Google Drive.');
    }
    
    return await response.json() as SyncedData;
}