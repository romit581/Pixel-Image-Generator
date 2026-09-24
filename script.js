/**
 * PIXELFORGE - Image to Pixel Art Converter
 * Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==================================================
    // STATE & DOM ELEMENTS
    // ==================================================
    const state = {
        imageLoaded: false,
        originalImage: null, // HTMLImageElement
        fileType: 'image/png',
        generationMode: 'pixelate', // 'pixelate' or 'reimagine'
        
        // Settings
        pixelSize: 8,
        colorCount: 32,
        palette: 'original',
        dithering: false,
        contrast: 100,
        saturation: 100,
        brightness: 100,
        
        // Zoom states
        zoomOrig: 1,
        zoomPixel: 1
    };

    // Palettes (RGB values)
    const palettes = {
        gameboy: [
            [15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]
        ],
        nes: [
            [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188], [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0],
            [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0], [0, 64, 88], [0, 0, 0], [0, 0, 0], [0, 0, 0],
            [188, 188, 188], [0, 120, 248], [0, 88, 248], [104, 68, 252], [216, 0, 204], [228, 0, 88], [248, 56, 0], [228, 92, 16],
            [172, 124, 0], [0, 184, 0], [0, 168, 0], [0, 168, 68], [0, 136, 136], [0, 0, 0], [0, 0, 0], [0, 0, 0],
            [248, 248, 248], [60, 188, 252], [104, 136, 252], [152, 120, 248], [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68],
            [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152], [0, 232, 216], [120, 120, 120], [0, 0, 0], [0, 0, 0],
            [252, 252, 252], [164, 228, 252], [184, 184, 248], [216, 184, 248], [248, 184, 248], [248, 164, 192], [240, 208, 176], [252, 224, 168],
            [248, 216, 120], [216, 248, 120], [184, 248, 184], [184, 248, 216], [0, 252, 252], [248, 216, 248], [0, 0, 0], [0, 0, 0]
        ],
        snes: [ /* A generic bright vibrant 16-bit palette approx */
            [248,248,248], [192,192,192], [128,128,128], [64,64,64], [0,0,0],
            [255,0,0], [0,255,0], [0,0,255], [255,255,0], [255,0,255], [0,255,255],
            [128,0,0], [0,128,0], [0,0,128], [128,128,0], [128,0,128], [0,128,128],
            [255,128,128], [128,255,128], [128,128,255], [255,255,128], [255,128,255], [128,255,255]
        ],
        mono: [
            [0, 0, 0], [255, 255, 255]
        ],
        grayscale: [
            [0,0,0], [32,32,32], [64,64,64], [96,96,96], [128,128,128], [159,159,159], [191,191,191], [223,223,223], [255,255,255]
        ],
        vibrant: [
            [255, 0, 64], [0, 255, 128], [64, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255],
            [255, 128, 0], [128, 255, 0], [0, 128, 255], [255, 255, 255], [0, 0, 0], [128, 128, 128]
        ]
    };

    // Views
    const uploadView = document.getElementById('upload-view');
    const editorView = document.getElementById('editor-view');
    
    // File inputs & Drop
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const selectImageBtn = document.getElementById('select-image-btn');
    
    // Info display
    const filenameDisplay = document.getElementById('filename-display');
    const dimensionsDisplay = document.getElementById('dimensions-display');
    const removeBtn = document.getElementById('remove-btn');
    
    // Canvases
    const canvasOriginal = document.getElementById('canvas-original');
    const ctxOriginal = canvasOriginal.getContext('2d');
    const canvasPixelart = document.getElementById('canvas-pixelart');
    const ctxPixelart = canvasPixelart.getContext('2d', { willReadFrequently: true });
    
    // Controls
    const inputs = {
        pixelSize: document.getElementById('pixel-size'),
        colorCount: document.getElementById('color-count'),
        palette: document.getElementById('palette'),
        dithering: document.getElementById('dithering'),
        contrast: document.getElementById('contrast'),
        saturation: document.getElementById('saturation'),
        brightness: document.getElementById('brightness')
    };
    
    // Value Displays
    const valDisplays = {
        pixelSize: document.getElementById('pixel-size-val'),
        colorCount: document.getElementById('color-count-val'),
        contrast: document.getElementById('contrast-val'),
        saturation: document.getElementById('saturation-val'),
        brightness: document.getElementById('brightness-val')
    };

    const resetBtn = document.getElementById('reset-btn');
    const presets = document.querySelectorAll('.preset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const exportFormat = document.getElementById('export-format');
    const exportScale = document.getElementById('export-scale');
    const transparentBg = document.getElementById('transparent-bg');

    // Canvas scaling controls
    const origResBadge = document.getElementById('orig-res');
    const pixelResBadge = document.getElementById('pixel-res');

    // Debounce timer for rendering
    let renderTimer = null;

    // ==================================================
    // INITIALIZATION & EVENT LISTENERS
    // ==================================================
    
    function setMode(mode) {
        state.generationMode = mode;
        // Update UI active buttons
        document.getElementById('mode-pixelate').classList.toggle('active', mode === 'pixelate');
        document.getElementById('mode-reimagine').classList.toggle('active', mode === 'reimagine');
        // Update description
        const desc = document.getElementById('mode-description');
        if (mode === 'pixelate') {
            desc.textContent = 'Pixelate: Fast & local';
            // Hide reimagine controls
            document.getElementById('reimagine-controls').style.display = 'none';
        } else {
            desc.textContent = 'Reimagine: AI‑based generation (may take time)';
            document.getElementById('reimagine-controls').style.display = 'block';
        }
        // Trigger render if pixelate mode
        if (mode === 'pixelate') {
            requestRender();
        }
    }

    // Bind mode buttons after DOM ready
    function bindModeButtons() {
        document.getElementById('mode-pixelate').addEventListener('click', () => setMode('pixelate'));
        document.getElementById('mode-reimagine').addEventListener('click', () => setMode('reimagine'));
        // Generate button for reimagine
        const genBtn = document.getElementById('reimagine-generate');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                // Show loading state
                genBtn.disabled = true;
                genBtn.textContent = 'Generating...';
                // Simulate async AI call (placeholder)
                setTimeout(() => {
                    // For now we just call generatePixelArt as a placeholder
                    generatePixelArt();
                    genBtn.disabled = false;
                    genBtn.textContent = 'GENERATE';
                }, 1500);
            });
        }
    }

    // Extend init to bind mode buttons
    function init() {
        bindUploadEvents();
        bindControlEvents();
        bindPresetEvents();
        bindCanvasControls();
        bindModeButtons();
    }

    // Modify requestRender to respect generation mode
    function requestRender() {
        if (state.generationMode !== 'pixelate') return; // Reimagine renders on button press
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(generatePixelArt, 100);
    }
function bindUploadEvents() {
        selectImageBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('drag-over');
        });
        
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('drag-over');
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFile(e.dataTransfer.files[0]);
            }
        });

        // Paste event
        document.addEventListener('paste', (e) => {
            if (!state.imageLoaded && e.clipboardData && e.clipboardData.files.length > 0) {
                processFile(e.clipboardData.files[0]);
            }
        });

        removeBtn.addEventListener('click', resetApplication);
    }

    function bindControlEvents() {
        const updateStateAndRender = (key, parseFunc) => (e) => {
            state[key] = parseFunc ? parseFunc(e.target.value) : e.target.checked !== undefined ? e.target.checked : e.target.value;
            if (valDisplays[key]) valDisplays[key].textContent = state[key];
            
            // Adjust ui based on palette
            if (key === 'palette') {
                inputs.colorCount.disabled = (state.palette !== 'original');
                inputs.colorCount.parentElement.style.opacity = inputs.colorCount.disabled ? '0.5' : '1';
            }

            requestRender();
        };

        inputs.pixelSize.addEventListener('input', updateStateAndRender('pixelSize', parseInt));
        inputs.colorCount.addEventListener('input', updateStateAndRender('colorCount', parseInt));
        inputs.palette.addEventListener('change', updateStateAndRender('palette', null));
        inputs.dithering.addEventListener('change', updateStateAndRender('dithering', null));
        inputs.contrast.addEventListener('input', updateStateAndRender('contrast', parseInt));
        inputs.saturation.addEventListener('input', updateStateAndRender('saturation', parseInt));
        inputs.brightness.addEventListener('input', updateStateAndRender('brightness', parseInt));

        resetBtn.addEventListener('click', resetControls);
        downloadBtn.addEventListener('click', downloadImage);
    }

    function bindPresetEvents() {
        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                presets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyPreset(btn.dataset.preset);
            });
        });
    }

    function bindCanvasControls() {
        // Just mock scaling visually for now to save complexity
        const applyZoom = (canvasId, factor) => {
            const c = document.getElementById(canvasId);
            let currentScale = parseFloat(c.dataset.scale || 1);
            currentScale *= factor;
            c.style.transform = `scale(${currentScale})`;
            c.dataset.scale = currentScale;
        };
        const resetZoom = (canvasId) => {
            const c = document.getElementById(canvasId);
            c.style.transform = `scale(1)`;
            c.dataset.scale = 1;
        };

        document.querySelectorAll('.canvas-panel').forEach((panel, idx) => {
            const isOrig = idx === 0;
            const cid = isOrig ? 'canvas-original' : 'canvas-pixelart';
            
            panel.querySelector('.zoom-in').addEventListener('click', () => applyZoom(cid, 1.2));
            panel.querySelector('.zoom-out').addEventListener('click', () => applyZoom(cid, 0.8));
            panel.querySelector('.fit-btn').addEventListener('click', () => resetZoom(cid));
            panel.querySelector('.fill-btn').addEventListener('click', () => {
                const c = document.getElementById(cid);
                c.style.width = '100%';
                c.style.height = '100%';
                c.style.objectFit = 'cover';
                setTimeout(() => { c.style.width=''; c.style.height=''; c.style.objectFit='contain'; }, 2000); // Reset after a bit as a demo
    });
        });
}


    // ==================================================
    // FILE HANDLING
    // ==================================================
    
    function handleFileSelect(e) {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    }

    function processFile(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file (PNG, JPG, WEBP).');
            return;
        }

        state.fileName = file.name;
        state.fileType = file.type;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.imageLoaded = true;
                
                // Update UI
                filenameDisplay.textContent = state.fileName;
                dimensionsDisplay.textContent = `${img.width} x ${img.height}`;
                
                // Switch Views
                uploadView.classList.remove('active-view');
                uploadView.classList.add('hidden-view');
                editorView.classList.remove('hidden-view');
                editorView.classList.add('active-view');
                
                renderOriginal();
                requestRender();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ==================================================
    // CORE RENDERING ENGINE
    // ==================================================
    
    

    function renderOriginal() {
        const img = state.originalImage;
        canvasOriginal.width = img.width;
        canvasOriginal.height = img.height;
        ctxOriginal.drawImage(img, 0, 0);
        origResBadge.textContent = `${img.width}x${img.height}`;
    }

    function generatePixelArt() {
        if (!state.imageLoaded) return;
        
        const img = state.originalImage;
        const pSize = state.pixelSize;
        
        // Calculate downscaled dimensions
        const smallW = Math.max(1, Math.floor(img.width / pSize));
        const smallH = Math.max(1, Math.floor(img.height / pSize));
        
        pixelResBadge.textContent = `${smallW}x${smallH}`;

        // 1. Draw to offscreen canvas to downscale
        const offscreen = document.createElement('canvas');
        offscreen.width = smallW;
        offscreen.height = smallH;
        const ctxOff = offscreen.getContext('2d', { willReadFrequently: true });
        
        // Apply Color Adjustments during downscale draw
        ctxOff.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
        ctxOff.drawImage(img, 0, 0, smallW, smallH);
        
        // 2. Get ImageData and Process
        const imgData = ctxOff.getImageData(0, 0, smallW, smallH);
        const data = imgData.data;

        // Process pixels (quantization & palettes)
        processPixels(data, smallW, smallH);

        // Put modified data back
        ctxOff.putImageData(imgData, 0, 0);

        // 3. Upscale back to original size onto visible canvas
        canvasPixelart.width = smallW * pSize; // Ensure perfectly divisible size
        canvasPixelart.height = smallH * pSize;
        
        // MUST disable smoothing for crisp pixel art
        ctxPixelart.imageSmoothingEnabled = false;
        ctxPixelart.drawImage(offscreen, 0, 0, smallW, smallH, 0, 0, canvasPixelart.width, canvasPixelart.height);
    }

    // ==================================================
    // PIXEL PROCESSING
    // ==================================================
    
    function processPixels(data, width, height) {
        const usePalette = state.palette !== 'original';
        const targetPalette = usePalette ? palettes[state.palette] : null;
        const colorFactor = 255 / (state.colorCount - 1);
        
        for (let i = 0; i < data.length; i += 4) {
            // Ignore transparent
            if (data[i+3] === 0) {
                if (!transparentBg.checked) {
                    data[i] = data[i+1] = data[i+2] = 255;
                    data[i+3] = 255;
                }
                continue;
            }

            let r = data[i];
            let g = data[i+1];
            let b = data[i+2];

            if (usePalette) {
                // Find closest color in palette
                let closest = getClosestColor(r, g, b, targetPalette);
                data[i] = closest[0];
                data[i+1] = closest[1];
                data[i+2] = closest[2];
            } else {
                // Basic Uniform Quantization
                data[i] = Math.round(Math.round(r / colorFactor) * colorFactor);
                data[i+1] = Math.round(Math.round(g / colorFactor) * colorFactor);
                data[i+2] = Math.round(Math.round(b / colorFactor) * colorFactor);
            }
        }
    }

    // Euclidean distance color matching
    function getClosestColor(r, g, b, palette) {
        let minD = Infinity;
        let match = palette[0];
        for (let i = 0; i < palette.length; i++) {
            const p = palette[i];
            const dSq = (r-p[0])*(r-p[0]) + (g-p[1])*(g-p[1]) + (b-p[2])*(b-p[2]);
            if (dSq < minD) {
                minD = dSq;
                match = p;
            }
        }
        return match;
    }

    // ==================================================
    // UI & CONTROLS
    // ==================================================

    function resetControls() {
        setControlValues({
            pixelSize: 8,
            colorCount: 32,
            palette: 'original',
            dithering: false,
            contrast: 100,
            saturation: 100,
            brightness: 100
        });
        
        presets.forEach(b => b.classList.remove('active'));
        document.querySelector('.preset-btn[data-preset="original"]').classList.add('active');
        
        requestRender();
    }

    function setControlValues(vals) {
        Object.keys(vals).forEach(k => {
            state[k] = vals[k];
            if (inputs[k]) {
                if (inputs[k].type === 'checkbox') inputs[k].checked = vals[k];
                else inputs[k].value = vals[k];
            }
            if (valDisplays[k]) valDisplays[k].textContent = vals[k];
        });
        
        inputs.colorCount.disabled = (state.palette !== 'original');
        inputs.colorCount.parentElement.style.opacity = inputs.colorCount.disabled ? '0.5' : '1';
    }

    function applyPreset(presetName) {
        const defaultSettings = { pixelSize: state.pixelSize, dithering: false, contrast: 100, saturation: 100, brightness: 100 };
        
        switch(presetName) {
            case 'original':
                setControlValues({ ...defaultSettings, colorCount: 256, palette: 'original' }); break;
            case '8bit':
                setControlValues({ ...defaultSettings, colorCount: 8, palette: 'original', saturation: 120, contrast: 110 }); break;
            case 'gameboy':
                setControlValues({ ...defaultSettings, palette: 'gameboy' }); break;
            case 'snes':
                setControlValues({ ...defaultSettings, palette: 'snes' }); break;
            case 'nes':
                setControlValues({ ...defaultSettings, palette: 'nes' }); break;
            case 'mono':
                setControlValues({ ...defaultSettings, palette: 'mono' }); break;
            case 'high-contrast':
                setControlValues({ ...defaultSettings, colorCount: 16, palette: 'original', contrast: 150, saturation: 150 }); break;
            case 'vibrant':
                setControlValues({ ...defaultSettings, palette: 'vibrant', saturation: 150 }); break;
        }
        requestRender();
    }

    function resetApplication() {
        state.imageLoaded = false;
        state.originalImage = null;
        fileInput.value = ''; // clear input
        
        // Clear canvases
        ctxOriginal.clearRect(0,0, canvasOriginal.width, canvasOriginal.height);
        ctxPixelart.clearRect(0,0, canvasPixelart.width, canvasPixelart.height);
        
        resetControls();

        // Switch Views
        editorView.classList.remove('active-view');
        editorView.classList.add('hidden-view');
        uploadView.classList.remove('hidden-view');
        uploadView.classList.add('active-view');
    }

    // ==================================================
    // EXPORT
    // ==================================================

    function downloadImage() {
        if (!state.imageLoaded) return;
        
        const scale = parseInt(exportScale.value);
        const format = exportFormat.value;
        const ext = format === 'image/jpeg' ? 'jpg' : 'png';
        const baseName = state.fileName.split('.')[0] || 'pixelforge';
        const exportName = `${baseName}_pixelated.${ext}`;

        // Create export canvas to apply final scaling
        const expCanvas = document.createElement('canvas');
        expCanvas.width = canvasPixelart.width * scale;
        expCanvas.height = canvasPixelart.height * scale;
        const ctxExp = expCanvas.getContext('2d');
        
        // Fill bg if jpeg or transparent is unchecked
        if (format === 'image/jpeg' || !transparentBg.checked) {
            ctxExp.fillStyle = '#ffffff';
            ctxExp.fillRect(0,0, expCanvas.width, expCanvas.height);
        }

        ctxExp.imageSmoothingEnabled = false;
        ctxExp.drawImage(canvasPixelart, 0, 0, expCanvas.width, expCanvas.height);

        // Download via Blob
        expCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Visual feedback
            const origText = downloadBtn.textContent;
            downloadBtn.textContent = 'DOWNLOADED ✓';
            setTimeout(() => downloadBtn.textContent = origText, 2000);
            
        }, format, 0.95);
    }

    // Start App
    init();
});
