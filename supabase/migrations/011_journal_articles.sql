-- Phase 14: Safari Journal
-- Additive migration: journal_articles table.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- JOURNAL_ARTICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'safari-stories', 'destinations', 'wildlife',
      'travel-tips', 'safari-guides', 'conservation'
    )),
  author VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title VARCHAR(255),
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_articles_slug
  ON journal_articles (slug);

CREATE INDEX IF NOT EXISTS idx_journal_articles_status
  ON journal_articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_articles_category
  ON journal_articles (category, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_articles_featured
  ON journal_articles (featured)
  WHERE featured = TRUE;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE TRIGGER update_journal_articles_updated_at
  BEFORE UPDATE ON journal_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE journal_articles ENABLE ROW LEVEL SECURITY;

-- Public can view published articles only
CREATE POLICY "Public can view published journal articles"
  ON journal_articles FOR SELECT
  USING (status = 'published');

-- Admins can view all articles
CREATE POLICY "Admins can view all journal articles"
  ON journal_articles FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage all articles
CREATE POLICY "Admins can manage journal articles"
  ON journal_articles FOR ALL
  USING (public.is_active_admin(auth.uid()));
