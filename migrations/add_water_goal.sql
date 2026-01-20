-- Migration: Add waterGoal to user_profiles table
-- Run this migration to add the waterGoal column

ALTER TABLE "user_profiles" 
ADD COLUMN IF NOT EXISTS "waterGoal" INTEGER DEFAULT 8;

-- Update existing records to have default value of 8
UPDATE "user_profiles" 
SET "waterGoal" = 8 
WHERE "waterGoal" IS NULL;

-- Add constraint to ensure minimum value of 8
ALTER TABLE "user_profiles"
ADD CONSTRAINT "water_goal_minimum" CHECK ("waterGoal" >= 8);
