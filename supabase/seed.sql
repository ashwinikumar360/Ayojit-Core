-- ============================================================
-- Ayojit Intelligence — Seed Data
-- Run after schema.sql to populate initial reference data
-- ============================================================

-- System status entries (one per app)
INSERT INTO public.system_status (app_id, status, message) VALUES
  ('kisan-voice-ai', 'operational', 'All systems running normally'),
  ('pinai', 'operational', 'All systems running normally'),
  ('docpatram', 'operational', 'All systems running normally'),
  ('vaadvivaad', 'operational', 'All systems running normally'),
  ('hindidiff', 'operational', 'All systems running normally');

-- Initial changelog entries
INSERT INTO public.changelog_entries (version, title, description, category, published, published_at) VALUES
  ('0.1.0', 'Initial Release', 'First production release of the Ayojit Intelligence 5-app suite. Includes Kisan Voice AI, PinAI, DocPatram, VaadVivaad, and HindiDiff with Supabase auth, Dodo Payments billing, and daily quota enforcement.', 'feature', true, '2026-06-14T00:00:00Z'),
  ('0.2.0', 'SaaS Upgrade', 'Commercial landing page, admin panel, public API v1, self-hosting support, onboarding wizard, referral system, i18n (English + Hindi), status page, changelog, PDF export, email notifications, and embeddable widgets.', 'feature', true, '2026-06-16T00:00:00Z');

-- Asset registry seed data (matches dashboard display)
INSERT INTO public.asset_registry (id, name, source_url, version_tag, license_type, commercial_use, attribution_requirement) VALUES
  ('sentence-transformers/all-MiniLM-L6-v2', 'MiniLM Embeddings', 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2', '1110a243fdf4706b', 'Apache-2.0', true, false),
  ('ai4bharat/indic-parler-tts', 'Indic Parler TTS', 'https://huggingface.co/ai4bharat/indic-parler-tts', 'main', 'Apache-2.0', true, false),
  ('IndicTrans2', 'IndicTrans2 Translation', 'https://github.com/AI4Bharat/IndicTrans2', 'main', 'MIT', true, false),
  ('data.gov.in/pincode', 'India Pincode Registry', 'https://data.gov.in', '2026-06-snapshot', 'GODL-India', true, true),
  ('data.gov.in/kcc', 'Kisan Call Centre Dataset', 'https://data.gov.in', '2026-06-snapshot', 'GODL-India', true, true),
  ('data.gov.in/public_templates', 'Government Form Templates', 'https://data.gov.in', '2026-06-snapshot', 'GODL-India', true, true),
  ('sarvamai/sarvam-2b-v0.5', 'Sarvam 2B Language Model', 'https://huggingface.co/sarvamai/sarvam-2b-v0.5', 'main', 'Apache-2.0', true, false)
ON CONFLICT (id) DO NOTHING;
