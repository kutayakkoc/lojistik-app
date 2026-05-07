-- Adds weight and pickup time range fields to jobs table.
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS pickup_time_start time,
  ADD COLUMN IF NOT EXISTS pickup_time_end time;
