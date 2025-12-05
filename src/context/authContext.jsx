import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');
            
            // If we have both user and token, validate the token
            if (savedUser && savedToken) {
                try {
                    // Validate token by making a simple authenticated request
                    const response = await fetch('/api/profiles/me', {
                        headers: {
                            'Authorization': `Bearer ${savedToken}`
                        }
                    });
                    
                    if (response.status === 401) {
                        // Token is invalid/expired - clear everything
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        setUser(null);
                        setToken(null);
                    } else if (response.ok) {
                        // Token is valid - restore state
                        setUser(JSON.parse(savedUser));
                        setToken(savedToken);
                    } else {
                        // Other error (e.g., 500) - restore state anyway
                        // Token validation will happen on next API call
                        setUser(JSON.parse(savedUser));
                        setToken(savedToken);
                    }
                } catch (error) {
                    // Network error - restore state anyway since it might be temporary
                    // Token validation will happen on next API call
                    console.warn('Could not validate token on load (network error):', error);
                    setUser(JSON.parse(savedUser));
                    setToken(savedToken);
                }
            }
            
            setLoading(false);
        };
        
        initializeAuth();
    }, []);

    const login = async (email, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        const authToken = data.session?.access_token;
        if (authToken) {
            setToken(authToken);
            localStorage.setItem('token', authToken);
        }
        
        return data.user;
    }

    const signup = async (email, password) => {
        const response = await fetch('/api/auth/signup', {
            method:'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({email, password})
        })

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "sign in didnt work")
        }
        
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Extract token from session
        const authToken = data.session?.access_token;
        if (authToken) {
            setToken(authToken);
            localStorage.setItem('token', authToken);
        }
        
        return data.user;
    }

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }, []);

    // Handle unauthorized responses - call this when you get a 401
    const handleUnauthorized = useCallback(() => {
        logout();
        // Redirect to signin page
        window.location.href = '/signin';
    }, [logout]);

    const value = {
        user,
        token,
        isAuthenticated: !!user,
        loading, 
        login,
        signup,
        logout,
        handleUnauthorized
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an auth provider')
    }
    return context;
}
