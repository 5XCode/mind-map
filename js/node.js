
class MindNode {
    constructor(id, position, text = '') {
        this.id = id;
        this.position = position; // Vector2D object
        this.text = text;
        this.size = new Vector2D(120, 60);
        this.children = [];
        this.parent = null;
        this.connections = [];
        this.element = null;
        this.isDragging = false;
        this.dragOffset = new Vector2D();
        this.lastTap = 0;
        this.longPressTimer = null;
    }

    createElement() {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'mind-node';
        nodeElement.id = this.id;
        
        nodeElement.innerHTML = `
            <textarea class="node-content" placeholder="اكتب هنا...">${this.text}</textarea>
            <div class="node-sides">
                <button class="side-btn side-top" data-side="top">+</button>
                <button class="side-btn side-right" data-side="right">+</button>
                <button class="side-btn side-bottom" data-side="bottom">+</button>
                <button class="side-btn side-left" data-side="left">+</button>
            </div>
        `;

        this.element = nodeElement;
        this.updatePosition();
        this.setupEventListeners();
        this.autoResize();

        return nodeElement;
    }

    setupEventListeners() {
        // السحب
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));

        // النقر المطول للحذف
        this.element.addEventListener('mousedown', this.startLongPress.bind(this));
        this.element.addEventListener('touchstart', this.startLongPress.bind(this));
        
        this.element.addEventListener('mouseup', this.cancelLongPress.bind(this));
        this.element.addEventListener('touchend', this.cancelLongPress.bind(this));
        this.element.addEventListener('mouseleave', this.cancelLongPress.bind(this));

        // النقر المزدوج للتحديد
        this.element.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // تغيير النص
        const textarea = this.element.querySelector('.node-content');
        textarea.addEventListener('input', this.handleTextChange.bind(this));

        // أزرار الإضافة
        const sideButtons = this.element.querySelectorAll('.side-btn');
        sideButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleSideButtonClick(e.target.dataset.side);
            });
        });
    }

    handleMouseDown(e) {
        if (e.target.classList.contains('side-btn')) return;
        
        e.preventDefault();
        this.startDrag(new Vector2D(e.clientX, e.clientY));
        
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleTouchStart(e) {
        if (e.target.classList.contains('side-btn')) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(new Vector2D(touch.clientX, touch.clientY));
        
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    startDrag(clientPos) {
        this.isDragging = true;
        const rect = this.element.getBoundingClientRect();
        this.dragOffset = new Vector2D(
            clientPos.x - rect.left,
            clientPos.y - rect.top
        );
        this.element.classList.add('dragging');
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.updateDragPosition(new Vector2D(e.clientX, e.clientY));
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        const touch = e.touches[0];
        this.updateDragPosition(new Vector2D(touch.clientX, touch.clientY));
    }

    updateDragPosition(clientPos) {
        const container = document.getElementById('mindMap');
        const containerRect = container.getBoundingClientRect();
        
        const newX = clientPos.x - containerRect.left - this.dragOffset.x;
        const newY = clientPos.y - containerRect.top - this.dragOffset.y;
        
        this.position = new Vector2D(newX, newY);
        this.updatePosition();
        
        // تحديث الاتصالات
        this.connections.forEach(conn => conn.update());
    }

    handleMouseUp() {
        this.endDrag();
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleTouchEnd() {
        this.endDrag();
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    endDrag() {
        this.isDragging = false;
        this.element.classList.remove('dragging');
    }

    startLongPress(e) {
        if (e.target.classList.contains('side-btn')) return;
        
        this.longPressTimer = setTimeout(() => {
            this.explode();
        }, 1000);
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    explode() {
        // تأثير الانفجار
        const explosion = document.getElementById('explosionEffect');
        explosion.style.display = 'block';
        explosion.style.left = (this.position.x + this.size.x / 2) + 'px';
        explosion.style.top = (this.position.y + this.size.y / 2) + 'px';

        // إنشاء جزيئات الانفجار
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.style.left = '0px';
            particle.style.top = '0px';
            particle.style.background = this.getRandomColor();
            
            explosion.appendChild(particle);
            
            // تحريك الجزيئات
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            const duration = 0.5 + Math.random() * 0.5;
            
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { 
                    transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, 
                    opacity: 0 
                }
            ], {
                duration: duration * 1000,
                easing: 'cubic-bezier(0.2, 0, 0.8, 1)'
            }).onfinish = () => particle.remove();
        }

        // إزالة العقدة بعد الانفجار
        setTimeout(() => {
            this.remove();
            explosion.style.display = 'none';
            explosion.innerHTML = '';
        }, 500);
    }

    getRandomColor() {
        const colors = ['#ef4444', '#f59e0b', '#84cc16', '#06d6a0', '#3b82f6', '#8b5cf6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    handleDoubleClick() {
        this.element.classList.toggle('selected');
    }

    handleTextChange(e) {
        this.text = e.target.value;
        this.autoResize();
        
        // حفظ التغييرات تلقائياً
        if (window.mindMap) {
            window.mindMap.autoSave();
        }
    }

    handleSideButtonClick(side) {
        if (window.mindMap) {
            window.mindMap.addNodeFromSide(this, side);
        }
    }

    autoResize() {
        const textarea = this.element.querySelector('.node-content');
        textarea.style.height = 'auto';
        
        const newHeight = Math.max(60, textarea.scrollHeight);
        this.size.y = newHeight;
        textarea.style.height = newHeight + 'px';
        
        this.updatePosition();
    }

    updatePosition() {
        if (this.element) {
            this.element.style.left = this.position.x + 'px';
            this.element.style.top = this.position.y + 'px';
            this.element.style.width = this.size.x + 'px';
            this.element.style.height = this.size.y + 'px';
        }
    }

    remove() {
        if (this.element) {
            this.element.remove();
        }
        
        // إزالة الاتصالات المرتبطة
        this.connections.forEach(conn => conn.remove());
        
        if (this.parent) {
            this.parent.children = this.parent.children.filter(child => child.id !== this.id);
        }
        
        if (window.mindMap) {
            window.mindMap.removeNode(this);
        }
    }

    getCenter() {
        return new Vector2D(
            this.position.x + this.size.x / 2,
            this.position.y + this.size.y / 2
        );
    }

    getSidePosition(side) {
        const center = this.getCenter();
        
        switch(side) {
            case 'top':
                return new Vector2D(center.x, this.position.y);
            case 'right':
                return new Vector2D(this.position.x + this.size.x, center.y);
            case 'bottom':
                return new Vector2D(center.x, this.position.y + this.size.y);
            case 'left':
                return new Vector2D(this.position.x, center.y);
            default:
                return center.clone();
        }
    }
}
