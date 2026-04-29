// DOM Elements
const excelFileInput = document.getElementById('excelFile');
const imageFilesInput = document.getElementById('imageFiles');
const excelDropZone = document.getElementById('excelDropZone');
const imageDropZone = document.getElementById('imageDropZone');
const previewSection = document.getElementById('previewSection');
const progressSection = document.getElementById('progressSection');
const uploadSection = document.getElementById('uploadSection');
const previewTableBody = document.getElementById('previewTableBody');
const btnProcess = document.getElementById('btnProcess');

// Stats
const statTotal = document.getElementById('statTotal');
const statReady = document.getElementById('statReady');
const statMissing = document.getElementById('statMissing');

// State
let parsedExcelData = [];
let imageMap = new Map();
let validatedRecords = [];
let localHistory = JSON.parse(localStorage.getItem('qr_local_history')) || [];

// ==========================================
// Check Login & Logout
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('qr_jwt_token');
    if (!token && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos reales del usuario en el sidebar
    const userName = localStorage.getItem('qr_user_name') || 'Administrador';
    const userEmail = localStorage.getItem('qr_user_email') || 'admin@ssp.gob.mx';
    
    const nameLabel = document.getElementById('userNameLabel');
    const emailLabel = document.getElementById('userEmailLabel');
    const avatarImg = document.getElementById('userAvatar');

    if (nameLabel) nameLabel.innerText = userName;
    if (emailLabel) emailLabel.innerText = userEmail;
    if (avatarImg) {
        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff&bold=true`;
    }

    renderHistory();
});

function logout() {
    localStorage.removeItem('qr_jwt_token');
    window.location.href = 'login.html';
}

// ==========================================
// Navigation & Views
// ==========================================
function showSection(sectionId) {
    const uploadView = document.getElementById('uploadSectionView');
    const historyView = document.getElementById('historySectionView');
    const navUpload = document.getElementById('navUpload');
    const navHistory = document.getElementById('navHistory');
    
    // Indicators
    const indUpload = document.getElementById('navUploadIndicator');
    const indHistory = document.getElementById('navHistoryIndicator');

    if (sectionId === 'uploadSectionView') {
        uploadView.classList.remove('hidden');
        historyView.classList.add('hidden');
        navUpload.classList.add('bg-blue-600/10', 'text-blue-400');
        navUpload.classList.remove('hover:bg-slate-800', 'hover:text-white');
        navHistory.classList.remove('bg-blue-600/10', 'text-blue-400');
        navHistory.classList.add('hover:bg-slate-800', 'hover:text-white');
        indUpload.classList.remove('hidden');
        indHistory.classList.add('hidden');
    } else {
        uploadView.classList.add('hidden');
        historyView.classList.remove('hidden');
        navHistory.classList.add('bg-blue-600/10', 'text-blue-400');
        navHistory.classList.remove('hover:bg-slate-800', 'hover:text-white');
        navUpload.classList.remove('bg-blue-600/10', 'text-blue-400');
        navUpload.classList.add('hover:bg-slate-800', 'hover:text-white');
        indHistory.classList.remove('hidden');
        indUpload.classList.add('hidden');
        renderHistory();
    }
}

// ==========================================
// History Management
// ==========================================
function saveToHistory(record) {
    const entry = {
        numberAgent: record.numberAgent,
        fullName: `${record.name} ${record.firstSurname} ${record.secondSurname || ''}`.trim(),
        groupName: record.groupName || 'Sin Grupo',
        location: `${record.state || '-'}, ${record.municipality || '-'}`,
        vialidad: record.isVialidad,
        canFine: record.canFine,
        timestamp: new Date().toISOString()
    };
    // Prepend (add to top)
    localHistory.unshift(entry);
    localStorage.setItem('qr_local_history', JSON.stringify(localHistory));
}

function clearHistory() {
    if (confirm("¿Estás seguro de eliminar el historial local de oficiales subidos? (Esto no los elimina de la base de datos)")) {
        localHistory = [];
        localStorage.removeItem('qr_local_history');
        renderHistory();
    }
}

function renderHistory(filter = '') {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');
    if(!tbody || !emptyState) return;

    tbody.innerHTML = '';
    
    const filtered = localHistory.filter(h => 
        h.fullName.toLowerCase().includes(filter.toLowerCase()) || 
        h.numberAgent.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        filtered.forEach(h => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            
            // badges para permisos
            let badges = '';
            if (h.vialidad) badges += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 mr-2">Vialidad</span>';
            if (h.canFine) badges += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Multa</span>';
            if (!h.vialidad && !h.canFine) badges = '<span class="text-xs text-slate-400">Sin permisos extra</span>';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 border-b border-slate-100">#${h.numberAgent}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 border-b border-slate-100">${h.fullName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-b border-slate-100">${h.groupName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 border-b border-slate-100">${h.location}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center border-b border-slate-100">${badges}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Escuchar input de búsqueda en historial
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => renderHistory(e.target.value));
}

const REQUIRED_EXCEL_COLUMNS = [
    'Nombre', 
    'Primer apellido', 
    'Numero de agente', 
    'Agente de vialidad', 
    'Puede multar'
];

// ==========================================
// Descargar Formato Excel
// ==========================================
function downloadFormat() {
    // Si ya hay datos cargados, exportamos esos datos.
    // Si no, generamos un formato en blanco con las columnas requeridas
    let dataToExport = [];
    if (parsedExcelData && parsedExcelData.length > 0) {
        dataToExport = parsedExcelData;
    } else {
        // Objeto vacío con las columnas necesarias
        const emptyRow = {};
        REQUIRED_EXCEL_COLUMNS.forEach(col => emptyRow[col] = '');
        // Agregamos algunas columnas opcionales útiles para el template
        emptyRow['Segundo apellido'] = '';
        emptyRow['Nombre de grupo'] = '';
        emptyRow['Municipio'] = '';
        emptyRow['Estado'] = '';
        emptyRow['CreatedUser'] = '1';
        dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Oficiales");
    
    // Descargar archivo
    XLSX.writeFile(workbook, "Formato_Registro_Oficiales.xlsx");
}
const MAX_IMAGE_SIZE_MB = 5;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ==========================================
// Modal UI Helpers
// ==========================================
function openFormatGuide() {
    const modal = document.getElementById('formatGuideModal');
    const content = document.getElementById('formatGuideContent');
    modal.classList.remove('hidden');
    // Pequeño delay para permitir que el display:block se aplique antes de la animación
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeFormatGuide() {
    const modal = document.getElementById('formatGuideModal');
    const content = document.getElementById('formatGuideContent');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); // 300ms debe coincidir con la clase duration-300 de tailwind
}

function openConfigModal() {
    document.getElementById('configModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('configModal').classList.remove('opacity-0');
        document.getElementById('configContent').classList.remove('opacity-0', 'scale-95');
    }, 10);
    const savedToken = localStorage.getItem('qr_jwt_token');
    const savedApiUrl = localStorage.getItem('qr_api_url') || 'https://localhost:7150/api';
    
    if(savedToken) document.getElementById('jwtTokenInput').value = savedToken;
    document.getElementById('apiBaseUrlInput').value = savedApiUrl;
}

function closeConfigModal() {
    const modal = document.getElementById('configModal');
    const content = document.getElementById('configContent');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function saveConfigModal() {
    const tokenInput = document.getElementById('jwtTokenInput').value.trim();
    const apiUrlInput = document.getElementById('apiBaseUrlInput').value.trim();
    
    if (tokenInput) {
        localStorage.setItem('qr_jwt_token', tokenInput);
    } else {
        localStorage.removeItem('qr_jwt_token');
    }
    
    if (apiUrlInput) {
        localStorage.setItem('qr_api_url', apiUrlInput);
    } else {
        localStorage.setItem('qr_api_url', 'https://localhost:7150/api');
    }
    
    closeConfigModal();
    
    // Feedback visual opcional
    const originIcon = document.querySelector('a[onclick="openConfigModal()"] i');
    if(originIcon) {
        originIcon.classList.replace('text-slate-400', 'text-emerald-500');
        setTimeout(() => originIcon.classList.replace('text-emerald-500', 'text-slate-400'), 1500);
    }
}

// ==========================================
// UI Helpers
// ==========================================
function showFeedback(elementId, type, message, list = []) {
    const el = document.getElementById(elementId);
    el.className = "mt-3 p-3 rounded-lg text-sm border shadow-sm animate-fade-in custom-scrollbar";
    
    if (type === 'error') {
        el.classList.add('bg-red-50', 'border-red-200', 'text-red-800');
        message = `<div class="flex items-center gap-2 font-semibold"><i class="ph-fill ph-warning-octagon text-lg"></i> ${message}</div>`;
    } else if (type === 'success') {
        el.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        message = `<div class="flex items-center gap-2 font-semibold"><i class="ph-fill ph-check-circle text-lg"></i> ${message}</div>`;
    } else if (type === 'warning') {
        el.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-800', 'max-h-32', 'overflow-y-auto');
        message = `<div class="flex items-center gap-2 font-semibold"><i class="ph-fill ph-warning text-lg"></i> ${message}</div>`;
    }

    if (list.length > 0) {
        message += `<ul class="mt-2 text-xs list-disc list-inside pl-6 space-y-1 opacity-90 font-mono">`;
        list.forEach(item => message += `<li>${item}</li>`);
        message += `</ul>`;
    }

    el.innerHTML = message;
    el.classList.remove('hidden');
}
function showAlert(type, title, message) {
    const alertBox = document.getElementById('alertContainer');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');

    alertBox.className = "hidden rounded-xl p-4 border-l-4 shadow-sm bg-white animate-fade-in";
    alertTitle.innerText = title;
    alertMessage.innerHTML = message;

    if (type === 'error') {
        alertBox.classList.add('border-red-500');
        alertTitle.classList.add('text-red-800');
        alertMessage.classList.add('text-red-700');
        alertIcon.innerHTML = `<i class="ph-fill ph-warning-octagon text-2xl text-red-500"></i>`;
    } else if (type === 'warning') {
        alertBox.classList.add('border-amber-500');
        alertTitle.classList.add('text-amber-800');
        alertMessage.classList.add('text-amber-700');
        alertIcon.innerHTML = `<i class="ph-fill ph-warning text-2xl text-amber-500"></i>`;
    } else if (type === 'success') {
        alertBox.classList.add('border-emerald-500');
        alertTitle.classList.add('text-emerald-800');
        alertMessage.classList.add('text-emerald-700');
        alertIcon.innerHTML = `<i class="ph-fill ph-check-circle text-2xl text-emerald-500"></i>`;
    }
    
    alertBox.classList.remove('hidden');
}

function hideAlert() {
    const alertBox = document.getElementById('alertContainer');
    if (alertBox) alertBox.classList.add('hidden');
}

// ==========================================
// Drag & Drop
// ==========================================
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    excelDropZone.addEventListener(eventName, preventDefaults, false);
    imageDropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    excelDropZone.addEventListener(eventName, () => excelDropZone.classList.add('dragover'), false);
    imageDropZone.addEventListener(eventName, () => imageDropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    excelDropZone.addEventListener(eventName, () => excelDropZone.classList.remove('dragover'), false);
    imageDropZone.addEventListener(eventName, () => imageDropZone.classList.remove('dragover'), false);
});

// File Handlers
excelFileInput.addEventListener('change', handleExcelSelect);
imageFilesInput.addEventListener('change', (e) => processImageFiles(e.target.files));

excelDropZone.addEventListener('drop', (e) => {
    excelFileInput.files = e.dataTransfer.files;
    handleExcelSelect();
});

imageDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('dragover');
    showFeedback('imageFeedback', 'warning', '<i class="ph ph-spinner-gap animate-spin text-lg"></i> Leyendo contenido de la carpeta, por favor espere...');
    const files = await getFilesFromDataTransfer(e.dataTransfer);
    processImageFiles(files);
});

// Recursively get files from dropped items (Folders)
async function getFilesFromDataTransfer(dataTransfer) {
    const files = [];
    if (dataTransfer.items) {
        const promises = [];
        for (let i = 0; i < dataTransfer.items.length; i++) {
            const item = dataTransfer.items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) promises.push(traverseFileTree(entry, files));
            }
        }
        await Promise.all(promises);
    } else {
        for (let i = 0; i < dataTransfer.files.length; i++) {
            files.push(dataTransfer.files[i]);
        }
    }
    return files;
}

function traverseFileTree(item, files) {
    return new Promise((resolve) => {
        if (item.isFile) {
            item.file((file) => {
                files.push(file);
                resolve();
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const readAllEntries = () => {
                dirReader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        resolve();
                    } else {
                        const promises = [];
                        for (let i = 0; i < entries.length; i++) {
                            promises.push(traverseFileTree(entries[i], files));
                        }
                        await Promise.all(promises);
                        readAllEntries(); // Llama de nuevo por si hay más de 100 archivos en el lote del reader
                    }
                });
            };
            readAllEntries();
        } else {
            resolve();
        }
    });
}

// ==========================================
// Processing local files
// ==========================================
function handleExcelSelect() {
    hideAlert();
    const file = excelFileInput.files[0];
    if (!file) return;

    // Validate extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(extension)) {
        showFeedback('excelFeedback', 'error', 'Formato incorrecto. Solo se admiten archivos .xls o .xlsx');
        document.getElementById('excelFileName').innerText = 'Archivo inválido';
        parsedExcelData = [];
        return;
    }

    // UI Update
    const excelNameSpan = document.getElementById('excelFileName');
    excelNameSpan.innerText = file.name;
    excelNameSpan.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
    document.getElementById('excelDropText').innerText = "Archivo cargado correctamente";

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (rawData.length === 0) {
                showFeedback('excelFeedback', 'error', 'El Excel cargado no contiene registros. Verifique el archivo.');
                parsedExcelData = [];
                return;
            }

            // Validate Columns
            const headers = Object.keys(rawData[0] || {});
            const missingCols = REQUIRED_EXCEL_COLUMNS.filter(col => !headers.includes(col));
            
            if (missingCols.length > 0) {
                showFeedback('excelFeedback', 'error', 'El archivo no tiene la estructura correcta.', [`Columnas faltantes: ${missingCols.join(', ')}`]);
                parsedExcelData = [];
                return;
            }

            parsedExcelData = rawData.map(row => {
                let cleanRow = {};
                for (let key in row) cleanRow[key.trim()] = row[key];
                return cleanRow;
            });

            showFeedback('excelFeedback', 'success', `Archivo verificado. Se encontraron ${parsedExcelData.length} registros listos.`);

            checkReadiness();
        } catch (error) {
            showFeedback('excelFeedback', 'error', 'El formato del Excel es inválido o está corrupto.');
            parsedExcelData = [];
        }
    };
    reader.readAsArrayBuffer(file);
}

async function processImageFiles(filesList) {
    hideAlert();
    if (!filesList || filesList.length === 0) return;

    const totalFiles = filesList.length;
    let validCount = 0;
    let errorCount = 0;
    let errorDetails = [];

    imageMap.clear();

    showFeedback('imageFeedback', 'warning', `<i class="ph ph-spinner-gap animate-spin text-lg inline-block"></i> Procesando ${totalFiles} archivos. Esto puede tomar unos segundos...`);
    
    // Se procesa en "Chunks" (lotes) para evitar que la pestaña del navegador se congele si hay 5,000+ archivos
    const CHUNK_SIZE = 250; 
    const filesArray = Array.from(filesList);

    for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
        const chunk = filesArray.slice(i, i + CHUNK_SIZE);
        
        for (let file of chunk) {
            // Ignorar archivos ocultos o de sistema (ej. .DS_Store, Thumbs.db)
            if (file.name.startsWith('.')) continue;

            // Validación de tamaño (Max MB)
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > MAX_IMAGE_SIZE_MB) {
                errorCount++;
                if (errorDetails.length < 50) errorDetails.push(`[${file.name}] Excede ${MAX_IMAGE_SIZE_MB}MB`);
                continue;
            }

            // Validación de formato
            if (!VALID_IMAGE_TYPES.includes(file.type)) {
                errorCount++;
                if (errorDetails.length < 50) errorDetails.push(`[${file.name}] Formato no válido`);
                continue;
            }

            validCount++;
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            imageMap.set(nameWithoutExt.trim(), file);
        }

        // Actualizar UI de progreso en tiempo real
        document.getElementById('imageDropText').innerText = `Analizando... ${Math.min(i + CHUNK_SIZE, totalFiles)} / ${totalFiles}`;
        
        // "Respirar": permite que el navegador refresque la interfaz (10 milisegundos de pausa)
        await new Promise(r => setTimeout(r, 10));
    }

    if (errorCount > 50) errorDetails.push(`... y ${errorCount - 50} errores más se omitieron de la lista.`);

    // UI Update Final
    const imageCountText = document.getElementById('imageCountText');
    imageCountText.innerText = `${validCount} foto(s) validadas correctamente`;
    document.getElementById('imageDropText').innerText = "Análisis completado";
    
    if (validCount > 0) {
        imageCountText.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
    }

    if (errorCount > 0) {
        if (validCount === 0) {
            showFeedback('imageFeedback', 'error', `Todos los archivos de la carpeta (${errorCount}) fueron rechazados.`, errorDetails);
        } else {
            showFeedback('imageFeedback', 'warning', `Se validaron ${validCount} imágenes, pero ${errorCount} archivos fueron ignorados/rechazados:`, errorDetails);
        }
    } else if (validCount > 0) {
        showFeedback('imageFeedback', 'success', `Se revisó la carpeta con éxito. ${validCount} imágenes verificadas (Formato y peso óptimo).`);
    }

    checkReadiness();
}

function checkReadiness() {
    if (parsedExcelData.length > 0) generatePreview();
}

// ==========================================
// Preview Generation
// ==========================================
function generatePreview() {
    validatedRecords = [];
    previewTableBody.innerHTML = "";
    
    let countReady = 0;
    let countMissing = 0;
    let missingPhotoList = [];

    parsedExcelData.forEach((row, index) => {
        // Extraer usando las cabeceras exactas en español
        const name = String(row['Nombre'] || "").trim();
        const firstSurname = String(row['Primer apellido'] || "").trim();
        const secondSurname = String(row['Segundo apellido'] || "").trim();
        const numberAgent = String(row['Numero de agente'] || "").trim();
        
        // Función para buscar columna sin importar mayúsculas/minúsculas
        const getVal = (names) => {
            for (let name of names) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
                if (foundKey) return String(row[foundKey] || "").trim();
            }
            return "";
        };

        const groupName = getVal(['Nombre de grupo', 'Grupo', 'Agrupación', 'Corporación', 'Agrupamiento']);
        const municipality = getVal(['Municipio', 'Delegación', 'Ciudad', 'Población']);
        const state = getVal(['Estado', 'Entidad', 'Provincia']);
        
        // Manejo robusto de booleanos desde excel en español (SI/NO, TRUE/FALSE, 1/0)
        const vialidadVal = getVal(['Agente de vialidad', 'Vialidad']).toLowerCase();
        const isVialidad = vialidadVal === 'true' || vialidadVal === '1' || vialidadVal === 'si' || vialidadVal === 'sí';
        
        const multaVal = getVal(['Puede multar', 'Multa']).toLowerCase();
        const canFine = multaVal === 'true' || multaVal === '1' || multaVal === 'si' || multaVal === 'sí';
        
        const hasPhoto = imageMap.has(numberAgent);
        
        if (hasPhoto) countReady++;
        else {
            countMissing++;
            if (numberAgent) missingPhotoList.push(numberAgent);
        }

        validatedRecords.push({
            rowNumber: index + 2,
            numberAgent,
            name,
            firstSurname,
            secondSurname,
            isVialidad,
            canFine,
            groupName,
            municipality,
            state,
            photoFile: imageMap.get(numberAgent) || null,
            createdUser: 1
        });

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors group";
        
        const fullName = [name, firstSurname, secondSurname].filter(Boolean).join(" ");
        
        const photoBadge = hasPhoto 
            ? `<span class="badge badge-success"><i class="ph-bold ph-check mr-1"></i> Asignada</span>`
            : `<span class="badge badge-warning"><i class="ph-bold ph-warning mr-1"></i> Pendiente</span>`;

        tr.innerHTML = `
            <td class="py-3 px-6 font-mono text-slate-800 font-medium group-hover:text-blue-600 transition-colors">${numberAgent || '-'}</td>
            <td class="py-3 px-6">${fullName || '<span class="text-red-400 text-xs italic">Dato faltante</span>'}</td>
            <td class="py-3 px-6 text-center">${isVialidad ? '<i class="ph-bold ph-shield-check text-emerald-500 text-lg"></i>' : '<span class="text-slate-300">-</span>'}</td>
            <td class="py-3 px-6 text-center">${canFine ? '<i class="ph-bold ph-ticket text-emerald-500 text-lg"></i>' : '<span class="text-slate-300">-</span>'}</td>
            <td class="py-3 px-6 text-center">${photoBadge}</td>
        `;
        
        previewTableBody.appendChild(tr);
    });

    statTotal.innerText = validatedRecords.length;
    statReady.innerText = countReady;
    statMissing.innerText = countMissing;

    previewSection.classList.remove('hidden');

    if (countMissing > 0 && imageMap.size > 0) {
        showAlert('warning', 'Validación de Fotografías', `Faltan las fotos para <b>${countMissing}</b> agentes registrados en el Excel.<br><span class="text-xs mt-1 block">Los agentes sin foto serán guardados en el sistema pero requerirán una actualización fotográfica posterior.</span>`);
    } else if (imageMap.size === 0) {
        showAlert('warning', 'Paso 2 Incompleto', 'Falta seleccionar la carpeta de fotografías correspondientes a este listado.');
        btnProcess.disabled = true;
        return;
    }

    btnProcess.disabled = false;
    // Auto-scroll al preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// API Submission
// ==========================================
btnProcess.addEventListener('click', async () => {
    // Verificar si el token JWT existe
    const token = localStorage.getItem('qr_jwt_token');
    if (!token) {
        openConfigModal();
        alert("Atención: Necesitas configurar tu Token de Autorización (JWT) antes de iniciar el proceso. Sin él, no se podrán crear ni asignar los grupos policiales.");
        return;
    }

    // Confirmación nativa simple
    if (!confirm(`¿Autoriza la importación de ${validatedRecords.length} expedientes a la base de datos oficial?`)) return;

    hideAlert();
    uploadSection.parentElement.classList.add('hidden'); // Oculta la tarjeta completa de upload
    previewSection.classList.add('hidden');
    progressSection.classList.remove('hidden');

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercentage = document.getElementById('progressPercentage');
    const consoleLog = document.getElementById('consoleLog');

    let successCount = 0;
    let errorCount = 0;

    const logToConsole = (msg, type = 'info') => {
        const div = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString('es-MX', { hour12: false });
        let colorClass = "text-slate-400";
        let icon = "info";

        if (type === 'success') { colorClass = "text-emerald-400"; icon = "check-circle"; }
        if (type === 'error') { colorClass = "text-red-400"; icon = "x-circle"; }
        if (type === 'warn') { colorClass = "text-amber-400"; icon = "warning"; }

        div.className = `mb-1.5 ${colorClass} flex items-start gap-2`;
        div.innerHTML = `
            <span class="opacity-50 font-mono text-xs mt-0.5">[${timestamp}]</span> 
            <i class="ph-bold ph-${icon} mt-0.5"></i>
            <span class="flex-1">${msg}</span>
        `;
        consoleLog.appendChild(div);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    };

    logToConsole("Iniciando handshake con servidor SSP...", "info");

    // Forzado a /api para asegurar que pase por el proxy y evitar CORS
    let BASE_API_URL = '/api';
    // Asegurar que la URL termine sin slash
    if (BASE_API_URL.endsWith('/')) {
        BASE_API_URL = BASE_API_URL.slice(0, -1);
    }
    // Asegurar que la URL incluya /api si no lo tiene
    if (BASE_API_URL !== '/api' && !BASE_API_URL.endsWith('/api')) {
        BASE_API_URL += '/api';
    }

    for (let i = 0; i < validatedRecords.length; i++) {
        const record = validatedRecords[i];
        const currentPercentage = Math.round(((i + 1) / validatedRecords.length) * 100);
        
        progressBar.style.width = `${currentPercentage}%`;
        progressPercentage.innerText = `${currentPercentage}%`;
        progressText.innerText = `Tramitando folio: ${record.numberAgent}`;

        try {
            // ==========================================
            // PASO 1: Registrar al Policía (FormData)
            // ==========================================
            logToConsole(`[Paso 1/3] Registrando oficial: ${record.numberAgent}`, "info");
            
            const formData = new FormData();
            formData.append('Name', record.name);
            formData.append('FirstSurname', record.firstSurname);
            if (record.secondSurname) formData.append('SecondSurname', record.secondSurname);
            formData.append('NumberAgent', record.numberAgent);
            if (record.photoFile) formData.append('Photo', record.photoFile);
            
            // Convertir booleanos a strings explícitos para no romper el [FromForm]
            if (record.isVialidad !== null) formData.append('AgentVialidad', record.isVialidad ? 'true' : 'false');
            if (record.canFine !== null) formData.append('CanFine', record.canFine ? 'true' : 'false');
            
            formData.append('CreatedUser', record.createdUser.toString());

            const policeResponse = await fetch(`${BASE_API_URL}/police/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!policeResponse.ok) {
                let errorMsg = `Error ${policeResponse.status}: Fallo en el servidor`;
                try {
                    const errorJson = await policeResponse.json();
                    // Intentar extraer el mensaje de error de FluentValidation o ApiResponse
                    if (errorJson.message) {
                        errorMsg = errorJson.message;
                    } else if (errorJson.errors) {
                        errorMsg = JSON.stringify(errorJson.errors);
                    } else if (errorJson.title) {
                        errorMsg = errorJson.title;
                    } else {
                        errorMsg = JSON.stringify(errorJson);
                    }
                } catch(e) {
                    try {
                        const errorText = await policeResponse.text();
                        if(errorText) errorMsg = errorText;
                    } catch(ex) {}
                }
                throw new Error(errorMsg);
            }

            const policeJson = await policeResponse.json();
            const policeData = policeJson.data || policeJson;
            const idPolice = policeData.idPolice || policeData.IdPolice || policeData.id;
            
            if (!idPolice) {
                 throw new Error("Se registró el oficial pero el servidor no devolvió el Id del Policía.");
            }

            // ==========================================
            // PASO 1.5: Cargar Foto (API de Actualización)
            // ==========================================
            if (record.photoFile) {
                logToConsole(`[Paso 1.5] Subiendo foto para oficial #${idPolice}...`, "info");
                try {
                    await updatePolicePhoto(idPolice, record.photoFile);
                    logToConsole(`Foto cargada con éxito.`, "success");
                } catch (photoErr) {
                    logToConsole(`Aviso: No se pudo subir la foto: ${photoErr.message}`, "warn");
                }
            }

            // ==========================================
            // PASO 2: Registrar/Obtener Grupo Policial (JSON)
            // ==========================================
            // Ahora solo pedimos obligatoriamente el Nombre del Grupo
            if (!record.groupName) {
                logToConsole(`[!] Oficial ${record.numberAgent} registrado, pero no se especificó un grupo en el Excel.`, "warn");
                successCount++;
                saveToHistory(record);
                continue; 
            }

            logToConsole(`[Paso 2/3] Verificando/Creando grupo: ${record.groupName}`, "info");

            const groupPayload = {
                NameGroup: record.groupName,
                Municipality: record.municipality,
                State: record.state
            };

            const groupResponse = await fetch(`${BASE_API_URL}/PoliceGroups/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(groupPayload)
            });

            if (!groupResponse.ok) {
                if(groupResponse.status === 401) throw new Error("Error Grupo: JWT Expirado o Inválido (No Autorizado).");
                const errorData = await groupResponse.json().catch(() => ({}));
                throw new Error(`Error Grupo: ${errorData.message || 'Falló al crear/buscar grupo'}`);
            }

            const groupJson = await groupResponse.json();
            // El ApiResponse devuelve el ID en .data o .data.id (dependiendo de la implementación)
            const idGroup = groupJson.data?.id || groupJson.data; 

            if (!idGroup) throw new Error("No se pudo obtener el IdGroup desde el servidor.");

            // ==========================================
            // PASO 3: Vincular Oficial al Grupo (JSON)
            // ==========================================
            logToConsole(`[Paso 3/3] Asignando oficial al grupo #${idGroup}`, "info");

            const assignPayload = {
                IdPolice: idPolice,
                IdGroup: idGroup
            };

            const assignResponse = await fetch(`${BASE_API_URL}/PoliceGroups/assign-police`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(assignPayload)
            });

            if (!assignResponse.ok) {
                const errorData = await assignResponse.json().catch(() => ({}));
                throw new Error(`Error Asignación: ${errorData.message || 'El oficial ya pertenece a este grupo o falló asignación'}`);
            }

            logToConsole(`Expediente ${record.numberAgent} - ${record.name} completado (Asignado al grupo).`, "success");
            successCount++;
            saveToHistory(record);

        } catch (error) {
            errorCount++;
            let displayMessage = error.message;
            if (displayMessage === 'Failed to fetch') {
                displayMessage = 'El servidor rechazó la petición (CORS) o la API está apagada. Por favor, asegúrate de activar la extensión de CORS o intentar con un número de agente nuevo.';
            }
            logToConsole(`Fallo en folio ${record.numberAgent}: ${displayMessage}`, "error");
        }
    }

    // Finalización
    progressText.innerText = "Sincronización Finalizada.";
    
    // Cambiar spinner por icono de check
    const spinnerSvg = document.querySelector('.animate-spin');
    if (spinnerSvg) {
        spinnerSvg.classList.remove('animate-spin');
        spinnerSvg.innerHTML = `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>`;
        spinnerSvg.classList.replace('text-blue-100', 'text-emerald-100');
        spinnerSvg.querySelector('circle').classList.add('text-emerald-500');
        spinnerSvg.querySelector('path').classList.add('text-emerald-600');
        progressPercentage.classList.replace('text-blue-600', 'text-emerald-600');
    }
    
    logToConsole(`--- REPORTE FINAL ---`, "info");
    logToConsole(`TOTAL EVALUADOS: ${validatedRecords.length}`, "info");
    logToConsole(`INGRESADOS (ÉXITO): ${successCount}`, "success");
    logToConsole(`RECHAZADOS (ERROR): ${errorCount}`, "error");

    const finishBtnContainer = document.createElement('div');
    finishBtnContainer.className = "mt-8 text-center border-t border-slate-100 pt-6";
    finishBtnContainer.innerHTML = `
        <button onclick="location.reload()" class="px-8 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/20 active:scale-95">
            Cerrar Terminal y Volver al Panel
        </button>
    `;
    progressSection.appendChild(finishBtnContainer);
});

// ==========================================
// Integraciones adicionales (Update & Scan)
// ==========================================

/**
 * Actualiza la foto de un policía existente
 * @param {number} idPolice ID del policía
 * @param {File} photoFile Archivo de imagen
 */
async function updatePolicePhoto(idPolice, photoFile) {
    const token = localStorage.getItem('qr_jwt_token');
    const BASE_API_URL = '/api'; 

    const formData = new FormData();
    formData.append('Id', idPolice);
    formData.append('Photo', photoFile);

    const response = await fetch(`${BASE_API_URL}/police/update`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Error al actualizar la foto del policía');
    }
    return await response.json();
}

/**
 * Escanea un código QR de un policía
 */
async function scanPoliceQr(qrHashCode, latitude, longitude, address) {
    const token = localStorage.getItem('qr_jwt_token');
    const BASE_API_URL = '/api';

    const payload = {
        qrHashCode,
        latitude,
        longitude,
        address
    };

    const response = await fetch(`${BASE_API_URL}/police/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Error al registrar el escaneo del policía');
    }
    return await response.json();
}
