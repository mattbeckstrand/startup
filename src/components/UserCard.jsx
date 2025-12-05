import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export function UserCard({ 
  user, 
  showBio = false,
  showFollowButton = true,
  initialFollowing = false,
  onFollowChange
}) {
  const { user: currentUser, token, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const isSelf = currentUser?.id === user.id;

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated || isSelf) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        const response = await fetch(`/api/relationships/follow/${user.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setIsFollowing(false);
          onFollowChange?.(user.id, false);
        }
      } else {
        const response = await fetch(`/api/relationships/follow/${user.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.status === 'following' || data.status === 'pending');
          onFollowChange?.(user.id, true, data.status);
        }
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link 
      to={`/profile/${user.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors"
    >
      {/* Avatar */}
      <img 
        src={user.avatar_url || '/Images/ProfilePlaceholder.jpg'}
        alt={user.display_name}
        className="w-12 h-12 rounded-full object-cover"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate">{user.display_name || user.username}</h4>
        <p className="text-gray-400 text-sm truncate">@{user.username}</p>
        {showBio && user.bio && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{user.bio}</p>
        )}
      </div>

      {/* Follow button */}
      {showFollowButton && isAuthenticated && !isSelf && (
        <button
          onClick={handleFollow}
          disabled={isLoading}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isFollowing
              ? 'bg-gray-700 hover:bg-red-600 hover:text-white text-gray-300'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </Link>
  );
}

// Compact user card for mentions/autocomplete
export function UserCardCompact({ user, onClick }) {
  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
      onClick={() => onClick?.(user)}
    >
      <img 
        src={user.avatar_url || '/Images/ProfilePlaceholder.jpg'}
        alt={user.display_name}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.display_name || user.username}</p>
        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
      </div>
    </div>
  );
}

