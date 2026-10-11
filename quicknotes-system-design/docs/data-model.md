# QuickNotes Data Model

## Entities and relationships

The relational model contains four entities:

- **users**: one account can own many notes and many tags (one-to-many).
- **notes**: each note belongs to exactly one user.
- **tags**: each tag belongs to one user, preventing unrelated users from sharing private tag names.
- **note_tags**: join table linking notes and tags. A note can have many tags and a tag can label many notes (many-to-many).

The database enforces ownership relationships with foreign keys. Application logic must additionally ensure that a note and tag attached through `note_tags` belong to the same user.

## SQL schema

The statements below target PostgreSQL.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tags_user_name_unique UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (note_id, tag_id)
);
```

### Columns, types and keys summary

| Table | Columns and types | Primary key | Foreign keys |
|---|---|---|---|
| `users` | `id BIGINT`, `email VARCHAR(254)`, `password_hash TEXT`, `display_name VARCHAR(100)`, `created_at TIMESTAMPTZ` | `id` | None |
| `notes` | `id BIGINT`, `user_id BIGINT`, `title VARCHAR(100)`, `body TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ` | `id` | `user_id → users.id` |
| `tags` | `id BIGINT`, `user_id BIGINT`, `name VARCHAR(50)`, `created_at TIMESTAMPTZ` | `id` | `user_id → users.id` |
| `note_tags` | `note_id BIGINT`, `tag_id BIGINT`, `created_at TIMESTAMPTZ` | `(note_id, tag_id)` | `note_id → notes.id`; `tag_id → tags.id` |

## Example SQL queries

1. List the latest 20 notes for one user:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

2. Find notes with their tag names (**JOIN example**):

```sql
SELECT n.id, n.title, t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1
ORDER BY n.created_at DESC;
```

3. Count notes per user:

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

4. Find tags that have not been attached to any note:

```sql
SELECT t.id, t.name
FROM tags AS t
LEFT JOIN note_tags AS nt ON nt.tag_id = t.id
WHERE t.user_id = $1 AND nt.tag_id IS NULL;
```

## Indexes

```sql
CREATE INDEX notes_user_created_idx
ON notes (user_id, created_at DESC, id DESC);

CREATE INDEX note_tags_tag_id_idx
ON note_tags (tag_id);
```

`notes_user_created_idx` speeds up the common query that lists one user's newest notes and supports the sort order. The composite primary key on `note_tags` starts with `note_id`, so the additional `tag_id` index helps look up all notes associated with a tag. The unique constraints also create supporting indexes in PostgreSQL.

## SQL versus NoSQL decision

Choose **PostgreSQL (SQL)** for the initial service. Users, notes, tags, and note-tag links have clear relationships and integrity requirements, and transactions plus foreign keys help prevent orphaned or inconsistent records. SQL also supports reporting and flexible joins. At one million users, a properly indexed relational database with connection pooling, caching, read replicas, and measured query tuning is a reasonable starting point. Revisit partitioning or specialized search only when production metrics demonstrate a need; NoSQL is not automatically faster simply because the user count is large.
