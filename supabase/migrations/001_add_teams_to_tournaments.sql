-- Migration: Add teams and home_and_away to tournaments
-- Run this in Supabase SQL Editor

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS teams JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS home_and_away BOOLEAN NOT NULL DEFAULT true;

-- Update existing tournaments to have empty teams array
UPDATE tournaments SET teams = '[]' WHERE teams IS NULL;
