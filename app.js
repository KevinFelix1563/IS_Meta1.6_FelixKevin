/**
 * App principal para la PWA de Participación Ciudadana
 * Maneja: preview de foto, envío de formulario, detección offline
 */

(function () {
    'use strict';

    // Elementos del DOM
    const form = document.getElementById('report-form');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const descriptionInput = document.getElementById('description');
    const categorySelect = document.getElementById('category');
    const submitBtn = form.querySelector('button[type="submit"]');
    const offlineBanner = document.getElementById('offline-banner');

    // Estado
    let selectedFile = null;
    let isOnline = navigator.onLine;

    /**
     * Actualiza la visibilidad del banner offline
     */
    function updateOfflineBanner() {
        offlineBanner.hidden = isOnline;
    }

    /**
     * Maneja el cambio en el input de archivo
     * Usa FileReader para previsualizar la imagen
     */
    function handlePhotoChange(event) {
        const file = event.target.files[0];
        if (!file) {
            clearPhotoPreview();
            return;
        }

        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido.');
            clearPhotoPreview();
            return;
        }

        selectedFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            photoPreview.src = e.target.result;
            photoPreview.hidden = false;
        };
        reader.onerror = function () {
            alert('Error al leer la imagen. Intenta de nuevo.');
            clearPhotoPreview();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Limpia la previsualización y el input
     * Remueve src completamente para evitar icono de imagen rota + alt text
     */
    function clearPhotoPreview() {
        selectedFile = null;
        photoPreview.removeAttribute('src');
        photoPreview.hidden = true;
        photoInput.value = '';
    }

    /**
     * Valida el formulario completo
     */
    function validateForm() {
        const isValid =
            selectedFile !== null &&
            descriptionInput.value.trim().length > 0 &&
            categorySelect.value !== '';

        submitBtn.disabled = !isValid;
        return isValid;
    }

    /**
     * Crea un objeto con los datos del reporte
     * Evita innerHTML - usa métodos DOM seguros
     */
    function createReportData() {
        return {
            photo: selectedFile,
            description: descriptionInput.value.trim(),
            category: categorySelect.value,
            timestamp: new Date().toISOString(),
            // Para uso offline: guardar en IndexedDB o localStorage
            pendingSync: !isOnline
        };
    }

    /**
     * Guarda el reporte localmente (simulación para modo offline)
     * En producción usarías IndexedDB
     */
    function saveReportLocally(report) {
        try {
            const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
            // Convertir File a base64 para almacenamiento
            const reader = new FileReader();
            reader.onload = function () {
                const reportToStore = {
                    ...report,
                    photoData: reader.result,
                    photoName: report.photo.name,
                    photoType: report.photo.type
                };
                delete reportToStore.photo; // File no es serializable
                reports.push(reportToStore);
                localStorage.setItem('pendingReports', JSON.stringify(reports));
            };
            reader.readAsDataURL(report.photo);
        } catch (error) {
            console.error('Error guardando reporte local:', error);
        }
    }

    /**
     * Envía el reporte al servidor (simulado)
     */
    async function submitReport(report) {
        // Simulación de envío a API
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Reporte enviado:', {
                    description: report.description,
                    category: report.category,
                    timestamp: report.timestamp,
                    hasPhoto: !!report.photo
                });
                resolve({ success: true, id: Date.now() });
            }, 1000);
        });
    }

    /**
     * Maneja el envío del formulario
     * Previene recarga de página
     */
    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            // Enfocar primer campo inválido
            if (!selectedFile) {
                photoInput.focus();
            } else if (!descriptionInput.value.trim()) {
                descriptionInput.focus();
            } else {
                categorySelect.focus();
            }
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const report = createReportData();

        try {
            if (isOnline) {
                await submitReport(report);
                alert('¡Reporte guardado correctamente!');
            } else {
                saveReportLocally(report);
                alert('Reporte guardado localmente. Se sincronizará cuando haya conexión.');
            }

            // Resetear formulario
            form.reset();
            clearPhotoPreview();
            validateForm();
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Hubo un error al guardar el reporte. Intenta de nuevo.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Reporte';
        }
    }

    /**
     * Detecta cambios de conectividad
     */
    function handleOnline() {
        isOnline = true;
        updateOfflineBanner();
        // Aquí podrías sincronizar reportes pendientes
        syncPendingReports();
    }

    function handleOffline() {
        isOnline = false;
        updateOfflineBanner();
    }

    /**
     * Sincroniza reportes pendientes cuando vuelve la conexión
     */
    async function syncPendingReports() {
        try {
            const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
            if (reports.length === 0) return;

            for (const report of reports) {
                // Reconstruir File desde base64
                const response = await fetch(report.photoData);
                const blob = await response.blob();
                const file = new File([blob], report.photoName, { type: report.photoType });

                await submitReport({
                    ...report,
                    photo: file
                });
            }

            localStorage.removeItem('pendingReports');
            console.log('Sincronización completada');
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    }

    // --- Inicialización ---

    // Event listeners
    photoInput.addEventListener('change', handlePhotoChange);
    descriptionInput.addEventListener('input', validateForm);
    categorySelect.addEventListener('change', validateForm);
    form.addEventListener('submit', handleSubmit);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Estado inicial
    updateOfflineBanner();
    validateForm();

    // Registrar Service Worker si está disponible
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function (error) {
                console.log('SW registration failed:', error);
            });
        });
    }
})();