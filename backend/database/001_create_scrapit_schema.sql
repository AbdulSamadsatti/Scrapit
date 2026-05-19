-- ScrapIt PostgreSQL schema
-- Run this file once after creating your database.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS websites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    base_url TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_scraped_products (
    id SERIAL PRIMARY KEY,
    website_id INT NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
    raw_title TEXT,
    raw_price TEXT,
    raw_data JSONB,
    scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    website_id INT NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
    title VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500),
    description TEXT,
    price NUMERIC(12, 2),
    currency VARCHAR(10),
    image_url TEXT,
    product_url TEXT NOT NULL,
    category VARCHAR(150),
    availability VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_product_per_website UNIQUE (website_id, product_url)
);

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_favorite UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query VARCHAR(500) NOT NULL,
    searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
ON users(firebase_uid);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_products_title
ON products(title);

CREATE INDEX IF NOT EXISTS idx_products_normalized_name
ON products(normalized_name);

CREATE INDEX IF NOT EXISTS idx_products_website_id
ON products(website_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_products_website_id
ON raw_scraped_products(website_id);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_products_scraped_at
ON raw_scraped_products(scraped_at);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id
ON favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_product_id
ON favorites(product_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id
ON chatbot_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at
ON chatbot_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id
ON search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_searched_at
ON search_history(searched_at);
