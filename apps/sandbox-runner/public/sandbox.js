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

    function waitForGlobals() {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            // Fallback: inject Plotly script if not present after 1 second
            const ensurePlotlyScript = () => {
                if (!document.getElementById('plotly-cdn') && !window.Plotly) {
                    const cdns = [
                      '/plotly.min.js',  // Local file first!
                      'https://cdn.plot.ly/plotly-2.32.1.min.js',
                      'https://cdn.jsdelivr.net/npm/plotly.js-dist@2.32.1/plotly.min.js',
                      'https://unpkg.com/plotly.js-dist@2.32.1/plotly.min.js'
                    ];
                    let idx = 0;
                    const tryLoad = () => {
                        if (idx >= cdns.length) return;
                        const url = cdns[idx++];
                        const script = document.createElement('script');
                        script.id = 'plotly-cdn';
                        script.src = url;
                        script.onload = () => console.log('Plotly loaded:', url);
                        script.onerror = () => {
                            console.warn('Plotly failed at', url);
                            tryLoad();
                        };
                        document.head.appendChild(script);
                    };
                    tryLoad();
                }
            };

            setTimeout(ensurePlotlyScript, 1000);

            const check = () => {
                if (window.Plotly) {
                    return resolve();
                }
                attempts += 1;
                if (attempts > 200) { // 10s timeout
                    return reject(new Error('Plotly failed to load'));
                }
                setTimeout(check, 50);
            };
            check();
        });
    }

    async function loadAndExecuteCode(code, uiInputs, params) {
        try {
            showLoading('Loading simulation...');

            // Wait for external libs (Plotly/p5) to be ready
            await waitForGlobals();

            // Validate code
            validateCode(code);

            // Remove external ESM imports (Plotly, p5.js) – we already load them globally via <script>
            let transformed = code
              .replace(/import\s+.*Plotly.*;?\n?/gi, '')
              .replace(/import\s+.*p5.*;?\n?/gi, '');

            // Inject globals so code can access Plotly/p5
            transformed = `const Plotly = window.Plotly; const p5 = window.p5;\n` + transformed;

            // Create data URL (UTF-8 safe)
            const base64 = btoa(unescape(encodeURIComponent(transformed)));
            const dataUrl = 'data:text/javascript;base64,' + base64;

            // Clean up previous module reference
            if (currentModule) {
                // No need to revoke data URLs
                currentModule = null;
            }

            // Dynamic import with timeout
            abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
                showError('Execution timeout (2 seconds)');
            }, 2000);

            try {
                const module = await import(dataUrl);
                clearTimeout(timeoutId);

                if (typeof module.render !== 'function') {
                    throw new Error('Exported render must be a function');
                }

                currentModule = dataUrl;
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
            // First try to use p5instance.updateWithNewProps if available
            if (simulationEl.p5instance && simulationEl.p5instance.updateWithNewProps) {
                console.log('🔄 Using p5instance.updateWithNewProps');
                currentParams = { ...newParams };
                simulationEl.p5instance.updateWithNewProps(currentParams);
                console.log('✅ p5instance.updateWithNewProps successful');
            } else {
                // Fallback: Re-import and re-render with new params
                import(currentModule).then(module => {
                    currentParams = { ...newParams };
                    simulationEl.innerHTML = '';
                    module.render(simulationEl, currentParams);
                }).catch(error => {
                    console.error('Re-render error:', error);
                    showError(error.message);
                });
            }
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