/**
 * session-check.js
 * Verifica se o usuário possui sessão ativa nativa antes de acessar as páginas internas.
 */
(function () {
    const rawSession = localStorage.getItem('acai_current_session');
    if (rawSession) {
        try {
            const session = JSON.parse(rawSession);
            if (session && session.id) {
                return; // Sessão válida
            }
        } catch (error) {
            // Se houver erro de parse, cai para inicialização padrão abaixo
        }
    }

    // Sessão padrão de administrador local
    const defaultSession = {
        id: 'admin-local',
        name: 'Administrador',
        email: 'admin@acaiprime.com',
        provider: 'local',
        loginAt: new Date().toISOString()
    };
    localStorage.setItem('acai_current_session', JSON.stringify(defaultSession));
})();

