-- Snare Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  theme_preference TEXT DEFAULT 'dark',
  notification_settings JSONB DEFAULT '{"push_notifications_enabled": true, "likes": true, "comments": true, "messages": true, "follows": true, "reposts": true, "mentions": true}'::jsonb,
  privacy_settings JSONB DEFAULT '{"is_private_account": false, "show_stats": true, "show_favorites": true, "allow_messages_from_everyone": true}'::jsonb,
  website_links TEXT[],
  onboarding_completed BOOLEAN DEFAULT false,
  first_review_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tastemaker BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  primary_music_platform TEXT DEFAULT 'spotify'
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1)),
    SPLIT_PART(NEW.email, '@', 1),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SONGS
-- ============================================
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  album_art_url TEXT,
  duration FLOAT,
  genre TEXT,
  release_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  spotify_id TEXT UNIQUE,
  apple_music_id TEXT,
  preview_url TEXT,
  external_urls JSONB DEFAULT '{}'::jsonb,
  isrc TEXT,
  artist_ids TEXT[],
  artist_names TEXT[],
  is_explicit BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_songs_title_artist ON songs(title, artist);

-- ============================================
-- ALBUMS
-- ============================================
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork_url TEXT,
  release_date TIMESTAMP WITH TIME ZONE,
  total_tracks INT,
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  apple_music_id TEXT,
  spotify_id TEXT UNIQUE,
  preview_url TEXT,
  external_urls JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_albums_spotify_id ON albums(spotify_id);

-- ============================================
-- REVIEWS (unified for songs, albums, artists)
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('song', 'album', 'artist')),
  item_id TEXT NOT NULL,
  song_id UUID REFERENCES songs(id),
  album_id UUID REFERENCES albums(id),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  item_metadata JSONB DEFAULT '{}'::jsonb,
  title TEXT,
  artist TEXT,
  album TEXT,
  album_art_url TEXT,
  review TEXT,
  rating FLOAT CHECK (rating >= 0.5 AND rating <= 5.0),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================
-- DISCOVERIES (quick shares without full reviews)
-- ============================================
CREATE TABLE IF NOT EXISTS discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('song', 'album')),
  item_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discoveries_user_id ON discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_created_at ON discoveries(created_at DESC);

-- ============================================
-- USER RELATIONSHIPS (follow system)
-- ============================================
CREATE TABLE IF NOT EXISTS user_relationships (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'following' CHECK (status IN ('following', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_follower ON user_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_relationships_following ON user_relationships(following_id);

-- ============================================
-- REVIEW COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID REFERENCES review_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_comments_review ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_author ON review_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_parent ON review_comments(parent_id);

-- ============================================
-- DISCOVERY COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS discovery_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id UUID NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID REFERENCES discovery_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discovery_comments_discovery ON discovery_comments(discovery_id);

-- ============================================
-- REVIEW LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user ON review_likes(user_id);

-- ============================================
-- DISCOVERY LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS discovery_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discovery_id UUID NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, discovery_id)
);

-- ============================================
-- COMMENT LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('review', 'discovery')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- ============================================
-- REPOSTS
-- ============================================
CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('review', 'discovery')),
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_content ON reposts(content_type, content_id);

-- ============================================
-- BLOCKED USERS
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ============================================
-- BLOCKED SONGS
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- ============================================
-- CONVERSATIONS (DM threads)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);

-- ============================================
-- DIRECT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'song', 'review', 'album', 'artist')),
  attachment JSONB DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON direct_messages(timestamp DESC);

-- ============================================
-- MENTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('review_comment', 'discovery_comment')),
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned ON mentions(mentioned_user_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'follow_request', 'message', 'repost', 'mention')),
  title TEXT,
  message TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_username TEXT,
  actor_avatar_url TEXT,
  content_id UUID,
  content_type TEXT,
  content_title TEXT,
  is_read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- MUSIC PLATFORMS (user connections)
-- ============================================
CREATE TABLE IF NOT EXISTS music_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL CHECK (platform_name IN ('spotify', 'apple_music')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_name)
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get follow counts for a user
CREATE OR REPLACE FUNCTION get_follow_counts(p_user_id UUID)
RETURNS TABLE (followers_count BIGINT, following_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM user_relationships WHERE following_id = p_user_id AND status = 'following') as followers_count,
    (SELECT COUNT(*) FROM user_relationships WHERE follower_id = p_user_id AND status = 'following') as following_count;
END;
$$ LANGUAGE plpgsql;

-- Get like count for a review
CREATE OR REPLACE FUNCTION get_review_like_count(p_review_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM review_likes WHERE review_id = p_review_id);
END;
$$ LANGUAGE plpgsql;

-- Get comment count for a review
CREATE OR REPLACE FUNCTION get_review_comment_count(p_review_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM review_comments WHERE review_id = p_review_id);
END;
$$ LANGUAGE plpgsql;

-- Get repost count for content
CREATE OR REPLACE FUNCTION get_repost_count(p_content_type TEXT, p_content_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM reposts WHERE content_type = p_content_type AND content_id = p_content_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own write
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Reviews: Public read, own write
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Discoveries viewable by all" ON discoveries FOR SELECT USING (true);
CREATE POLICY "Users can insert own discoveries" ON discoveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own discoveries" ON discoveries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable by all" ON review_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON review_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own comments" ON review_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON review_comments FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Likes viewable by all" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON review_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Reposts viewable by all" ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can insert own reposts" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reposts" ON reposts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Relationships viewable by all" ON user_relationships FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON user_relationships FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON user_relationships FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users can update relationship" ON user_relationships FOR UPDATE USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users see own conversations" ON conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users see messages in their conversations" ON direct_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids)));
CREATE POLICY "Users can send messages" ON direct_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark messages read" ON direct_messages FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids)));

