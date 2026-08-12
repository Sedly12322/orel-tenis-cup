import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ckkmvxfyiwrcqalygfvn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNra212eGZ5aXdyY3FhbHlnZnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDkxODMsImV4cCI6MjEwMjEyNTE4M30.VsWCf7R3dm5ILG5RaMJmKWYoHc9HeLTVp1pT8dJvC5w'

export const supabase = createClient(supabaseUrl, supabaseKey)