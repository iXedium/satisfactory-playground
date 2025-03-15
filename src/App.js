import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import DependencyTester from "./components/DependencyTester";
import "./App.css";
import { populateDexie } from "./data/dexieInit";
import { injectThemeVariables } from './styles/theme';
const App = () => {
    const [dbStatus, setDbStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState(null);
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Inject theme variables
                injectThemeVariables();
                // Initialize database
                console.log("Initializing database...");
                await populateDexie();
                console.log("Database initialization complete");
                setDbStatus('ready');
            }
            catch (error) {
                console.error("Failed to initialize application:", error);
                setDbStatus('error');
                setErrorMessage(error instanceof Error ? error.message : "Unknown error initializing the application");
            }
        };
        initializeApp();
    }, []);
    // Loading state
    if (dbStatus === 'loading') {
        return (_jsxs("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '16px',
                color: '#f5f5f5',
                background: '#1e1e1e'
            }, children: [_jsx("div", { style: { fontSize: '24px', fontWeight: 'bold' }, children: "Loading Satisfactory Calculator" }), _jsx("div", { style: { fontSize: '16px' }, children: "Initializing database..." })] }));
    }
    // Error state
    if (dbStatus === 'error') {
        return (_jsxs("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '16px',
                color: '#f5f5f5',
                background: '#1e1e1e'
            }, children: [_jsx("div", { style: { fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }, children: "Error Loading Application" }), _jsx("div", { style: { fontSize: '16px', maxWidth: '600px', textAlign: 'center' }, children: errorMessage || "There was a problem initializing the application." }), _jsx("button", { onClick: () => window.location.reload(), style: {
                        padding: '8px 16px',
                        background: '#ff9f43',
                        color: '#1e1e1e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '16px',
                        fontWeight: 'bold'
                    }, children: "Reload Application" })] }));
    }
    // Ready state - render the main application
    return (_jsx("div", { children: _jsx(DependencyTester, {}) }));
};
export default App;
