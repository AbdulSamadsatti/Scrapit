-- ScrapIt multi-domain scraper-ready upgrade.
-- Safe to run after 001_create_scrapit_schema.sql.
-- This keeps the old product tables, then adds a cleaner shared pipeline for:
-- ecommerce, real estate, jobs, flights/travel, and automobiles.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO domains (code, name, description)
VALUES
    ('ecommerce', 'E-commerce', 'Products, prices, categories, availability, and offers.'),
    ('real_estate', 'Real Estate', 'Properties for sale or rent.'),
    ('jobs', 'Jobs', 'Job posts, companies, salaries, and work locations.'),
    ('flights_travel', 'Flights & Travel', 'Flights, hotels, packages, and travel offers.'),
    ('automobiles', 'Automobiles', 'Cars, bikes, and vehicle listings.')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

ALTER TABLE websites
ADD COLUMN IF NOT EXISTS domain_id INT REFERENCES domains(id) ON DELETE RESTRICT;

ALTER TABLE websites
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE websites
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_websites_domain_id
ON websites(domain_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_websites_domain_base_url_unique
ON websites(domain_id, base_url)
WHERE domain_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS scrape_runs (
    id SERIAL PRIMARY KEY,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    website_id INT NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
    scraper_name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    total_found INT NOT NULL DEFAULT 0,
    total_saved INT NOT NULL DEFAULT 0,
    total_failed INT NOT NULL DEFAULT 0,
    stats JSONB NOT NULL DEFAULT '{}'::JSONB,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_domain_id
ON scrape_runs(domain_id);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_website_id
ON scrape_runs(website_id);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_started_at
ON scrape_runs(started_at);

CREATE TABLE IF NOT EXISTS raw_scraped_items (
    id SERIAL PRIMARY KEY,
    scrape_run_id INT REFERENCES scrape_runs(id) ON DELETE SET NULL,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    website_id INT NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
    source_url TEXT,
    source_item_id VARCHAR(255),
    raw_title TEXT,
    raw_price TEXT,
    raw_location TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    raw_fingerprint VARCHAR(64),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP,
    error_message TEXT,
    scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_items_domain_id
ON raw_scraped_items(domain_id);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_items_website_id
ON raw_scraped_items(website_id);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_items_scraped_at
ON raw_scraped_items(scraped_at);

CREATE INDEX IF NOT EXISTS idx_raw_scraped_items_processing_status
ON raw_scraped_items(processing_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_scraped_items_source_url_unique
ON raw_scraped_items(website_id, source_url)
WHERE source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_scraped_items_source_item_unique
ON raw_scraped_items(website_id, source_item_id)
WHERE source_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    website_id INT NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
    raw_scraped_item_id INT REFERENCES raw_scraped_items(id) ON DELETE SET NULL,
    title VARCHAR(700) NOT NULL,
    normalized_title VARCHAR(700),
    summary TEXT,
    item_url TEXT NOT NULL,
    image_url TEXT,
    location_text VARCHAR(300),
    city VARCHAR(150),
    country VARCHAR(150),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    price_amount NUMERIC(14, 2),
    currency VARCHAR(10),
    status VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_item_per_website_url UNIQUE (website_id, item_url)
);

CREATE INDEX IF NOT EXISTS idx_items_domain_id
ON items(domain_id);

CREATE INDEX IF NOT EXISTS idx_items_website_id
ON items(website_id);

CREATE INDEX IF NOT EXISTS idx_items_normalized_title
ON items(normalized_title);

CREATE INDEX IF NOT EXISTS idx_items_city
ON items(city);

CREATE INDEX IF NOT EXISTS idx_items_country
ON items(country);

CREATE INDEX IF NOT EXISTS idx_items_price_amount
ON items(price_amount);

CREATE INDEX IF NOT EXISTS idx_items_created_at
ON items(created_at);

CREATE INDEX IF NOT EXISTS idx_items_last_seen_at
ON items(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_items_metadata_gin
ON items USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_items_title_trgm
ON items USING GIN(title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS ecommerce_items (
    item_id INT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    brand VARCHAR(150),
    category VARCHAR(150),
    subcategory VARCHAR(150),
    sku VARCHAR(255),
    condition VARCHAR(100),
    availability VARCHAR(100),
    rating NUMERIC(3, 2),
    review_count INT,
    seller_name VARCHAR(255),
    shipping_info TEXT,
    specs JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_items_category
ON ecommerce_items(category);

CREATE INDEX IF NOT EXISTS idx_ecommerce_items_brand
ON ecommerce_items(brand);

CREATE INDEX IF NOT EXISTS idx_ecommerce_items_specs_gin
ON ecommerce_items USING GIN(specs);

CREATE TABLE IF NOT EXISTS real_estate_items (
    item_id INT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    listing_type VARCHAR(50),
    property_type VARCHAR(100),
    bedrooms INT,
    bathrooms NUMERIC(4, 1),
    area_value NUMERIC(12, 2),
    area_unit VARCHAR(50),
    address TEXT,
    agency_name VARCHAR(255),
    agent_name VARCHAR(255),
    contact_phone VARCHAR(100),
    furnished BOOLEAN,
    amenities JSONB NOT NULL DEFAULT '[]'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_real_estate_items_listing_type
ON real_estate_items(listing_type);

CREATE INDEX IF NOT EXISTS idx_real_estate_items_property_type
ON real_estate_items(property_type);

CREATE INDEX IF NOT EXISTS idx_real_estate_items_bedrooms
ON real_estate_items(bedrooms);

CREATE INDEX IF NOT EXISTS idx_real_estate_items_area_value
ON real_estate_items(area_value);

CREATE INDEX IF NOT EXISTS idx_real_estate_items_amenities_gin
ON real_estate_items USING GIN(amenities);

CREATE TABLE IF NOT EXISTS job_items (
    item_id INT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    employment_type VARCHAR(100),
    workplace_type VARCHAR(100),
    experience_level VARCHAR(100),
    salary_min NUMERIC(14, 2),
    salary_max NUMERIC(14, 2),
    salary_period VARCHAR(50),
    skills JSONB NOT NULL DEFAULT '[]'::JSONB,
    apply_url TEXT,
    posted_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_items_company_name
ON job_items(company_name);

CREATE INDEX IF NOT EXISTS idx_job_items_employment_type
ON job_items(employment_type);

CREATE INDEX IF NOT EXISTS idx_job_items_workplace_type
ON job_items(workplace_type);

CREATE INDEX IF NOT EXISTS idx_job_items_posted_at
ON job_items(posted_at);

CREATE INDEX IF NOT EXISTS idx_job_items_skills_gin
ON job_items USING GIN(skills);

CREATE TABLE IF NOT EXISTS travel_items (
    item_id INT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    offer_type VARCHAR(100),
    origin VARCHAR(150),
    destination VARCHAR(150),
    departure_at TIMESTAMP,
    return_at TIMESTAMP,
    airline VARCHAR(150),
    hotel_name VARCHAR(255),
    nights INT,
    travelers INT,
    booking_url TEXT,
    baggage_info TEXT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_travel_items_offer_type
ON travel_items(offer_type);

CREATE INDEX IF NOT EXISTS idx_travel_items_origin
ON travel_items(origin);

CREATE INDEX IF NOT EXISTS idx_travel_items_destination
ON travel_items(destination);

CREATE INDEX IF NOT EXISTS idx_travel_items_departure_at
ON travel_items(departure_at);

CREATE INDEX IF NOT EXISTS idx_travel_items_details_gin
ON travel_items USING GIN(details);

CREATE TABLE IF NOT EXISTS automobile_items (
    item_id INT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(100),
    make VARCHAR(150),
    model VARCHAR(150),
    variant VARCHAR(150),
    year INT,
    mileage_km INT,
    fuel_type VARCHAR(100),
    transmission VARCHAR(100),
    engine_capacity VARCHAR(100),
    color VARCHAR(100),
    registration_city VARCHAR(150),
    vehicle_condition VARCHAR(100),
    seller_type VARCHAR(100),
    specs JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_automobile_items_vehicle_type
ON automobile_items(vehicle_type);

CREATE INDEX IF NOT EXISTS idx_automobile_items_make
ON automobile_items(make);

CREATE INDEX IF NOT EXISTS idx_automobile_items_model
ON automobile_items(model);

CREATE INDEX IF NOT EXISTS idx_automobile_items_year
ON automobile_items(year);

CREATE INDEX IF NOT EXISTS idx_automobile_items_mileage_km
ON automobile_items(mileage_km);

CREATE INDEX IF NOT EXISTS idx_automobile_items_specs_gin
ON automobile_items USING GIN(specs);

CREATE TABLE IF NOT EXISTS item_price_history (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    price_amount NUMERIC(14, 2),
    currency VARCHAR(10),
    observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_price_history_item_id
ON item_price_history(item_id);

CREATE INDEX IF NOT EXISTS idx_item_price_history_observed_at
ON item_price_history(observed_at);

CREATE TABLE IF NOT EXISTS saved_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_saved_item UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id
ON saved_items(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_items_item_id
ON saved_items(item_id);

ALTER TABLE search_history
ADD COLUMN IF NOT EXISTS domain_id INT REFERENCES domains(id) ON DELETE SET NULL;

ALTER TABLE search_history
ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_search_history_domain_id
ON search_history(domain_id);

CREATE INDEX IF NOT EXISTS idx_search_history_filters_gin
ON search_history USING GIN(filters);

ALTER TABLE chatbot_messages
ADD COLUMN IF NOT EXISTS domain_id INT REFERENCES domains(id) ON DELETE SET NULL;

ALTER TABLE chatbot_messages
ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_domain_id
ON chatbot_messages(domain_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_context_gin
ON chatbot_messages USING GIN(context);
