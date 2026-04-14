-- Migration 010: AI Image Generation Support
-- Adds image generation fields to prompt templates and jobs

-- Prompt templates: image settings
ALTER TABLE ai_prompts ADD COLUMN image_enabled INTEGER DEFAULT 0;
ALTER TABLE ai_prompts ADD COLUMN image_model TEXT;
ALTER TABLE ai_prompts ADD COLUMN image_style TEXT DEFAULT 'photographic';
ALTER TABLE ai_prompts ADD COLUMN image_count INTEGER DEFAULT 0;
ALTER TABLE ai_prompts ADD COLUMN image_layout TEXT;

-- Jobs: image tracking
ALTER TABLE ai_jobs ADD COLUMN image_enabled INTEGER DEFAULT 0;
ALTER TABLE ai_jobs ADD COLUMN image_model TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_style TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_count INTEGER DEFAULT 0;
ALTER TABLE ai_jobs ADD COLUMN image_layout TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_status TEXT DEFAULT 'pending';
ALTER TABLE ai_jobs ADD COLUMN image_urls TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_prompts TEXT;
