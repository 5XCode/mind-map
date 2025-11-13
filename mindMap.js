class MindMap {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.nextNodeId = 1;
        this.viewMode = 'edit'; // 'edit' or 'view'
        this.zoomLevel = 1;
        this.panOffset = new Vector2D(0, 0);
        this.isPanning = false;
        this.panStart = new Vector2D(0, 0);
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.createRootNode();
        this.loadFromStorage();
    }

    setupEventListeners() {
        const container = document.getElementById('mindMapContainer');
        const mindMap = document.getElementById('mindMap');

        // التكبير والتصغير
        container.addEventListener('wheel', this.handleWheel.bind(this));

        // السحب لتحريك الخريطة
        container.addEventListener('mousedown', this.startPan.bind(this));
        container.addEventListener('touchstart', this.startPanTouch.bind(this));

        // أزرار التحكم
        document.getElementById('toggleView').addEventListener('click', this.toggleViewMode.bind(this));
        document.getElementById('saveMap').addEventListener('click', this.saveToStorage.bind(this));
        document.getElementById('loadMap').addEventListener('click', this.loadFromStorage.bind(this));
        document.getElementById('resetMap').addEventListener('click', this.reset.bind(this));
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(0.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-0.2));

        // الحفظ التلقائي
        window.addEventListener('beforeunload', this.autoSave.bind(this));
    }

    createRootNode() {
        const rootPosition = new Vector2D(500, 300);
        const rootNode = this.addNode(rootPosition, 'الفكرة الرئيسية');
        return rootNode;
    }

    addNode(position, text = '') {
        const id = `node-${this.nextNodeId++}`;
        const node = new MindNode(id, position, text);
        
        this.nodes.set(id, node);
        
        const mindMapElement = document.getElementById('mindMap');
        mindMapElement.appendChild(node.createElement());
        
        return node;
    }

    addNodeFromSide(parentNode, side) {
        const parentRect = parentNode.element.getBoundingClientRect();
        const mindMapRect = document.getElementById('mindMap').getBoundingClientRect();
        
        let newPosition;
        const spacing = 80;

        switch(side) {
            case 'top':
                newPosition = new Vector2D(
                    parentNode.position.x,
                    parentNode.position.y - spacing - parentNode.size.y
                );
                break;
            case 'right':
                newPosition = new Vector2D(
                    parentNode.position.x + parentNode.size.x + spacing,
                    parentNode.position.y
                );
                break;
            case 'bottom':
                newPosition = new Vector2D(
                    parentNode.position.x,
                    parentNode.position.y + parentNode.size.y + spacing
                );
                break;
            case 'left':
                newPosition = new Vector2D(
                    parentNode.position.x - spacing - parentNode.size.x,
                    parentNode.position.y
                );
                break;
        }

        const newNode = this.addNode(newPosition, 'فكرة جديدة');
        const connection = new Connection(parentNode, newNode, this);
        this.connections.push(connection);
        
        newNode.parent = parentNode;
        parentNode.children.push(newNode);

        return newNode;
    }

    removeNode(node) {
        // إزالة جميع الاتصالات المرتبطة بالعقدة
        node.connections.forEach(conn => {
            this.connections = this.connections.filter(c => c !== conn);
            conn.remove();
        });

        // إزالة العقدة من الخريطة
        this.nodes.delete(node.id);
        
        // الحفظ التلقائي
        this.autoSave();
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.1;
        this.zoom(delta);
    }

    zoom(delta) {
        this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel + delta));
        
        const mindMap = document.getElementById('mindMap');
        mindMap.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
        
        // تحديث مستوى التكبير المعروض
        document.querySelector('.zoom-level').textContent = 
            Math.round(this.zoomLevel * 100) + '%';
    }

    startPan(e) {
        e.preventDefault();
        this.isPanning = true;
        this.panStart = new Vector2D(e.clientX, e.clientY);
        
        document.addEventListener('mousemove', this.handlePan.bind(this));
        document.addEventListener('mouseup', this.stopPan.bind(this));
    }

    startPanTouch(e) {
        e.preventDefault();
        this.isPanning = true;
        const touch = e.touches[0];
        this.panStart = new Vector2D(touch.clientX, touch.clientY);
        
        document.addEventListener('touchmove', this.handlePanTouch.bind(this));
        document.addEventListener('touchend', this.stopPan.bind(this));
    }

    handlePan(e) {
        if (!this.isPanning) return;
        
        const delta = new Vector2D(
            e.clientX - this.panStart.x,
            e.clientY - this.panStart.y
        );
        
        this.panOffset = this.panOffset.add(delta);
        this.updatePanPosition();
        this.panStart = new Vector2D(e.clientX, e.clientY);
    }

    handlePanTouch(e) {
        if (!this.isPanning) return;
        
        const touch = e.touches[0];
        const delta = new Vector2D(
            touch.clientX - this.panStart.x,
            touch.clientY - this.panStart.y
        );
        
        this.panOffset = this.panOffset.add(delta);
        this.updatePanPosition();
        this.panStart = new Vector2D(touch.clientX, touch.clientY);
    }

    updatePanPosition() {
        const mindMap = document.getElementById('mindMap');
        const transform = `translate(calc(-50% + ${this.panOffset.x}px), calc(-50% + ${this.panOffset.y}px)) scale(${this.zoomLevel})`;
        mindMap.style.transform = transform;
    }

    stopPan() {
        this.isPanning = false;
        document.removeEventListener('mousemove', this.handlePan.bind(this));
        document.removeEventListener('touchmove', this.handlePanTouch.bind(this));
        document.removeEventListener('mouseup', this.stopPan.bind(this));
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'edit' ? 'view' : 'edit';
        const toggleBtn = document.getElementById('toggleView');
        
        if (this.viewMode === 'view') {
            // إخفاء عناصر التحرير
            document.querySelectorAll('.side-btn').forEach(btn => {
                btn.style.display = 'none';
            });
            document.querySelectorAll('.node-content').forEach(textarea => {
                textarea.readOnly = true;
            });
            toggleBtn.classList.add('active');
            toggleBtn.querySelector('.text').textContent = 'وضع التحرير';
        } else {
            // إظهار عناصر التحرير
            document.querySelectorAll('.side-btn').forEach(btn => {
                btn.style.display = 'flex';
            });
            document.querySelectorAll('.node-content').forEach(textarea => {
                textarea.readOnly = false;
            });
            toggleBtn.classList.remove('active');
            toggleBtn.querySelector('.text').textContent = 'وضع العرض';
        }
    }

    saveToStorage() {
        const data = {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                position: { x: node.position.x, y: node.position.y },
                text: node.text,
                size: { x: node.size.x, y: node.size.y }
            })),
            connections: this.connections.map(conn => ({
                fromId: conn.fromNode.id,
                toId: conn.toNode.id
            })),
            nextNodeId: this.nextNodeId,
            zoomLevel: this.zoomLevel,
            panOffset: { x: this.panOffset.x, y: this.panOffset.y }
        };

        localStorage.setItem('mindMap3DData', JSON.stringify(data));
        
        // إظهار رسالة نجاح
        this.showNotification('تم حفظ الخريطة بنجاح!');
    }

    loadFromStorage() {
        const saved = localStorage.getItem('mindMap3DData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // مسح الخريطة الحالية
                this.clear();
                
                // استعادة العقد
                data.nodes.forEach(nodeData => {
                    const position = new Vector2D(nodeData.position.x, nodeData.position.y);
                    const node = this.addNode(position, nodeData.text);
                    node.size = new Vector2D(nodeData.size.x, nodeData.size.y);
                    node.updatePosition();
                    node.autoResize();
                });
                
                // استعادة الاتصالات
                data.connections.forEach(connData => {
                    const fromNode = this.nodes.get(connData.fromId);
                    const toNode = this.nodes.get(connData.toId);
                    
                    if (fromNode && toNode) {
                        const connection = new Connection(fromNode, toNode, this);
                        this.connections.push(connection);
                    }
                });
                
                // استعادة الإعدادات
                this.nextNodeId = data.nextNodeId || this.nextNodeId;
                this.zoomLevel = data.zoomLevel || 1;
                this.panOffset = new Vector2D(
                    data.panOffset?.x || 0,
                    data.panOffset?.y || 0
                );
                
                this.updatePanPosition();
                this.zoom(0); // لتحديث مستوى التكبير
                
                this.showNotification('تم تحميل الخريطة بنجاح!');
                
            } catch (error) {
                console.error('Error loading map:', error);
                this.showNotification('خطأ في تحميل الخريطة المحفوظة', 'error');
            }
        }
    }

    autoSave() {
        // الحفظ التلقائي بعد تأخير بسيط
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            this.saveToStorage();
        }, 1000);
    }

    showNotification(message, type = 'success') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : '#06d6a0'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 2000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // إزالة الإشعار بعد 3 ثوانٍ
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    clear() {
        // مسح جميع العقد والاتصالات
        this.nodes.forEach(node => node.remove());
        this.connections.forEach(conn => conn.remove());
        this.nodes.clear();
        this.connections = [];
    }

    reset() {
        if (confirm('هل تريد مسح الخريطة الحالية والبدء من جديد؟')) {
            this.clear();
            this.nextNodeId = 1;
            this.zoomLevel = 1;
            this.panOffset = new Vector2D(0, 0);
            this.updatePanPosition();
            this.createRootNode();
        }
    }
}
