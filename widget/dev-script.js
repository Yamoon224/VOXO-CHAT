// widget/dev-script.js

// Configuration complète du widget pour les tests
window.ChatBotConfig = {
    // ID du tenant (doit correspondre à un tenant existant dans votre DB)
    tenantId: '7f8b6c7f-acda-4d24-b51c-165795cd1f84',
    
    // Configuration de base
    name: 'VOXO Assistant',
    welcomeMessage: '👋 Bonjour ! Je suis l\'assistant virtuel de VOXO. Comment puis-je vous aider aujourd\'hui ?',
    
    // Thème et apparence
    theme: {
        primaryColor: '#3b82f6',
        textColor: '#333333',
        position: 'bottom-right'
    },
    
    // Configuration API (ajustez selon votre environnement)
    apiUrl: 'http://localhost:3000/api',
    
    // Options avancées
    options: {
        autoOpen: false,
        showPoweredBy: true,
        enableSounds: true,
        enableTyping: true,
        debugMode: true,
        maxMessages: 100,
        rateLimiting: {
            enabled: true,
            messagesPerMinute: 15
        },
        ui: {
            borderRadius: '16px',
            shadows: true,
            animations: true,
            mobileFullScreen: false
        }
    },
    
    // Callbacks pour les tests
    callbacks: {
        onInit: () => {
            console.log('🚀 Widget initialisé !');
            updateWidgetStatus('online', 'Widget chargé et prêt');
            displayConfig();
        },
        onOpen: () => {
            console.log('💬 Chat ouvert');
        },
        onClose: () => {
            console.log('❌ Chat fermé');
        },
        onMessage: (data) => {
            console.log('📤 Message envoyé:', data.message);
        },
        onResponse: (data) => {
            console.log('📨 Réponse reçue:', data.response);
        },
        onDestroy: () => {
            console.log('🗑️ Widget détruit');
        }
    }
};

// Fonctions de contrôle du widget
function openWidget() {
    if (window.ChatBotWidget) {
        window.ChatBotWidget.open();
    } else {
        alert('Le widget n\'est pas encore chargé. Patientez quelques secondes.');
    }
}

function closeWidget() {
    if (window.ChatBotWidget) {
        window.ChatBotWidget.close();
    }
}

function sendTestMessage() {
    if (window.ChatBotWidget) {
        const testMessages = [
            'Bonjour ! Pouvez-vous m\'aider ?',
            'Quels sont vos services ?',
            'Comment puis-je vous contacter ?',
            'Avez-vous des tarifs préférentiels ?',
            'Comment fonctionne votre chatbot ?'
        ];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        window.ChatBotWidget.sendMessage(randomMessage);
        window.ChatBotWidget.open();
    }
}

function clearMessages() {
    if (window.ChatBotWidget) {
        window.ChatBotWidget.clearMessages();
    }
}

function showStats() {
    if (window.ChatBotWidget) {
        const stats = window.ChatBotWidget.getStats();
        alert(`📊 Statistiques du Widget:\n\n` +
              `Session ID: ${stats.sessionId}\n` +
              `Messages: ${stats.messageCount}\n` +
              `Durée conversation: ${Math.round(stats.conversationDuration / 1000)}s\n` +
              `Statut: ${stats.isOpen ? 'Ouvert' : 'Fermé'}\n` +
              `Tenant ID: ${stats.tenantId}`);
    }
}

function updateWidgetStatus(status, message) {
    const statusElement = document.getElementById('widget-status');
    if (statusElement) {
        statusElement.className = `status ${status}`;
        statusElement.querySelector('span').textContent = message;
    }
}

function displayConfig() {
    const configElement = document.getElementById('config-content');
    if (configElement) {
        const config = { ...window.ChatBotConfig };
        
        // Masquer les callbacks pour l'affichage
        if (config.callbacks) {
            config.callbacks = Object.keys(config.callbacks).map(key => `${key}: function()`);
        }
        
        configElement.innerHTML = JSON.stringify(config, null, 2);
    }
}

// Exposer les fonctions globalement pour les onclick dans le HTML
window.openWidget = openWidget;
window.closeWidget = closeWidget;
window.sendTestMessage = sendTestMessage;
window.clearMessages = clearMessages;
window.showStats = showStats;

// Gestion des erreurs
window.addEventListener('error', (e) => {
    console.error('❌ Erreur JavaScript:', e.error);
    updateWidgetStatus('offline', 'Erreur lors du chargement');
});

// Tests automatiques
setTimeout(() => {
    if (!window.ChatBotWidget) {
        updateWidgetStatus('offline', 'Échec du chargement du widget');
        console.error('❌ Le widget n\'a pas pu se charger. Vérifiez la console pour plus de détails.');
    }
}, 5000);

// Raccourcis clavier pour les tests
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'k':
                e.preventDefault();
                openWidget();
                break;
            case 'm':
                e.preventDefault();
                sendTestMessage();
                break;
        }
    }
});

// Fallback si le serveur local n'est pas disponible
setTimeout(() => {
    if (!window.ChatBotWidget) {
        console.warn('⚠️ Impossible de charger depuis le serveur local, tentative avec le build local...');
        const fallbackScript = document.createElement('script');
        fallbackScript.src = './widget.js';
        fallbackScript.async = true;
        document.head.appendChild(fallbackScript);
    }
}, 3000);
