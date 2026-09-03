INSERT INTO `dial_codes` (`id`, `abrv`, `country`, `dial_code`)
VALUES
  (1, 'ZAR', 'South Africa', 27),
  (2, 'USD', 'United States', 1),
  (3, 'GBP', 'United Kingdom', 44),
  (4, 'INR', 'India', 91),
  (5, 'AUD', 'Australia', 61),
  (6, 'EUR', 'Germany', 49),
  (7, 'EUR', 'France', 33)
ON DUPLICATE KEY UPDATE
  `abrv` = VALUES(`abrv`),
  `country` = VALUES(`country`),
  `dial_code` = VALUES(`dial_code`);