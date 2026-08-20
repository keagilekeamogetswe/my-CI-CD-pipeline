CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    lastname VARCHAR(100),
    dob DATE,
    bio VARCHAR(500), -- bio text
    phone VARCHAR(20) UNIQUE,
    profile_picture VARCHAR(255), -- path/URL to profile picture
    user_id BIGINT,
    CONSTRAINT fk_user_credentials
      FOREIGN KEY (user_id) REFERENCES user_credentials(id)
      ON DELETE CASCADE
);
