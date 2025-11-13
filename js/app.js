
class App {
    constructor() {
        this.mindMap = null;
        this.init();
    }

    init() {
        // تهيئة التطبيق
        this.mindMap = new MindMap();
        window.mindMap = this.mindMap; // لجعلها متاحة globally
        
        // إضافة أنماط CSS للرسوم المتحركة
        this.addAnimationStyles();
        
        console.log('✅ تم تحميل تطبيق الخرائط الذهنية ثلاثية الأبعاد بنجاح!');
    }

    addAnimationStyles() {
        const styles = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// جعل الوظائف متاحة globally للاستخدام في console
window.MindMap = MindMap;
window.MindNode = MindNode;
window.Connection = Connection;
window.Vector2D = Vector2D;
