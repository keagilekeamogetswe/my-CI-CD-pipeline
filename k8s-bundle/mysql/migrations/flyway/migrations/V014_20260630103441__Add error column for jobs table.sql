-- Migration: Add error column to jobs table
ALTER TABLE jobs
ADD COLUMN error TEXT NULL AFTER attempts;
