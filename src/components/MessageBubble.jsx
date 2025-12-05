import React from 'react';
import { Link } from 'react-router-dom';
import { SongCardCompact } from './SongCard';
import { AlbumCardHorizontal } from './AlbumCard';

export function MessageBubble({ message, isSent }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAttachment = () => {
    if (!message.attachment) return null;

    switch (message.message_type) {
      case 'song':
        return (
          <div className="mt-2 bg-gray-700/50 rounded-lg overflow-hidden">
            <SongCardCompact 
              song={message.attachment.song || message.attachment}
              showRating={false}
            />
          </div>
        );
      
      case 'album':
        return (
          <div className="mt-2 bg-gray-700/50 rounded-lg overflow-hidden">
            <AlbumCardHorizontal album={message.attachment.album || message.attachment} />
          </div>
        );
      
      case 'review':
        const review = message.attachment.review || message.attachment;
        return (
          <Link 
            to={`/review/${review.id}`}
            className="block mt-2 bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors"
          >
            <div className="flex gap-2">
              <img 
                src={review.album_art_url || '/Images/ProfilePlaceholder.jpg'}
                alt=""
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{review.title}</p>
                <p className="text-xs text-gray-400 truncate">{review.artist}</p>
                {review.rating && (
                  <span className="text-amber-400 text-xs">
                    {'★'.repeat(Math.floor(review.rating))}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isSent ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div 
          className={`rounded-2xl px-4 py-2 ${
            isSent 
              ? 'bg-blue-600 text-white rounded-br-sm' 
              : 'bg-gray-700 text-white rounded-bl-sm'
          }`}
        >
          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          {/* Attachment */}
          {renderAttachment()}
        </div>

        {/* Timestamp + read status */}
        <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          {isSent && (
            <span className="text-xs text-gray-500">
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Typing indicator
export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

