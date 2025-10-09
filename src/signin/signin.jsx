import React from 'react';

export function SignIn() {
  return (
    <main class="p-4">
        <h2 class="text-2xl mb-4">Sign In</h2>
        <form>
            <div class="mb-4">
                <label class="block mb-1">Username</label>
                <input type="text" name="username" placeholder="Enter username" class="w-64 p-2 rounded"/>
            </div>
            <div class="mb-4">
                <label class="block mb-1">Password</label>
                <input type="password" name="password" placeholder="Enter password" class="w-64 p-2 rounded"/>
            </div>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">Sign In</button>
        </form>
    </main>
  );
}

