-- Netflix Clone — MySQL schema
-- The backend creates these tables automatically on startup, but you can also
-- run this file manually if you prefer (e.g. mysql -u root -p netflix_clone < schema.sql).

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mylist (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tmdb_id INT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    overview TEXT,
    vote_average FLOAT,
    added_at DATETIME NOT NULL,
    UNIQUE KEY uniq_user_tmdb (user_id, tmdb_id),
    CONSTRAINT fk_mylist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
