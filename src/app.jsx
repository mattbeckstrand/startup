import React from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import './input.css';
import { SignIn } from './signin/signin';
import { Dms } from './dms/dms';
import { Profile } from './profile/profile';
import { Samples } from './samples/samples';
import { Home } from './home/home';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ background: 'rgb(48, 46, 46)' }}>
        <header>
          <h1 className="text-4xl p-4">Snare Music</h1>
          <nav className="flex items-center justify-between p-4">
            <div className="flex space-x-6">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/samples">Samples</NavLink>
              <NavLink to="/dms">Messages</NavLink>
            </div>
            <div className="flex space-x-6">
              <NavLink to="/signin">Sign In</NavLink>
              <NavLink to="/profile">
                <img src="/Images/IMG_2769.jpg" alt="Profile" width="40" height="40" className="rounded-full" />
              </NavLink>
            </div>
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