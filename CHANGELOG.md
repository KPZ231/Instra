# Changelog

All notable changes to Instra are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

#### Posts System (2026-06-18)
- Core social feed feature with post creation, editing, and deletion
- Image carousel support (up to 10 images per post, 5 MB max per file)
- Like/unlike functionality with like counts
- Cursor-based pagination for efficient feed loading
- Server-side caching via Redis with 300s TTL for feed and profile queries
- Rate limiting: 10 posts/hour per user, 60 likes/minute per user
- Supabase Storage integration for media file management
- Public global feed at `/feed` (ISR, 60s revalidate)
- Public user profiles at `/profile/{username}` with user-specific posts
- Authenticated dashboard at `/dashboard` with inline post composer
- Full-page post creation at `/dashboard/posts/new`
- Post editing at `/dashboard/posts/{id}/edit` (author/ADMIN only)
- Complete UI component set: PostComposer, PostCard, PostFeed, MediaCarousel, MediaUploadPreview
- Zod validation schemas with MAX_POST_LENGTH (2,200 chars) and MAX_POST_MEDIA (10 items)
- i18n support in English and Polish (posts translation keys)
- Database models: Post, Media, Like with cascade delete relations
- Server Actions for mutations: createPost, updatePost, deletePost, toggleLike, loadMorePosts
- Full documentation in `docs/posts.md`, `docs/storage.md`, `docs/database.md`

---

## [1.0.0] - Initial Release

### Added
- User authentication (sign up, login, email verification)
- Plugin system (load, register, unload plugins)
- Plugin marketplace with version management and auditing
- Dashboard with widget slots for plugins
- Settings pages for user profile and plugin management
