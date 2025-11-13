import React, { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import './input.css';
import { SignIn } from './pages/signin';
import { Dms } from './pages/dms';
import { Profile } from './pages/profile';
import { Samples } from './pages/samples';
import { Home } from './pages/home';
import { useAuth } from './context/authContext';
import { useProfile } from './context/profileContext';

export default function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { profile, profileLoading } = useProfile();

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col text-white" style={{ background: 'rgb(48, 46, 46)' }}>
        <div className="w-full max-w-6xl mx-auto">
        <header>
         
          <nav className="flex items-baseline justify-center gap-6 p-4">
              <NavLink to="/" className="text-3xl p-1">Snare</NavLink>
              {isAuthenticated ? (
                <>
                  <NavLink to="/samples">Samples</NavLink>
                  <NavLink to="/dms">Messages</NavLink>
                  <NavLink to="/profile">
                    Profile
                  </NavLink>
                  <button onClick={logout}>Logout</button>
                </>
              ) : (
                <>
                <NavLink to="/signin">Sign In</NavLink>
                <NavLink to="/signin">Create Account</NavLink>
                </>
              )}
          </nav>
        </header>
        <hr />

        <Routes>
          <Route path="/" element={<Home />} exact />
          <Route path="/samples" element={<Samples />} />
          <Route path="/dms" element={<Dms />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        <footer className="bg-gray-100 text-gray-600 mt-auto">
          <hr />
          <div className="p-4">
            <h2 className="text-2xl font-bold text-gray-600">Matt Beckstrand</h2>
            <a href="https://github.com/mattbeckstrand/startup" className="hover:text-blue-700">Github</a>
          </div>
        </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <main className="w-full text-center p-8">
      404: Return to sender. Address unknown.
    </main>
  );
}