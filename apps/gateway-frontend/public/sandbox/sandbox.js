(function() {
    let currentModule = null;
    let currentRenderFunction = null;
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
        // Basic security check
        const dangerousPatterns = [
            'fetch(',
            'XMLHttpRequest',
            'WebSocket',
            'document.cookie',
            'localStorage',
            'sessionStorage',
            'location.',
            'window.location'
        ];

        for (const pattern of dangerousPatterns) {
            if (code.includes(pattern)) {
                throw new Error(`Security violation: ${pattern} is not allowed`);
            }
        }

        // Check for required export
        if (!code.includes('export function render')) {
            throw new Error('Code must export a render function');
        }
        
        // Basic syntax will be validated via the dynamic Function constructor below.
        // Manual brace/parenthesis/bracket counting has been removed to avoid
        // false positives when these characters appear inside strings, comments
        // or template literals.

        
        // Check for incomplete render function
        const renderMatch = code.match(/export\s+function\s+render\s*\([^)]*\)\s*\{/);
        if (!renderMatch) {
            throw new Error('Invalid render function syntax');
        }
        
        // Try basic JS syntax check
        try {
            new Function(code.replace(/export\s+function\s+render/, 'function render'));
        } catch (syntaxError) {
            console.error('❌ Syntax error in user code:\n', code);
            console.error('❌ Original syntax error object:', syntaxError);
            throw new Error(`JavaScript syntax error: ${syntaxError.message} (check browser console for exact location)`);
        }
    }

    function waitForGlobals() {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const ensurePlotlyScript = () => {
                if (!document.getElementById('plotly-cdn') && !window.Plotly) {
                    const cdns = [
                      '/plotly.min.js',  // Local file first!
                      'https://cdn.plot.ly/plotly-2.32.1.min.js',
                      'https://cdn.jsdelivr.net/npm/plotly.js-dist@2.32.1/plotly.min.js',
                      'https://unpkg.com/plotly.js-dist@2.32.1/plotly.min.js'
                    ];
                    const p5Cdns = [
                      '/p5.min.js',  // Local p5.js first!
                      'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js'
                    ];
                    let idx = 0;
                    let p5Idx = 0;
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
                    const tryLoadP5 = () => {
                        if (p5Idx >= p5Cdns.length) return;
                        const url = p5Cdns[p5Idx++];
                        const script = document.createElement('script');
                        script.id = 'p5-cdn';
                        script.src = url;
                        script.onload = () => console.log('p5.js loaded:', url);
                        script.onerror = () => {
                            console.warn('p5.js failed at', url);
                            tryLoadP5();
                        };
                        document.head.appendChild(script);
                    };
                    tryLoad();
                    tryLoadP5();
                }
            };
            setTimeout(ensurePlotlyScript, 1000);

            const check = () => {
                if (window.Plotly && window.p5) {
                    return resolve();
                } else if (window.Plotly || window.p5) {
                    return resolve();
                }
                attempts += 1;
                if (attempts > 200) {
                    return reject(new Error('Libraries failed to load'));
                }
                setTimeout(check, 50);
            };
            check();
        });
    }

    async function loadAndExecuteCode(code, uiInputs, params) {
        try {
            showLoading('Loading simulation...');

            await waitForGlobals();

            // Simple and safe code transformation
            let transformed = code;
            
            // Remove imports - simpler approach
            transformed = transformed.replace(/import.*?from.*?;?\n?/gi, '');
            transformed = transformed.replace(/const.*?require.*?;?\n?/gi, '');
            
                        // Remove dangerous functions
            transformed = transformed.replace(/eval\s*\(/gi, '(function(){throw new Error("eval not allowed")})');
           // Block usage of the global Function constructor more safely
           transformed = transformed.replace(/\bnew\s+Function\s*\(/g, '(function(){throw new Error("new Function not allowed")})(');
           // NOTE: We no longer blindly replace "Function(" because that also
           // matches ordinary function declarations when used with the /i flag,
           // corrupting valid code (e.g. arrow functions wrapped in parentheses).

           // Remove user-defined duplicates of Plotly / p5 constants to avoid redeclare errors
           transformed = transformed.replace(/(?:const|let|var)\s+Plotly\s*=.*?;?\n?/g, '');
           transformed = transformed.replace(/(?:const|let|var)\s+p5\s*=.*?;?\n?/g, '');

            // Inject globals at the beginning
            transformed = `const Plotly = window.Plotly; const p5 = window.p5;\n${transformed}`;
            
            // Alias common LLM mistakes (p.Vector → p5.Vector)
            transformed = transformed.replace(/\bp\.Vector\b/g, 'p5.Vector');
            
            // Fix params access issue by ensuring render function always gets current params
            transformed = transformed.replace(
                /export\s+function\s+render\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\{/g,
                'export function render($1, params) {\n  // Ensure params is always current\n  params = window.currentParams || params || {};'
            );

            // Validate transformed code
            validateCode(transformed);

            // Only log on validation errors
            console.log('✅ Code validated and transformed successfully');

            // Create data URL (UTF-8 safe)
            let base64, dataUrl;
            try {
                base64 = btoa(unescape(encodeURIComponent(transformed)));
                dataUrl = 'data:text/javascript;base64,' + base64;
                console.log('✅ Data URL created successfully');
            } catch (encodingError) {
                console.error('❌ Error creating data URL:', encodingError);
                throw new Error('Failed to encode code: ' + encodingError.message);
            }

            // Clean up previous module reference
            if (currentModule) {
                // No need to revoke data URLs
                currentModule = null;
            }

            // Dynamic import with shorter timeout
            abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
                showError('Execution timeout (5 seconds)');
            }, 5000); // Increased to 5 seconds for better reliability

            try {
                console.log('🔄 Attempting to import data URL...');
                const module = await import(dataUrl);
                clearTimeout(timeoutId);
                console.log('✅ Module imported successfully');

                if (typeof module.render !== 'function') {
                    throw new Error('Exported render must be a function');
                }

                currentModule = dataUrl;
                currentRenderFunction = module.render;
                currentUiInputs = uiInputs;
                currentParams = { ...params };

                // Clear and execute
                cleanupSimulation();
                currentRenderFunction(simulationEl, currentParams);
                ensureCanvasAttached();
                console.log('Simulation rendered successfully');

            } catch (importError) {
                clearTimeout(timeoutId);
                console.error('❌ Import error details:', importError);
                console.error('❌ Error name:', importError.name);
                console.error('❌ Error message:', importError.message);
                if (importError.stack) {
                    console.error('❌ Error stack:', importError.stack);
                }
                throw importError;
            }

        } catch (error) {
            console.error('Execution error:', error);
            showError(error.message);
        }
    }

    function updateParams(newParams) {
        // Pre-clean canvases to avoid stacking
        document.querySelectorAll('#simulation canvas').forEach(c => c.remove());
        document.querySelectorAll('.p5Canvas').forEach(d => d.remove());
        if (!currentModule || !currentRenderFunction) {
            console.warn('Cannot update params: missing module or render function');
            return;
        }

        try {
            // Update params
            const oldParams = { ...currentParams };
            currentParams = { ...newParams };
            console.log('🔄 Updating params from:', oldParams, 'to:', currentParams);
            
            // Try to update existing simulation smoothly
            // First check if element has a p5instance with updateWithNewProps
            if (simulationEl.p5instance && simulationEl.p5instance.updateWithNewProps) {
                console.log('🔄 Using p5instance.updateWithNewProps');
                simulationEl.p5instance.updateWithNewProps(currentParams);
                console.log('✅ p5instance.updateWithNewProps successful');
            } else if (window.currentP5Instance && window.currentP5Instance.updateParams) {
                // If p5 sketch has updateParams method, use it
                window.currentP5Instance.updateParams(currentParams);
                console.log('✅ Smooth parameter update successful');
            } else {
                // Fallback: Try direct parameter update if p5 instance exists
                if (window.currentP5Instance && window.currentP5Instance.p5 && window.currentP5Instance.p5.updateParams) {
                    console.log('🔄 Fallback: Direct p5 parameter update');
                    window.currentP5Instance.p5.updateParams(currentParams);
                    console.log('✅ Direct parameter update successful');
                } else {
                    console.log('🔄 Fallback: Smart re-render with canvas preservation');
                    
                    // Save current canvas state
                    const existingCanvas = simulationEl.querySelector('canvas');
                    const hadCanvas = !!existingCanvas;
                    
                    console.log('📊 Canvas state before re-render:', {
                        exists: hadCanvas,
                        children: simulationEl.children.length
                    });
                    
                    try {
                        // Clean up old p5 instances without removing canvas
                        if (window.p5 && window.p5.instances) {
                            // Remove ALL existing p5 instances (including the one attached to simulationEl)
                            window.p5.instances.forEach(instance => {
                                if (instance.remove) {
                                    instance.remove();
                                }
                            });
                            // Clear container to avoid multiple stacked frames/canvases
                            simulationEl.innerHTML = '';
                            // Remove any leftover canvases or p5 canvas wrappers in document to prevent stacking
                            document.querySelectorAll('#simulation canvas').forEach(c => c.remove());
                            document.querySelectorAll('.p5Canvas').forEach(d => d.remove());
                        }
                        
                        // Set global params for the render function to use
                        window.currentParams = currentParams;
                        
                        // Call render function with new params
                        currentRenderFunction(simulationEl, currentParams);
                        
                        // Ensure canvas is properly attached
                        ensureCanvasAttached();
                        
                        console.log('✅ Smart re-render successful');
                        
                        // Verify canvas still exists
                        const finalCanvas = simulationEl.querySelector('canvas');
                        console.log('📊 Canvas state after re-render:', {
                            exists: !!finalCanvas,
                            visible: finalCanvas ? finalCanvas.style.display !== 'none' : false,
                            children: simulationEl.children.length
                        });
                        
                    } catch (renderError) {
                        console.error('❌ Smart re-render failed:', renderError);
                        showError('Failed to update simulation: ' + renderError.message);
                        
                        // Try to restore previous params
                        currentParams = oldParams;
                        window.currentParams = oldParams;
                        try {
                            currentRenderFunction(simulationEl, currentParams);
                            ensureCanvasAttached();
                        } catch (restoreError) {
                            console.error('❌ Failed to restore previous params:', restoreError);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Update params error:', error);
            showError(error.message);
        }
    }

    function softCleanup() {
        console.log('🧹 Soft cleanup - keeping existing elements');
        
        // Don't clear anything, just let the new render take over
        // The p5.js will handle its own canvas updates
        
        // Only remove error/loading messages
        const errorElements = simulationEl.querySelectorAll('.error, .loading');
        errorElements.forEach(el => el.remove());
        
        console.log('✅ Soft cleanup complete - canvas preserved');
    }

    function cleanupSimulation() {
        // Full cleanup for initial load
        simulationEl.innerHTML = '';
        
        // Cleanup p5.js instances if any
        if (window.p5 && window.p5.instances) {
            window.p5.instances.forEach(instance => {
                if (instance.remove) {
                    instance.remove();
                }
            });
            window.p5.instances = [];
        }
    }

    function ensureCanvasAttached() {
        // If no canvas inside simulationEl but canvas exists in document, move it
        const canvasesInSimulation = simulationEl.querySelectorAll('canvas');
        const canvasesInDoc = document.querySelectorAll('canvas');
        
        console.log('🎨 Canvas check:', {
            inSimulation: canvasesInSimulation.length,
            inDocument: canvasesInDoc.length
        });
        
        if (canvasesInSimulation.length === 0 && canvasesInDoc.length > 0) {
            // Find canvas that's not already in simulation
            const orphanCanvas = Array.from(canvasesInDoc).find(canvas => 
                !simulationEl.contains(canvas)
            );
            
            if (orphanCanvas) {
                simulationEl.appendChild(orphanCanvas);
                console.log('🖼️ Canvas moved into simulation container');
                
                // Make sure canvas is visible
                orphanCanvas.style.display = orphanCanvas.style.display || 'block';
                
                // Trigger a resize event to ensure proper rendering
                if (orphanCanvas.getContext) {
                    const ctx = orphanCanvas.getContext('2d');
                    if (ctx) {
                        // Force a repaint
                        ctx.save();
                        ctx.restore();
                    }
                }
            }
        }
        
        // Also ensure all canvases in simulation are visible
        canvasesInSimulation.forEach((canvas, i) => {
            if (canvas.style.display === 'none') {
                canvas.style.display = 'block';
                console.log(`👁️ Made canvas ${i} visible`);
            }
        });
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