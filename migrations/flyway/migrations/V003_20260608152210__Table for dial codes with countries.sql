CREATE TABLE dial_codes (
    -- SMALLINT is highly efficient here
    id SMALLINT AUTO_INCREMENT PRIMARY KEY,
    -- 3-letter ISO code (e.g., 'USA', 'CAN', 'GBR')
    abrv CHAR(3) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    dial_code VARCHAR(10) NOT NULL,
    -- Creates the unique constraint on the country name and dial code
    CONSTRAINT uq_country_dial_code UNIQUE (abrv, dial_code)
);