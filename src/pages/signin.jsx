import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';


export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async(e) => {
    e.preventDefault();
    try {
      const data = await login(email, password)
      navigate('/')
    } catch (error) {
      alert(error.message)
    }
    console.log(data);
  }
  
  return (
    <main class="p-4">
        <h2 class="text-2xl mb-4">Sign In</h2>
        <form onSubmit={handleSubmit}>
            <div class="mb-4">
                <label class="block mb-1">Email</label>
                <input 
                type="email" 
                value={email} 
                placeholder="Enter Email" 
                onChange={(e) => setEmail(e.target.value)}
                class="w-64 p-2 rounded"/>
            </div>
            <div class="mb-4">
                <label class="block mb-1">Password</label>
                <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class="w-64 p-2 rounded"/>
            </div>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
              Sign In
            </button>
        </form>
    </main>
  );
}

