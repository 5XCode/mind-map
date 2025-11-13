class Connection {
    constructor(fromNode, toNode, mindMap) {
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.mindMap = mindMap;
        this.element = null;
        this.type = 'solid';
        
        this.createElement();
        this.update();
    }

    createElement() {
        const connection = document.createElement('div');
        connection.className = `connection ${this.type}`;
        this.element = connection;
        
        const mindMapElement = document.getElementById('mindMap');
        mindMapElement.appendChild(connection);
        
        // إضافة الاتصال للعقد
        this.fromNode.connections.push(this);
        this.toNode.connections.push(this);
    }

    update() {
        if (!this.element) return;

        const fromCenter = this.fromNode.getCenter();
        const toCenter = this.toNode.getCenter();

        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        this.element.style.width = length + 'px';
        this.element.style.left = fromCenter.x + 'px';
        this.element.style.top = fromCenter.y + 'px';
        this.element.style.transform = `rotate(${angle}deg)`;
    }

    remove() {
        if (this.element) {
            this.element.remove();
        }
        
        // إزالة الاتصال من العقد
        this.fromNode.connections = this.fromNode.connections.filter(conn => 
            conn !== this
        );
        this.toNode.connections = this.toNode.connections.filter(conn => 
            conn !== this
        );
    }

    setType(type) {
        this.type = type;
        if (this.element) {
            this.element.className = `connection ${type}`;
        }
    }
}
