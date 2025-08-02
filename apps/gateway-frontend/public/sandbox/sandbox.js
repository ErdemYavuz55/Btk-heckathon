(function() {
    let currentModule = null;
    let currentParams = {};
    let currentUiInputs = [];
    let abortController = null;

    const simulationEl = document.getElementById('simulation');

    function showError(message) {
        simulationEl.innerHTML = `<div class="error">Error: ${message}</div>`;
    }

    function showLoading(message = 'Loading...') {
        simulationEl.innerHTML = `<div class="loading">${message}</div>`;
    }

    function validateCode(code) {
        // Security: Check for forbidden APIs
        const forbiddenPatterns = [
            /fetch\s*\(/,
            /XMLHttpRequest/,
            /WebSocket/,
            /document\.cookie/,
            /localStorage/,
            /sessionStorage/,
            /location\./,
            /window\.location/,
            /eval\s*\(/,
            /Function\s*\(/,
            /import\s*\(/
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(code)) {
                throw new Error(`Security violation: ${pattern.source} is not allowed`);
            }
        }

        // Check for required export
        if (!code.includes('export function render')) {
            throw new Error('Code must export a render function');
        }
    }

    async function loadAndExecuteCode(code, uiInputs, params) {
        try {
            showLoading('Loading simulation...');

            // Validate code
            validateCode(code);

            // Create blob URL for dynamic import
            const blob = new Blob([code], { type: 'application/javascript' });
            const moduleUrl = URL.createObjectURL(blob);

            // Clean up previous module
            if (currentModule) {
                URL.revokeObjectURL(currentModule);
            }

            // Dynamic import with timeout
            abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
                showError('Execution timeout (2 seconds)');
            }, 2000);

            try {
                const module = await import(moduleUrl);
                clearTimeout(timeoutId);

                if (typeof module.render !== 'function') {
                    throw new Error('Exported render must be a function');
                }

                currentModule = moduleUrl;
                currentUiInputs = uiInputs;
                currentParams = { ...params };

                // Clear and execute
                simulationEl.innerHTML = '';
                module.render(simulationEl, currentParams);

                console.log('Simulation rendered successfully');

            } catch (importError) {
                clearTimeout(timeoutId);
                throw importError;
            }

        } catch (error) {
            console.error('Execution error:', error);
            showError(error.message);
        }
    }

    function updateParams(newParams) {
        if (!currentModule) return;

        try {
            // Re-import and re-render with new params
            import(currentModule).then(module => {
                currentParams = { ...newParams };
                simulationEl.innerHTML = '';
                module.render(simulationEl, currentParams);
            }).catch(error => {
                console.error('Re-render error:', error);
                showError(error.message);
            });
        } catch (error) {
            console.error('Update params error:', error);
            showError(error.message);
        }
    }

    // Listen for messages from parent window
    window.addEventListener('message', function(event) {
        const { type, code, uiInputs, params } = event.data;

        switch (type) {
            case 'init':
                console.log('Initializing sandbox with code and params');
                loadAndExecuteCode(code, uiInputs, params);
                break;

            case 'params':
                console.log('Updating params:', params);
                updateParams(params);
                break;

            default:
                console.warn('Unknown message type:', type);
        }
    });

    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showError(`Runtime error: ${event.error.message}`);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showError(`Promise error: ${event.reason}`);
    });

    console.log('Sandbox initialized and ready');
})(); 