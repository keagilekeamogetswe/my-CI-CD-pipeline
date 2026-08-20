ALTER TABLE jobs 
MODIFY COLUMN status 
ENUM('queued','running','done','failed','scheduled') 
NOT NULL DEFAULT 'queued';
