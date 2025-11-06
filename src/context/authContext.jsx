import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        if (savedToken) {
            setToken(savedToken);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await fetch('http://localhost:4000/api/auth/login', {
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
        const response = await fetch('http://localhost:4000/api/auth/signup', {
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

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    const value = {
        user,
        token,
        isAuthenticated: !!user,
        loading, 
        login,
        signup,
        logout
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
