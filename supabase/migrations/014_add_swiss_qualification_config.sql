-- Migration: Add wins_to_qualify and losses_to_eliminate to Swiss tournament configuration
-- This migration adds qualification criteria to existing Swiss stages with default values

-- Update existing Swiss stages to include qualification criteria
UPDATE stages
SET settings = jsonb_set(
  jsonb_set(
    settings,
    '{swiss_config,wins_to_qualify}',
    '3'::jsonb
  ),
  '{swiss_config,losses_to_eliminate}',
  '3'::jsonb
)
WHERE type = 'swiss'
  AND settings->'swiss_config' IS NOT NULL
  AND settings->'swiss_config'->'wins_to_qualify' IS NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN stages.settings IS
  'Stage-specific settings including swiss_config with wins_to_qualify and losses_to_eliminate for Swiss tournaments';
