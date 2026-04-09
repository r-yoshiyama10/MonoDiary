CREATE TABLE diary_entries (
    id              UUID PRIMARY KEY,
    line_user_id    VARCHAR(255) NOT NULL,
    line_message_id VARCHAR(255),
    source_text     TEXT NOT NULL,
    diary_text      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_diary_entries_line_message_id UNIQUE (line_message_id)
);

CREATE INDEX idx_diary_entries_user_created
    ON diary_entries (line_user_id, created_at DESC, id DESC);
