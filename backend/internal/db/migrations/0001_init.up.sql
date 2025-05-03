-- Users table: stores application users.
CREATE TABLE users (
                       id SERIAL PRIMARY KEY,
                       name TEXT NOT NULL,
                       email TEXT NOT NULL UNIQUE,
                       password_hash TEXT NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Boards table: each board has an owner and a title.
CREATE TABLE boards (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        owner_id INT NOT NULL REFERENCES users(id),
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Board membership table: links users to boards with a role.
CREATE TABLE board_members (
                               board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                               user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               role TEXT NOT NULL CHECK (role IN ('owner','member')),
                               PRIMARY KEY (board_id, user_id)
);

-- Lists table: lists belong to a board.
CREATE TABLE lists (
                       id SERIAL PRIMARY KEY,
                       board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                       title TEXT NOT NULL,
                       position INT NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cards table: cards belong to a list.
CREATE TABLE cards (
                       id SERIAL PRIMARY KEY,
                       list_id INT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
                       title TEXT NOT NULL,
                       description TEXT,
                       position INT NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);