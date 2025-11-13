
// map.js - خرائط ذهنية ثلاثية الأبعاد متطورة

class MindMap3D {
    constructor() {
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.canvasPan = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.zoomLevel = 1;
        this.nodeIdCounter = 0;
        this.connectionIdCounter = 0;
        this.animationFrameId = null;
        this.history = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupThreeJS();
        this.createDefaultCentralNode();
        this.startAnimationLoop();
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
    }

    setupCanvas() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // ضبط حجم الـ canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    setupThreeJS() {
        // إنشاء مشهد Three.js ثلاثي الأبعاد
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.canvas.appendChild(this.renderer.domElement);
        
        // إضاءة المشهد
        this.setupLighting();
        
        // ضبط الكاميرا
        this.camera.position.z = 50;
        
        // مجموعة العقد ثلاثية الأبعاد
        this.nodeGroup = new THREE.Group();
        this.scene.add(this.nodeGroup);
        
        // مجموعة الاتصالات
        this.connectionGroup = new THREE.Group();
        this.scene.add(this.connectionGroup);
    }

    setupLighting() {
        // إضاءة محيطة
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // إضاءة اتجاهية
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);
        
        // إضاءة نقطية
        const pointLight = new THREE.PointLight(0x4a6ee0, 0.5);
        pointLight.position.set(-50, -50, 50);
        this.scene.add(pointLight);
    }

    setupEventListeners() {
        // أحداث الفأرة
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // أحداث اللمس
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // أحداث الأزرار
        document.getElementById('addNode').addEventListener('click', () => this.addRandomNode());
        document.getElementById('addCentralNode').addEventListener('click', () => this.addCentralNode());
        document.getElementById('preview').addEventListener('click', () => this.showPreview());
        document.getElementById('export').addEventListener('click', () => this.exportMap());
        document.getElementById('import').addEventListener('click', () => this.importMap());
        document.getElementById('settings').addEventListener('click', () => this.toggleSettings());
        
        // أحداث الخصائص
        this.setupPropertyEvents();
    }

    setupPropertyEvents() {
        document.getElementById('nodeColor').addEventListener('change', (e) => {
            if (this.selectedNode) {
                this.updateNodeColor(this.selectedNode, e.target.value);
            }
        });
        
        document.getElementById('textColor').addEventListener('change', (e) => {
            if (this.selectedNode) {
                this.updateTextColor(this.selectedNode, e.target.value);
            }
        });
        
        document.getElementById('fontSize').addEventListener('change', (e) => {
            if (this.selectedNode) {
                this.updateFontSize(this.selectedNode, e.target.value);
            }
        });
        
        document.getElementById('connectionStyle').addEventListener('change', (e) => {
            this.updateConnectionStyle(e.target.value);
        });
        
        document.getElementById('connectionColor').addEventListener('change', (e) => {
            this.updateConnectionColor(e.target.value);
        });
    }

    setupContextMenu() {
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z للتراجع
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl+Y للإعادة
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
            
            // Delete لحذف العقدة المحددة
            if (e.key === 'Delete' && this.selectedNode) {
                this.removeNode(this.selectedNode);
            }
            
            // Escape لإلغاء التحديد
            if (e.key === 'Escape') {
                this.deselectNode();
            }
            
            // مسافة للبدء في السحب
            if (e.key === ' ' && !e.repeat) {
                this.startPanning();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                this.stopPanning();
            }
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 0) { // زر الفأرة الأيسر
            const node = this.getNodeAtPosition(x, y);
            if (node) {
                this.selectNode(node);
                this.startDragging(node, x, y);
            } else {
                this.startPanning(x, y);
            }
        } else if (e.button === 2) { // زر الفأرة الأيمن
            this.showContextMenu(e.clientX, e.clientY);
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.dragging && this.selectedNode) {
            this.dragNode(x, y);
        } else if (this.isPanning) {
            this.panCanvas(x, y);
        }
    }

    handleMouseUp() {
        if (this.dragging) {
            this.stopDragging();
            this.saveToHistory();
        }
        this.stopPanning();
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        this.zoomLevel += e.deltaY * zoomSpeed;
        this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel));
        this.applyZoom();
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const node = this.getNodeAtPosition(x, y);
            if (node) {
                this.selectNode(node);
                this.startDragging(node, x, y);
            } else {
                this.startPanning(x, y);
            }
        } else if (e.touches.length === 2) {
            this.startPinchZoom(e);
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.dragging && this.selectedNode) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.dragNode(x, y);
        } else if (e.touches.length === 2) {
            this.handlePinchZoom(e);
        }
    }

    handleTouchEnd() {
        if (this.dragging) {
            this.stopDragging();
            this.saveToHistory();
        }
        this.stopPanning();
    }

    startPinchZoom(e) {
        this.pinchStartDistance = this.getTouchDistance(e);
        this.pinchStartZoom = this.zoomLevel;
    }

    handlePinchZoom(e) {
        const currentDistance = this.getTouchDistance(e);
        const scale = currentDistance / this.pinchStartDistance;
        this.zoomLevel = this.pinchStartZoom * scale;
        this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel));
        this.applyZoom();
    }

    getTouchDistance(e) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNodeAtPosition(x, y) {
        for (const [id, node] of this.nodes) {
            const nodeX = node.x * this.zoomLevel + this.canvasPan.x;
            const nodeY = node.y * this.zoomLevel + this.canvasPan.y;
            
            if (x >= nodeX - node.width / 2 && x <= nodeX + node.width / 2 &&
                y >= nodeY - node.height / 2 && y <= nodeY + node.height / 2) {
                return node;
            }
        }
        return null;
    }

    selectNode(node) {
        this.deselectNode();
        this.selectedNode = node;
        node.element.classList.add('selected');
        this.updatePropertyPanel(node);
    }

    deselectNode() {
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
            this.selectedNode = null;
        }
    }

    startDragging(node, x, y) {
        this.dragging = true;
        this.dragOffset.x = x - (node.x * this.zoomLevel + this.canvasPan.x);
        this.dragOffset.y = y - (node.y * this.zoomLevel + this.canvasPan.y);
        node.element.style.zIndex = '1000';
        node.element.classList.add('dragging');
    }

    dragNode(x, y) {
        if (this.selectedNode) {
            this.selectedNode.x = (x - this.dragOffset.x - this.canvasPan.x) / this.zoomLevel;
            this.selectedNode.y = (y - this.dragOffset.y - this.canvasPan.y) / this.zoomLevel;
            this.updateNodePosition(this.selectedNode);
            this.updateConnections(this.selectedNode);
        }
    }

    stopDragging() {
        this.dragging = false;
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('dragging');
            this.selectedNode.element.style.zIndex = '10';
        }
    }

    startPanning(x, y) {
        this.isPanning = true;
        this.lastPanPoint.x = x;
        this.lastPanPoint.y = y;
        this.canvas.style.cursor = 'grabbing';
    }

    panCanvas(x, y) {
        if (this.isPanning) {
            const dx = x - this.lastPanPoint.x;
            const dy = y - this.lastPanPoint.y;
            
            this.canvasPan.x += dx;
            this.canvasPan.y += dy;
            
            this.lastPanPoint.x = x;
            this.lastPanPoint.y = y;
            
            this.updateAllNodesPosition();
        }
    }

    stopPanning() {
        this.isPanning = false;
        this.canvas.style.cursor = 'grab';
    }

    applyZoom() {
        this.updateAllNodesPosition();
        this.updateAllConnections();
    }

    createDefaultCentralNode() {
        const centralNode = this.createNode(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'الفكرة الرئيسية',
            true
        );
        this.selectNode(centralNode);
    }

    createNode(x, y, text = 'عقدة جديدة', isCentral = false) {
        const nodeId = `node-${this.nodeIdCounter++}`;
        
        // إنشاء عنصر DOM للعقدة
        const nodeElement = document.createElement('div');
        nodeElement.className = `node-3d ${isCentral ? 'node-central floating' : ''}`;
        nodeElement.innerHTML = `
            <div class="node-content">
                <div class="node-text" contenteditable="true">${text}</div>
            </div>
            <div class="node-connectors">
                <div class="connector top" data-direction="top">+</div>
                <div class="connector right" data-direction="right">+</div>
                <div class="connector bottom" data-direction="bottom">+</div>
                <div class="connector left" data-direction="left">+</div>
            </div>
            <div class="node-close">×</div>
        `;
        
        this.canvas.appendChild(nodeElement);
        
        // بيانات العقدة
        const node = {
            id: nodeId,
            element: nodeElement,
            x: x,
            y: y,
            width: 200,
            height: 100,
            text: text,
            color: isCentral ? '#4a6ee0' : '#ffffff',
            textColor: isCentral ? '#ffffff' : '#2d3748',
            fontSize: 16,
            isCentral: isCentral,
            connections: new Set()
        };
        
        this.nodes.set(nodeId, node);
        
        // إضافة أحداث العقدة
        this.setupNodeEvents(node);
        
        // تحديث الموضع
        this.updateNodePosition(node);
        
        // إنشاء نموذج ثلاثي الأبعاد
        this.create3DNode(node);
        
        return node;
    }

    create3DNode(node) {
        // إنشاء شكل العقدة ثلاثية الأبعاد
        const geometry = new THREE.BoxGeometry(2, 1, 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: node.isCentral ? 0x4a6ee0 : 0xffffff,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.nodeId = node.id;
        
        // إضافة تأثير الإضاءة
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        mesh.add(line);
        
        this.nodeGroup.add(mesh);
        node.threeMesh = mesh;
        
        this.update3DNodePosition(node);
    }

    update3DNodePosition(node) {
        if (node.threeMesh) {
            // تحويل الإحداثيات ثنائية الأبعاد إلى ثلاثية الأبعاد
            const x = (node.x - window.innerWidth / 2) * 0.01;
            const y = -(node.y - window.innerHeight / 2) * 0.01;
            const z = 0;
            
            node.threeMesh.position.set(x, y, z);
            
            // تأثير الطفو للعقد المركزية
            if (node.isCentral) {
                node.threeMesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
                node.threeMesh.rotation.y = Math.cos(Date.now() * 0.001) * 0.1;
            }
        }
    }

    setupNodeEvents(node) {
        const nodeElement = node.element;
        
        // أحداث السحب
        nodeElement.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('connector') && 
                !e.target.classList.contains('node-close')) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.selectNode(node);
                this.startDragging(node, x, y);
            }
        });
        
        // أحداث أزرار الاتصال
        const connectors = nodeElement.querySelectorAll('.connector');
        connectors.forEach(connector => {
            connector.addEventListener('click', (e) => {
                e.stopPropagation();
                const direction = connector.dataset.direction;
                this.createConnectedNode(node, direction);
            });
        });
        
        // حدث زر الإغلاق
        const closeBtn = nodeElement.querySelector('.node-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeNode(node);
        });
        
        // حدث تحرير النص
        const textElement = nodeElement.querySelector('.node-text');
        textElement.addEventListener('blur', () => {
            node.text = textElement.textContent;
            this.saveToHistory();
        });
        
        textElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textElement.blur();
            }
        });
    }

    createConnectedNode(parentNode, direction) {
        const distance = 200;
        let x, y;
        
        switch(direction) {
            case 'top':
                x = parentNode.x;
                y = parentNode.y - distance;
                break;
            case 'right':
                x = parentNode.x + distance;
                y = parentNode.y;
                break;
            case 'bottom':
                x = parentNode.x;
                y = parentNode.y + distance;
                break;
            case 'left':
                x = parentNode.x - distance;
                y = parentNode.y;
                break;
        }
        
        const newNode = this.createNode(x, y, 'عقدة فرعية');
        this.createConnection(parentNode, newNode, direction);
        this.saveToHistory();
    }

    createConnection(node1, node2, direction) {
        const connectionId = `connection-${this.connectionIdCounter++}`;
        
        const connection = {
            id: connectionId,
            node1: node1,
            node2: node2,
            direction: direction,
            color: '#4a6ee0',
            style: 'solid'
        };
        
        this.connections.set(connectionId, connection);
        node1.connections.add(connectionId);
        node2.connections.add(connectionId);
        
        // إنشاء اتصال ثلاثي الأبعاد
        this.create3DConnection(connection);
        
        return connection;
    }

    create3DConnection(connection) {
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(1, 1, 0));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x4a6ee0,
            linewidth: 2
        });
        
        const line = new THREE.Line(geometry, material);
        this.connectionGroup.add(line);
        connection.threeLine = line;
        
        this.update3DConnection(connection);
    }

    update3DConnection(connection) {
        if (connection.threeLine) {
            const node1 = connection.node1;
            const node2 = connection.node2;
            
            const x1 = (node1.x - window.innerWidth / 2) * 0.01;
            const y1 = -(node1.y - window.innerHeight / 2) * 0.01;
            const z1 = 0.1;
            
            const x2 = (node2.x - window.innerWidth / 2) * 0.01;
            const y2 = -(node2.y - window.innerHeight / 2) * 0.01;
            const z2 = 0.1;
            
            const points = [
                new THREE.Vector3(x1, y1, z1),
                new THREE.Vector3(x2, y2, z2)
            ];
            
            connection.threeLine.geometry.setFromPoints(points);
        }
    }

    updateNodePosition(node) {
        const x = node.x * this.zoomLevel + this.canvasPan.x;
        const y = node.y * this.zoomLevel + this.canvasPan.y;
        
        node.element.style.transform = `translate(${x - node.width / 2}px, ${y - node.height / 2}px) scale(${this.zoomLevel})`;
        
        this.update3DNodePosition(node);
    }

    updateAllNodesPosition() {
        for (const node of this.nodes.values()) {
            this.updateNodePosition(node);
        }
    }

    updateConnections(node) {
        for (const connectionId of node.connections) {
            const connection = this.connections.get(connectionId);
            if (connection) {
                this.updateConnection(connection);
                this.update3DConnection(connection);
            }
        }
    }

    updateAllConnections() {
        for (const connection of this.connections.values()) {
            this.updateConnection(connection);
            this.update3DConnection(connection);
        }
    }

    updateConnection(connection) {
        // سيتم تحديث الاتصالات ثنائية الأبعاد هنا إذا لزم الأمر
    }

    removeNode(node) {
        // إزالة جميع الاتصالات المرتبطة بالعقدة
        for (const connectionId of node.connections) {
            this.removeConnection(connectionId);
        }
        
        // إزالة النموذج ثلاثي الأبعاد
        if (node.threeMesh) {
            this.nodeGroup.remove(node.threeMesh);
        }
        
        // إزالة عنصر DOM
        node.element.remove();
        
        // إزالة من الخريطة
        this.nodes.delete(node.id);
        
        if (this.selectedNode === node) {
            this.deselectNode();
        }
        
        this.saveToHistory();
    }

    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            // إزالة من العقد المرتبطة
            connection.node1.connections.delete(connectionId);
            connection.node2.connections.delete(connectionId);
            
            // إزالة النموذج ثلاثي الأبعاد
            if (connection.threeLine) {
                this.connectionGroup.remove(connection.threeLine);
            }
            
            // إزالة من الخريطة
            this.connections.delete(connectionId);
        }
    }

    addRandomNode() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        this.createNode(x, y, 'عقدة جديدة');
        this.saveToHistory();
    }

    addCentralNode() {
        const x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
        const y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
        this.createNode(x, y, 'عقدة مركزية', true);
        this.saveToHistory();
    }

    updateNodeColor(node, color) {
        node.color = color;
        node.element.querySelector('.node-content').style.backgroundColor = color;
        
        if (node.threeMesh) {
            node.threeMesh.material.color.setStyle(color);
        }
        
        this.saveToHistory();
    }

    updateTextColor(node, color) {
        node.textColor = color;
        node.element.querySelector('.node-text').style.color = color;
        this.saveToHistory();
    }

    updateFontSize(node, size) {
        node.fontSize = size;
        node.element.querySelector('.node-text').style.fontSize = `${size}px`;
        this.saveToHistory();
    }

    updateConnectionStyle(style) {
        for (const connection of this.connections.values()) {
            connection.style = style;
            // تحديث نمط الخط ثلاثي الأبعاد
        }
        this.saveToHistory();
    }

    updateConnectionColor(color) {
        for (const connection of this.connections.values()) {
            connection.color = color;
            if (connection.threeLine) {
                connection.threeLine.material.color.setStyle(color);
            }
        }
        this.saveToHistory();
    }

    updatePropertyPanel(node) {
        document.getElementById('nodeColor').value = node.color;
        document.getElementById('textColor').value = node.textColor;
        document.getElementById('fontSize').value = node.fontSize;
    }

    showContextMenu(x, y) {
        // إنشاء قائمة سياق مخصصة
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 10px 0;
            z-index: 10000;
            min-width: 150px;
        `;
        
        contextMenu.innerHTML = `
            <div class="context-item" data-action="addNode">إضافة عقدة</div>
            <div class="context-item" data-action="addCentralNode">إضافة عقدة مركزية</div>
            <div class="context-divider"></div>
            <div class="context-item" data-action="centerView">توسيط العرض</div>
            <div class="context-item" data-action="resetZoom">إعادة ضبط التكبير</div>
        `;
        
        document.body.appendChild(contextMenu);
        
        // إضافة الأحداث
        contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextAction(action, x, y);
                document.body.removeChild(contextMenu);
            });
        });
        
        // إزالة القائمة عند النقر خارجها
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    document.body.removeChild(contextMenu);
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 100);
    }

    handleContextAction(action, x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        switch(action) {
            case 'addNode':
                this.createNode(
                    (canvasX - this.canvasPan.x) / this.zoomLevel,
                    (canvasY - this.canvasPan.y) / this.zoomLevel,
                    'عقدة جديدة'
                );
                break;
            case 'addCentralNode':
                this.createNode(
                    (canvasX - this.canvasPan.x) / this.zoomLevel,
                    (canvasY - this.canvasPan.y) / this.zoomLevel,
                    'عقدة مركزية',
                    true
                );
                break;
            case 'centerView':
                this.centerView();
                break;
            case 'resetZoom':
                this.resetZoom();
                break;
        }
        this.saveToHistory();
    }

    centerView() {
        this.canvasPan.x = 0;
        this.canvasPan.y = 0;
        this.zoomLevel = 1;
        this.updateAllNodesPosition();
        this.updateAllConnections();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.applyZoom();
    }

    showPreview() {
        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        
        // إنشاء معاينة للخريطة
        content.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: #4a6ee0; margin-bottom: 20px;">معاينة الخريطة الذهنية</h3>
                <p>عدد العقد: ${this.nodes.size}</p>
                <p>عدد الاتصالات: ${this.connections.size}</p>
                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                    <strong>معلومات الخريطة:</strong><br>
                    - يمكن تصدير الخريطة بتنسيق JSON<br>
                    - يمكن استيراد خرائط سابقة<br>
                    - يدعم التكبير والتصغير<br>
                    - واجهة ثلاثية الأبعاد تفاعلية
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // إغلاق النافذة
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    exportMap() {
        const mapData = {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                x: node.x,
                y: node.y,
                text: node.text,
                color: node.color,
                textColor: node.textColor,
                fontSize: node.fontSize,
                isCentral: node.isCentral
            })),
            connections: Array.from(this.connections.values()).map(conn => ({
                id: conn.id,
                node1Id: conn.node1.id,
                node2Id: conn.node2.id,
                direction: conn.direction,
                color: conn.color,
                style: conn.style
            })),
            version: '1.0',
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(mapData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `mind-map-${new Date().getTime()}.json`;
        link.click();
    }

    importMap() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const mapData = JSON.parse(event.target.result);
                        this.loadMapData(mapData);
                    } catch (error) {
                        alert('خطأ في تحميل الملف: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        });
        
        input.click();
    }

    loadMapData(mapData) {
        // مسح الخريطة الحالية
        this.clearMap();
        
        // تحميل العقد
        const nodeMap = new Map();
        mapData.nodes.forEach(nodeData => {
            const node = this.createNode(nodeData.x, nodeData.y, nodeData.text, nodeData.isCentral);
            nodeMap.set(nodeData.id, node);
            
            // تحديث الخصائص
            this.updateNodeColor(node, nodeData.color);
            this.updateTextColor(node, nodeData.textColor);
            this.updateFontSize(node, nodeData.fontSize);
        });
        
        // تحميل الاتصالات
        mapData.connections.forEach(connData => {
            const node1 = nodeMap.get(connData.node1Id);
            const node2 = nodeMap.get(connData.node2Id);
            
            if (node1 && node2) {
                const connection = this.createConnection(node1, node2, connData.direction);
                this.updateConnectionColor(connData.color);
            }
        });
        
        this.saveToHistory();
    }

    clearMap() {
        // مسح جميع العقد والاتصالات
        for (const node of this.nodes.values()) {
            this.removeNode(node);
        }
        
        this.nodes.clear();
        this.connections.clear();
        this.deselectNode();
    }

    toggleSettings() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('hidden');
    }

    saveToHistory() {
        // حفظ حالة الخريطة في التاريخ
        const state = this.serializeState();
        
        // إزالة الحالات بعد المؤشر الحالي
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
        
        // تحديد الحد الأقصى للتاريخ
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    serializeState() {
        return {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                x: node.x,
                y: node.y,
                text: node.text,
                color: node.color,
                textColor: node.textColor,
                fontSize: node.fontSize,
                isCentral: node.isCentral
            })),
            connections: Array.from(this.connections.values()).map(conn => ({
                node1Id: conn.node1.id,
                node2Id: conn.node2.id,
                direction: conn.direction
            })),
            canvasPan: { ...this.canvasPan },
            zoomLevel: this.zoomLevel
        };
    }

    deserializeState(state) {
        this.clearMap();
        
        // إعادة إنشاء العقد
        const nodeMap = new Map();
        state.nodes.forEach(nodeData => {
            const node = this.createNode(nodeData.x, nodeData.y, nodeData.text, nodeData.isCentral);
            nodeMap.set(nodeData.id, node);
            
            this.updateNodeColor(node, nodeData.color);
            this.updateTextColor(node, nodeData.textColor);
            this.updateFontSize(node, nodeData.fontSize);
        });
        
        // إعادة إنشاء الاتصالات
        state.connections.forEach(connData => {
            const node1 = nodeMap.get(connData.node1Id);
            const node2 = nodeMap.get(connData.node2Id);
            
            if (node1 && node2) {
                this.createConnection(node1, node2, connData.direction);
            }
        });
        
        // استعادة حالة العرض
        this.canvasPan = { ...state.canvasPan };
        this.zoomLevel = state.zoomLevel;
        this.applyZoom();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.deserializeState(state);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.deserializeState(state);
        }
    }

    startAnimationLoop() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.renderThreeJS();
        };
        animate();
    }

    renderThreeJS() {
        // تحريك المشهد ثلاثي الأبعاد
        this.nodeGroup.rotation.y += 0.001;
        this.connectionGroup.rotation.y += 0.001;
        
        this.renderer.render(this.scene, this.camera);
    }

    render() {
        // render للعناصر ثنائية الأبعاد
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // رسم خلفية الشبكة
        this.drawGrid();
    }

    drawGrid() {
        const gridSize = 50 * this.zoomLevel;
        const offsetX = this.canvasPan.x % gridSize;
        const offsetY = this.canvasPan.y % gridSize;
        
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // الخطوط الأفقية
        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // الخطوط العمودية
        for (let x = offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
    }

    // دالة التدمير للتنظيف
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // إزالة جميع المستمعين للأحداث
        window.removeEventListener('resize', this.resizeCanvas);
        
        // تنظيف Three.js
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.mindMap = new MindMap3D();
});

// دالات مساعدة إضافية
class MindMapUtils {
    static generateNodeId() {
        return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    static calculateDistance(node1, node2) {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    static getAngleBetweenNodes(node1, node2) {
        return Math.atan2(node2.y - node1.y, node2.x - node1.x);
    }
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

// تصدير الكلاس للاستخدام الخارجي
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MindMap3D, MindMapUtils };
}
