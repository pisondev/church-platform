-- +goose Up
-- A reusable order of worship that weekly presentations start from.
CREATE TABLE templates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id    uuid NOT NULL REFERENCES churches (id) ON DELETE CASCADE,
    name         text NOT NULL CHECK (name <> ''),
    aspect_ratio text NOT NULL DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '16:10', '4:3')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

CREATE UNIQUE INDEX templates_church_name_key ON templates (church_id, name) WHERE deleted_at IS NULL;

-- Slides in display order. The shape of content depends on kind:
--   cover               {"title", "subtitle", "footer"}
--   section             {"title", "subtitle"}
--   song                {} for an empty slot
--   scripture           {} for an empty slot
--   responsive_reading  {"title", "lines": [{"role", "text"}]}
CREATE TABLE template_slides (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES templates (id) ON DELETE CASCADE,
    position    integer NOT NULL CHECK (position >= 1),
    kind        text NOT NULL CHECK (kind IN ('cover', 'section', 'song', 'scripture', 'responsive_reading')),
    content     jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Deferred so slides can swap positions inside one transaction.
    UNIQUE (template_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- +goose Down
DROP TABLE template_slides;
DROP TABLE templates;
