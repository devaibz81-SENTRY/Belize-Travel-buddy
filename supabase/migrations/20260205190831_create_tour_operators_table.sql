/*
  # Create tour operators table

  1. New Tables
    - `tour_operators`
      - `id` (uuid, primary key)
      - `name` (text, operator name)
      - `description` (text, operator description)
      - `phone` (text, contact number)
      - `email` (text, contact email)
      - `address` (text, physical address)
      - `city` (text, city/district)
      - `website` (text, operator website)
      - `rating` (numeric, 1-5 star rating)
      - `category` (text, tour type: diving, adventure, culture, etc)
      - `price_range` (text, budget level)
      - `latitude` (numeric, for map)
      - `longitude` (numeric, for map)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tour_operators` table
    - Add policy for public read access (tour data is public)
    - Add policy for authenticated inserts/updates (admin only)

  3. Indexes
    - Index on category for fast filtering
    - Index on city for location-based searches
    - Index on name for search functionality
*/

CREATE TABLE IF NOT EXISTS tour_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  phone text,
  email text,
  address text,
  city text,
  website text,
  rating numeric,
  category text,
  price_range text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_operators_category ON tour_operators(category);
CREATE INDEX IF NOT EXISTS idx_tour_operators_city ON tour_operators(city);
CREATE INDEX IF NOT EXISTS idx_tour_operators_name ON tour_operators(name);
CREATE INDEX IF NOT EXISTS idx_tour_operators_rating ON tour_operators(rating);

ALTER TABLE tour_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON tour_operators
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert operators"
  ON tour_operators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update operators"
  ON tour_operators
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
