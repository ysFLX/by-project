ALTER TABLE `client_companies`
  ADD COLUMN `username` VARCHAR(255) NULL AFTER `code`,
  ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `username`,
  ADD COLUMN `phone` VARCHAR(255) NULL AFTER `contact_name`,
  ADD COLUMN `email` VARCHAR(255) NULL AFTER `phone`,
  ADD COLUMN `address` VARCHAR(255) NULL AFTER `email`,
  ADD COLUMN `tax_number` VARCHAR(255) NULL AFTER `address`,
  ADD COLUMN `notes` TEXT NULL AFTER `tax_number`;

ALTER TABLE `client_companies`
  ADD UNIQUE KEY `client_companies_username_unique` (`username`);
