import { Process } from './types';

// ===================================================================
// PASO 1: REEMPLAZA ESTOS VALORES CON TUS CLAVES DE JSONBIN.IO
// ===================================================================
// 1. Entra en https://jsonbin.io/
// 2. Ve a la pestaña "API Keys" en el menú de la izquierda y copia tu "Master Key".
// FIX: Explicitly type constants as string to prevent literal type inference error during comparison.
const JSONBIN_API_KEY: string = 'TU_API_KEY_VA_AQUI'; 

// 3. Este es el ID del Bin que creaste.
const JSONBIN_BIN_ID: string = '691327f743b1c97be9a6b72e';
// ===================================================================

const BASE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

interface AppState {
    processes: Process[];
    taskOptions: string[];
    assigneeOptions: string[];
}

export const fetchData = async (): Promise<AppState> => {
    // No intentes hacer fetch si las claves no están configuradas.
    if (JSONBIN_API_KEY === 'TU_API_KEY_VA_AQUI' || JSONBIN_BIN_ID === 'EL_ID_DE_TU_BIN_VA_AQUI') {
        throw new Error("API Key o Bin ID no configurados.");
    }

    const response = await fetch(`${BASE_URL}/latest`, {
        headers: {
            'X-Master-Key': JSONBIN_API_KEY,
        }
    });

    if (response.status === 404) {
        // Bin no encontrado, es la primera ejecución. Se creará al guardar.
        return { processes: [], taskOptions: [], assigneeOptions: [] };
    }

    if (!response.ok) {
        throw new Error('No se pudieron obtener los datos. Verifica tus claves de API y el ID del Bin.');
    }

    const data = await response.json();
    // Asegurarse de que el 'record' no esté vacío o malformado
    return data.record && typeof data.record === 'object' ? data.record : { processes: [], taskOptions: [], assigneeOptions: [] };
};

export const updateData = async (data: AppState): Promise<void> => {
    if (JSONBIN_API_KEY === 'TU_API_KEY_VA_AQUI' || JSONBIN_BIN_ID === 'EL_ID_DE_TU_BIN_VA_AQUI') {
       console.warn("JSONBin API Key o Bin ID no configurados. Cambios no guardados remotamente.");
       return;
    }
    
    const response = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`No se pudieron guardar los datos: ${errorData.message}`);
    }
};
