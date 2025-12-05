// API Service with authentication interceptor

const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  // Handle 401 - clear auth and redirect to login
  handleUnauthorized() {
    this.token = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/signin';
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired or invalid - redirect to login
        this.handleUnauthorized();
        throw new Error('Unauthorized');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();

// Convenience exports for common operations
export const reviewsApi = {
  getAll: (offset = 0, limit = 20) => 
    api.get(`/reviews?offset=${offset}&limit=${limit}`),
  
  getFollowing: (offset = 0, limit = 20) => 
    api.get(`/reviews/following?offset=${offset}&limit=${limit}`),
  
  getMy: () => api.get('/reviews/my'),
  
  getById: (id) => api.get(`/reviews/${id}`),
  
  getByUser: (userId, offset = 0, limit = 20) => 
    api.get(`/reviews/user/${userId}?offset=${offset}&limit=${limit}`),
  
  create: (data) => api.post('/reviews', data),
  
  update: (id, data) => api.put(`/reviews/${id}`, data),
  
  delete: (id) => api.delete(`/reviews/${id}`),
};

export const likesApi = {
  likeReview: (reviewId) => api.post(`/likes/review/${reviewId}`),
  unlikeReview: (reviewId) => api.delete(`/likes/review/${reviewId}`),
  checkReviewLike: (reviewId) => api.get(`/likes/review/${reviewId}`),
  
  likeDiscovery: (discoveryId) => api.post(`/likes/discovery/${discoveryId}`),
  unlikeDiscovery: (discoveryId) => api.delete(`/likes/discovery/${discoveryId}`),
  
  likeComment: (commentId, type = 'review') => 
    api.post(`/likes/comment/${commentId}`, { type }),
  unlikeComment: (commentId) => api.delete(`/likes/comment/${commentId}`),
};

export const commentsApi = {
  getForReview: (reviewId) => api.get(`/comments/review/${reviewId}`),
  addToReview: (reviewId, content, parentId = null) => 
    api.post(`/comments/review/${reviewId}`, { content, parent_id: parentId }),
  getReviewCommentCount: (reviewId) => api.get(`/comments/review/${reviewId}/count`),
  
  getForDiscovery: (discoveryId) => api.get(`/comments/discovery/${discoveryId}`),
  addToDiscovery: (discoveryId, content, parentId = null) => 
    api.post(`/comments/discovery/${discoveryId}`, { content, parent_id: parentId }),
  getDiscoveryCommentCount: (discoveryId) => api.get(`/comments/discovery/${discoveryId}/count`),
  
  update: (commentId, content, type = 'review') => 
    api.put(`/comments/${commentId}`, { content, type }),
  
  delete: (commentId, type = 'review') => 
    api.delete(`/comments/${commentId}?type=${type}`),
  
  getReplyCount: (commentId, type = 'review') => 
    api.get(`/comments/${commentId}/reply-count?type=${type}`),
  
  getUserComments: (userId, limit = 20, offset = 0) => 
    api.get(`/comments/user/${userId}?limit=${limit}&offset=${offset}`),
  getUserCommentCount: (userId) => api.get(`/comments/user/${userId}/count`),
};

export const repostsApi = {
  create: (contentType, contentId) => 
    api.post('/reposts', { content_type: contentType, content_id: contentId }),
  
  delete: (contentType, contentId) => 
    api.delete(`/reposts/${contentType}/${contentId}`),
  
  check: (contentType, contentId) => 
    api.get(`/reposts/check/${contentType}/${contentId}`),
};

export const relationshipsApi = {
  follow: (userId) => api.post(`/relationships/follow/${userId}`),
  unfollow: (userId) => api.delete(`/relationships/follow/${userId}`),
  getStatus: (userId) => api.get(`/relationships/status/${userId}`),
  getPending: () => api.get('/relationships/pending'),
  accept: (followerId) => api.post(`/relationships/accept/${followerId}`),
  decline: (followerId) => api.post(`/relationships/decline/${followerId}`),
  getFollowers: (userId, offset = 0, limit = 50) => 
    api.get(`/relationships/followers/${userId}?offset=${offset}&limit=${limit}`),
  getFollowing: (userId, offset = 0, limit = 50) => 
    api.get(`/relationships/following/${userId}?offset=${offset}&limit=${limit}`),
};

export const profilesApi = {
  getMe: () => api.get('/profiles/me'),
  updateMe: (data) => api.put('/profiles/me', data),
  getById: (userId) => api.get(`/profiles/${userId}`),
  getByUsername: (username) => api.get(`/profiles/username/${username}`),
  search: (query, limit = 20) => 
    api.get(`/profiles/search/users?q=${encodeURIComponent(query)}&limit=${limit}`),
  getFollowCounts: () => api.get('/profiles/follow-counts'),
};

export const notificationsApi = {
  getAll: (offset = 0, limit = 50) => 
    api.get(`/notifications?offset=${offset}&limit=${limit}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
};

export const messagesApi = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (participantId) => 
    api.post('/messages/conversations', { participant_id: participantId }),
  getMessages: (conversationId, limit = 50, before = null) => {
    let url = `/messages/conversations/${conversationId}?limit=${limit}`;
    if (before) url += `&before=${before}`;
    return api.get(url);
  },
  sendMessage: (conversationId, content, messageType = 'text', attachment = null) =>
    api.post(`/messages/conversations/${conversationId}`, { content, message_type: messageType, attachment }),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

export const songsApi = {
  search: (query, limit = 20) => 
    api.get(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  getById: (songId) => api.get(`/songs/${songId}`),
  getBySpotifyId: (spotifyId) => api.get(`/songs/spotify/${spotifyId}`),
  create: (data) => api.post('/songs', data),
};

export const albumsApi = {
  search: (query, limit = 20) => 
    api.get(`/albums/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  getById: (albumId) => api.get(`/albums/${albumId}`),
  getBySpotifyId: (spotifyId) => api.get(`/albums/spotify/${spotifyId}`),
  getNewReleases: (limit = 20) => api.get(`/albums/new-releases?limit=${limit}`),
  getPopular: (limit = 10) => api.get(`/albums/popular?limit=${limit}`),
};
