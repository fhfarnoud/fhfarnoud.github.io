// ============================================================
// Inline 3D Panel for Gradient Descent Game V5
// Renders a small Three.js surface in the sidebar
// Reads global state from script.js (f, state, currentFunction, etc.)
// ============================================================

(function () {
    const container = document.getElementById('three-container');
    if (!container || typeof THREE === 'undefined') return;

    const section = container.closest('.settings-section');
    let initialized = false;
    let animating = false;

    // Three.js objects
    let scene, camera, renderer, controls;
    let surfaceMesh, surfaceGeometry;
    let surfaceMaterial;
    let pathLine, startSphere, endSphere;
    let gridHelper;

    let zScale = 0.05;
    const GRID_RES = 60; // lower res for sidebar performance

    // ---- Colormap (reuses 2D game colormap from script.js) ----
    function surfaceColor(level, vMin, vMax) {
        // Temporarily set the globals that getContourColor reads
        const prevMin = colorMin, prevMax = colorMax;
        colorMin = vMin;
        colorMax = vMax;
        const css = getContourColor(level);  // returns "rgb(r, g, b)"
        colorMin = prevMin;
        colorMax = prevMax;
        const m = css.match(/\d+/g);
        return new THREE.Color(+m[0] / 255, +m[1] / 255, +m[2] / 255);
    }

    function getActiveBounds() {
        // Use the current viewport bounds from the 2D game
        if (state && state.globalBounds) return state.globalBounds;
        // Fallback
        const func = testFunctions[currentFunction];
        if (func && func.bounds) return func.bounds;
        return { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
    }

    function initScene() {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 268;
        const h = rect.height || 268;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e14);

        camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
        camera.position.set(12, 12, 12);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.0;
        controls.minDistance = 4;
        controls.maxDistance = 40;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const d1 = new THREE.DirectionalLight(0xffffff, 0.7);
        d1.position.set(8, 16, 8);
        scene.add(d1);
        const d2 = new THREE.DirectionalLight(0x58a6ff, 0.25);
        d2.position.set(-8, 8, -8);
        scene.add(d2);

        surfaceMaterial = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 25,
            wireframe: false
        });

        // Grid
        gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
        gridHelper.position.y = -0.05;
        scene.add(gridHelper);

        initialized = true;
    }

    function buildSurface() {
        if (!initialized) return;

        // Remove old surface
        if (surfaceMesh) {
            scene.remove(surfaceMesh);
            surfaceGeometry.dispose();
            surfaceMesh = null;
        }

        const b = getActiveBounds();
        const geo = new THREE.BufferGeometry();
        const vertices = [], colors = [], indices = [];
        const stepX = (b.xMax - b.xMin) / GRID_RES;
        const stepY = (b.yMax - b.yMin) / GRID_RES;

        let vMin = Infinity, vMax = -Infinity;
        const vals = [];

        for (let j = 0; j <= GRID_RES; j++) {
            for (let i = 0; i <= GRID_RES; i++) {
                const x = b.xMin + i * stepX;
                const y = b.yMin + j * stepY;
                const z = f(x, y);
                vertices.push(x, z * zScale, -y);
                vals.push(z);
                if (z < vMin) vMin = z;
                if (z > vMax) vMax = z;
            }
        }

        for (let k = 0; k < vals.length; k++) {
            const c = surfaceColor(vals[k], vMin, vMax);
            colors.push(c.r, c.g, c.b);
        }

        for (let j = 0; j < GRID_RES; j++) {
            for (let i = 0; i < GRID_RES; i++) {
                const a = j * (GRID_RES + 1) + i;
                indices.push(a, a + 1, a + (GRID_RES + 1));
                indices.push(a + 1, a + (GRID_RES + 1) + 1, a + (GRID_RES + 1));
            }
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        surfaceGeometry = geo;
        surfaceMesh = new THREE.Mesh(geo, surfaceMaterial);
        scene.add(surfaceMesh);

        // Update grid size
        scene.remove(gridHelper);
        const size = Math.max(b.xMax - b.xMin, b.yMax - b.yMin);
        gridHelper = new THREE.GridHelper(size * 1.5, 20, 0x333333, 0x1a1a1a);
        gridHelper.position.y = -0.05;
        scene.add(gridHelper);
    }

    function drawPath() {
        // Remove old path
        if (pathLine) {
            scene.remove(pathLine);
            pathLine.geometry.dispose();
            pathLine.material.dispose();
            pathLine = null;
        }
        if (startSphere) { scene.remove(startSphere); startSphere = null; }
        if (endSphere) { scene.remove(endSphere); endSphere = null; }

        if (!state || !state.history || state.history.length < 2) return;

        const points = state.history.map(h => {
            const fVal = f(h.a, h.b);
            return new THREE.Vector3(h.a, fVal * zScale + 0.1, -h.b);
        });

        pathLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color: 0x58a6ff, linewidth: 2 })
        );
        scene.add(pathLine);

        // Start sphere
        const sp = state.history[0];
        const sg = new THREE.SphereGeometry(0.15, 12, 12);
        startSphere = new THREE.Mesh(sg, new THREE.MeshPhongMaterial({ color: 0x58a6ff, emissive: 0x2050a0 }));
        startSphere.position.set(sp.a, f(sp.a, sp.b) * zScale + 0.15, -sp.b);
        scene.add(startSphere);

        // End sphere
        const ep = state.history[state.history.length - 1];
        const eg = new THREE.SphereGeometry(0.2, 12, 12);
        endSphere = new THREE.Mesh(eg, new THREE.MeshPhongMaterial({ color: 0x00d4ff, emissive: 0x0080a0 }));
        endSphere.position.set(ep.a, f(ep.a, ep.b) * zScale + 0.2, -ep.b);
        scene.add(endSphere);
    }

    function rebuild() {
        if (!initialized) return;
        buildSurface();
        drawPath();
    }

    // ---- Animation loop (only when section is open) ----
    function animate() {
        if (!animating) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function startAnimating() {
        if (animating) return;
        animating = true;
        animate();
    }

    function stopAnimating() {
        animating = false;
    }

    // ---- Observe section open/close ----
    function isSectionOpen() {
        return section && section.classList.contains('open');
    }

    // Use MutationObserver to watch for class changes on the section
    const observer = new MutationObserver(() => {
        if (isSectionOpen()) {
            if (!initialized) {
                initScene();
                rebuild();
            }
            startAnimating();
            // Resize in case container size changed
            handleResize();
        } else {
            stopAnimating();
        }
    });
    if (section) {
        observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    }

    // ---- Handle resize ----
    function handleResize() {
        if (!initialized || !renderer) return;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height);
    }

    window.addEventListener('resize', () => {
        if (isSectionOpen() && initialized) handleResize();
    });

    // ---- Controls ----
    const zScaleSlider = document.getElementById('z-scale-slider');
    const zScaleValue = document.getElementById('z-scale-value');
    const wireframeToggle = document.getElementById('wireframe-toggle');

    if (zScaleSlider) {
        zScaleSlider.addEventListener('input', (e) => {
            zScale = parseFloat(e.target.value);
            zScaleValue.textContent = zScale.toFixed(3);
            rebuild();
        });
    }

    if (wireframeToggle) {
        wireframeToggle.addEventListener('change', (e) => {
            if (surfaceMaterial) surfaceMaterial.wireframe = e.target.checked;
        });
    }

    // ---- Save state before opening full-screen 3D ----
    const link3d = document.getElementById('link-3d');
    if (link3d) {
        link3d.addEventListener('click', () => {
            if (typeof saveStateFor3D === 'function') saveStateFor3D();
        });
    }

    // ---- Public API for script.js to trigger rebuilds ----
    window.rebuild3DPanel = function () {
        if (initialized && isSectionOpen()) {
            // Auto-set z-scale based on function type
            const func = testFunctions[currentFunction];
            if (func) {
                const defaults = {
                    lasso: 0.3, ridge: 0.3, linear: 0.3,
                    himmelblau: 0.05, rosenbrock: 0.01,
                    maze: 0.15
                };
                const dz = defaults[currentFunction] || 0.05;
                zScale = dz;
                if (zScaleSlider) {
                    zScaleSlider.value = zScale;
                    zScaleValue.textContent = zScale.toFixed(3);
                }
            }
            rebuild();
        }
    };

    window.update3DColors = function () {
        if (initialized && isSectionOpen()) rebuild();
    };

    window.update3DPath = function () {
        if (initialized && isSectionOpen()) {
            drawPath();
        }
    };

    // ---- Initialize on load if section starts open ----
    if (isSectionOpen()) {
        // Defer to allow layout to settle
        requestAnimationFrame(() => {
            initScene();
            rebuild();
            startAnimating();
        });
    }
})();
