import React, { createContext, useState, useEffect, useContext } from 'react';
import { checkAuth } from '../services/openalgo';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, false = not auth, true = auth
    const [user, setUser] = useState(null); // Placeholder for user details

    // Connection Settings (Persisted)
    const [apiKey, setApiKey] = useState(() => {
        try { return localStorage.getItem('oa_apikey') || ''; } catch { return ''; }
    });
    const [websocketUrl, setWebsocketUrl] = useState(() => {
        try { return localStorage.getItem('oa_ws_url') || '127.0.0.1:8765'; } catch { return '127.0.0.1:8765'; }
    });
    const [hostUrl, setHostUrl] = useState(() => {
        try { return localStorage.getItem('oa_host_url') || 'http://127.0.0.1:5000'; } catch { return 'http://127.0.0.1:5000'; }
    });
    const [openalgoUsername, setOpenalgoUsername] = useState(() => {
        try { return localStorage.getItem('oa_username') || ''; } catch { return ''; }
    });

    // Persist settings when changed
    useEffect(() => { localStorage.setItem('oa_apikey', apiKey); }, [apiKey]);
    useEffect(() => { localStorage.setItem('oa_ws_url', websocketUrl); }, [websocketUrl]);
    useEffect(() => { localStorage.setItem('oa_host_url', hostUrl); }, [hostUrl]);
    useEffect(() => { localStorage.setItem('oa_username', openalgoUsername); }, [openalgoUsername]);

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const isAuth = await checkAuth();
                setIsAuthenticated(isAuth);
            } catch (error) {
                console.error("Auth check failed:", error);
                setIsAuthenticated(false);
            }
        };
        verifyAuth();
    }, []);

    const value = {
        isAuthenticated, setIsAuthenticated,
        user, setUser,
        apiKey, setApiKey,
        websocketUrl, setWebsocketUrl,
        hostUrl, setHostUrl,
        openalgoUsername, setOpenalgoUsername
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
