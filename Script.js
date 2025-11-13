// حالة التطبيق
let nodes = [];
let connections = [];
let currentNodeId = 0;
let selectedNode = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// إضافة مستطيل جديد
function addNewNode(text = 'اكتب هنا...', x = 200, y = 200) {
    currentNodeId++;
    const nodeId = `node-${currentNodeId}`;
    
    const node = {
        id: nodeId,
        x: x,
        y: y,
        text: text,
        zIndex: currentNodeId
    };
    
    nodes.push(node);
    renderNode(node);
    return nodeId;
}

// عرض المستطيل
function renderNode(node) {
    const mindMap = document.getElementById('mindMap');
    
    const nodeElement = document.createElement('div');
    nodeElement.className = 'node';
    nodeElement.id = node.id;
    nodeElement.style.left = node.x + 'px';
    nodeElement.style.top = node.y + 'px';
    nodeElement.style.zIndex = node.zIndex;
    
    nodeElement.innerHTML = `
        <div class="node-controls">
            <button class="control-btn add-child" onclick="addChildNode('${node.id}')">+</button>
            <button class="control-btn delete-node" onclick="deleteNode('${node.id}')">×</button>
        </div>
        <textarea class="node-content" oninput="updateNodeText('${node.id}', this.value)">${node.text}</textarea>
    `;
    
    // إضافة إمكانية السحب
    makeDraggable(nodeElement);
    
    mindMap.appendChild(nodeElement);
}

// جعل العنصر قابل للسحب
function makeDraggable(element) {
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDragTouch);
    
    function startDrag(e) {
        isDragging = true;
        selectedNode = element;
        const rect = element.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        element.style.cursor = 'grabbing';
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }
    
    function startDragTouch(e) {
        isDragging = true;
        selectedNode = element;
        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
        
        document.addEventListener('touchmove', dragTouch);
        document.addEventListener('touchend', stopDrag);
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const mindMap = document.getElementById('mindMap');
        const mapRect = mindMap.getBoundingClientRect();
        
        const x = e.clientX - mapRect.left - dragOffset.x;
        const y = e.clientY - mapRect.top - dragOffset.y;
        
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        
        // تحديث موقع العقدة في المصفوفة
        const nodeId = element.id;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            node.x = x;
            node.y = y;
        }
        
        updateConnections();
    }
    
    function dragTouch(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const mindMap = document.getElementById('mindMap');
        const mapRect = mindMap.getBoundingClientRect();
        
        const x = touch.clientX - mapRect.left - dragOffset.x;
        const y = touch.clientY - mapRect.top - dragOffset.y;
        
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        
        const nodeId = element.id;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            node.x = x;
            node.y = y;
        }
        
        updateConnections();
    }
    
    function stopDrag() {
        isDragging = false;
        if (selectedNode) {
            selectedNode.style.cursor = 'move';
        }
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', dragTouch);
        document.removeEventListener('mouseup', stopDrag);
    }
}

// إضافة عقدة فرعية
function addChildNode(parentId) {
    const parentNode = nodes.find(n => n.id === parentId);
    if (parentNode) {
        const parentElement = document.getElementById(parentId);
        const parentRect = parentElement.getBoundingClientRect();
        const mindMapRect = document.getElementById('mindMap').getBoundingClientRect();
        
        const childX = parentNode.x + parentRect.width + 50;
        const childY = parentNode.y;
        
        const childId = addNewNode('عقدة جديدة', childX, childY);
        addConnection(parentId, childId);
    }
}

// إضافة سلك بين عقدتين
function addConnection(fromId, toId) {
    const connection = { from: fromId, to: toId };
    connections.push(connection);
    updateConnections();
}

// تحديث الأسلاك
function updateConnections() {
    // إزالة الأسلاك القديمة
    document.querySelectorAll('.connection').forEach(el => el.remove());
    
    // رسم الأسلاك الجديدة
    connections.forEach(conn => {
        const fromElement = document.getElementById(conn.from);
        const toElement = document.getElementById(conn.to);
        
        if (fromElement && toElement) {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            const mindMapRect = document.getElementById('mindMap').getBoundingClientRect();
            
            const fromX = fromRect.left - mindMapRect.left + fromRect.width;
            const fromY = fromRect.top - mindMapRect.top + fromRect.height / 2;
            const toX = toRect.left - mindMapRect.left;
            const toY = toRect.top - mindMapRect.top + toRect.height / 2;
            
            const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
            const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
            
            const connection = document.createElement('div');
            connection.className = 'connection';
            connection.style.width = length + 'px';
            connection.style.left = fromX + 'px';
            connection.style.top = fromY + 'px';
            connection.style.transform = `rotate(${angle}deg)`;
            
            document.getElementById('mindMap').appendChild(connection);
        }
    });
}

// تحديث نص العقدة
function updateNodeText(nodeId, text) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        node.text = text;
    }
}

// حذف عقدة
function deleteNode(nodeId) {
    if (confirm('هل تريد حذف هذه العقدة؟')) {
        // إزالة العقدة من DOM
        const element = document.getElementById(nodeId);
        if (element) {
            element.remove();
        }
        
        // إزالة العقدة من المصفوفة
        nodes = nodes.filter(n => n.id !== nodeId);
        
        // إزالة الاتصالات المرتبطة
        connections = connections.filter(conn => 
            conn.from !== nodeId && conn.to !== nodeId
        );
        
        updateConnections();
    }
}

// حفظ الخريطة
function saveMap() {
    const mapData = {
        nodes: nodes,
        connections: connections,
        currentId: currentNodeId
    };
    
    localStorage.setItem('mindMap3D', JSON.stringify(mapData));
    alert('تم حفظ الخريطة بنجاح!');
}

// تحميل الخريطة
function loadMap() {
    const saved = localStorage.getItem('mindMap3D');
    if (saved) {
        const mapData = JSON.parse(saved);
        
        // مسح الخريطة الحالية
        document.querySelectorAll('.node, .connection').forEach(el => el.remove());
        
        // تحميل البيانات
        nodes = mapData.nodes || [];
        connections = mapData.connections || [];
        currentNodeId = mapData.currentId || 0;
        
        // إعادة بناء الخريطة
        nodes.forEach(node => renderNode(node));
        updateConnections();
        
        alert('تم تحميل الخريطة بنجاح!');
    } else {
        alert('لا توجد خريطة محفوظة!');
    }
}

// بدء من جديد
function resetMap() {
    if (confirm('هل تريد مسح الخريطة الحالية والبدء من جديد؟')) {
        document.querySelectorAll('.node, .connection').forEach(el => el.remove());
        nodes = [];
        connections = [];
        currentNodeId = 0;
    }
}

// التهيئة الأولية
window.onload = function() {
    // إضافة عقدة افتراضية عند التحميل
    addNewNode('مرحباً! ابدأ خريطتك الذهنية هنا', 300, 200);
    
    // تحميل الخريطة المحفوظة تلقائياً إذا وجدت
    setTimeout(loadMap, 1000);
};
