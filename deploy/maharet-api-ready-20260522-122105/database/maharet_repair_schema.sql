CREATE TABLE IF NOT EXISTS `client_companies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NULL,
  `account_type` VARCHAR(255) NOT NULL DEFAULT 'corporate',
  `name` VARCHAR(255) NOT NULL,
  `contact_name` VARCHAR(255) NULL,
  `phone` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `tax_number` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `meal_unit_price` DECIMAL(10,2) NOT NULL DEFAULT 170.00,
  `meal_vat_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_companies_code_unique` (`code`),
  UNIQUE KEY `client_companies_username_unique` (`username`),
  KEY `client_companies_active_index` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meal_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_no` VARCHAR(255) NOT NULL,
  `client_company_id` BIGINT UNSIGNED NOT NULL,
  `service_date` DATE NOT NULL,
  `headcount` INT UNSIGNED NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'submitted',
  `note` TEXT NULL,
  `eaten_at` TIMESTAMP NULL,
  `collected_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meal_requests_request_no_unique` (`request_no`),
  UNIQUE KEY `meal_requests_company_date_unique` (`client_company_id`, `service_date`),
  KEY `meal_requests_service_date_index` (`service_date`),
  KEY `meal_requests_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meal_request_counters` (
  `key` VARCHAR(255) NOT NULL,
  `next_value` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_settings` (
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

DROP PROCEDURE IF EXISTS maharet_add_column_if_missing//
CREATE PROCEDURE maharet_add_column_if_missing(IN table_name_value VARCHAR(64), IN column_name_value VARCHAR(64), IN column_sql_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @maharet_sql = CONCAT('ALTER TABLE `', table_name_value, '` ADD COLUMN ', column_sql_value);
    PREPARE maharet_stmt FROM @maharet_sql;
    EXECUTE maharet_stmt;
    DEALLOCATE PREPARE maharet_stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS maharet_add_index_if_missing//
CREATE PROCEDURE maharet_add_index_if_missing(IN table_name_value VARCHAR(64), IN index_name_value VARCHAR(64), IN index_sql_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @maharet_sql = CONCAT('ALTER TABLE `', table_name_value, '` ADD ', index_sql_value);
    PREPARE maharet_stmt FROM @maharet_sql;
    EXECUTE maharet_stmt;
    DEALLOCATE PREPARE maharet_stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS maharet_fix_auto_increment_id//
CREATE PROCEDURE maharet_fix_auto_increment_id(IN table_name_value VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = 'id'
      AND EXTRA NOT LIKE '%auto_increment%'
  ) THEN
    SET @maharet_sql = CONCAT('ALTER TABLE `', table_name_value, '` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    PREPARE maharet_stmt FROM @maharet_sql;
    EXECUTE maharet_stmt;
    DEALLOCATE PREPARE maharet_stmt;
  END IF;
END//

DELIMITER ;

CALL maharet_fix_auto_increment_id('client_companies');
CALL maharet_fix_auto_increment_id('meal_requests');

CALL maharet_add_column_if_missing('client_companies', 'username', '`username` VARCHAR(255) NULL AFTER `code`');
CALL maharet_add_column_if_missing('client_companies', 'password_hash', '`password_hash` VARCHAR(255) NULL AFTER `username`');
CALL maharet_add_column_if_missing('client_companies', 'account_type', '`account_type` VARCHAR(255) NOT NULL DEFAULT ''corporate'' AFTER `password_hash`');
CALL maharet_add_column_if_missing('client_companies', 'phone', '`phone` VARCHAR(255) NULL AFTER `contact_name`');
CALL maharet_add_column_if_missing('client_companies', 'email', '`email` VARCHAR(255) NULL AFTER `phone`');
CALL maharet_add_column_if_missing('client_companies', 'address', '`address` VARCHAR(255) NULL AFTER `email`');
CALL maharet_add_column_if_missing('client_companies', 'tax_number', '`tax_number` VARCHAR(255) NULL AFTER `address`');
CALL maharet_add_column_if_missing('client_companies', 'notes', '`notes` TEXT NULL AFTER `tax_number`');
CALL maharet_add_column_if_missing('client_companies', 'meal_unit_price', '`meal_unit_price` DECIMAL(10,2) NOT NULL DEFAULT 170.00 AFTER `notes`');
CALL maharet_add_column_if_missing('client_companies', 'meal_vat_enabled', '`meal_vat_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `meal_unit_price`');
CALL maharet_add_index_if_missing('client_companies', 'client_companies_username_unique', 'UNIQUE KEY `client_companies_username_unique` (`username`)');

CALL maharet_add_column_if_missing('meal_requests', 'request_no', '`request_no` VARCHAR(255) NOT NULL AFTER `id`');
CALL maharet_add_column_if_missing('meal_requests', 'client_company_id', '`client_company_id` BIGINT UNSIGNED NOT NULL AFTER `request_no`');
CALL maharet_add_column_if_missing('meal_requests', 'service_date', '`service_date` DATE NOT NULL AFTER `client_company_id`');
CALL maharet_add_column_if_missing('meal_requests', 'headcount', '`headcount` INT UNSIGNED NOT NULL AFTER `service_date`');
CALL maharet_add_column_if_missing('meal_requests', 'status', '`status` VARCHAR(255) NOT NULL DEFAULT ''submitted'' AFTER `headcount`');
CALL maharet_add_column_if_missing('meal_requests', 'note', '`note` TEXT NULL AFTER `status`');
CALL maharet_add_column_if_missing('meal_requests', 'eaten_at', '`eaten_at` TIMESTAMP NULL AFTER `note`');
CALL maharet_add_column_if_missing('meal_requests', 'collected_at', '`collected_at` TIMESTAMP NULL AFTER `eaten_at`');
CALL maharet_add_column_if_missing('meal_requests', 'created_at', '`created_at` TIMESTAMP NULL AFTER `collected_at`');
CALL maharet_add_column_if_missing('meal_requests', 'updated_at', '`updated_at` TIMESTAMP NULL AFTER `created_at`');
CALL maharet_add_index_if_missing('meal_requests', 'meal_requests_request_no_unique', 'UNIQUE KEY `meal_requests_request_no_unique` (`request_no`)');
CALL maharet_add_index_if_missing('meal_requests', 'meal_requests_company_date_unique', 'UNIQUE KEY `meal_requests_company_date_unique` (`client_company_id`, `service_date`)');
CALL maharet_add_index_if_missing('meal_requests', 'meal_requests_service_date_index', 'KEY `meal_requests_service_date_index` (`service_date`)');
CALL maharet_add_index_if_missing('meal_requests', 'meal_requests_status_index', 'KEY `meal_requests_status_index` (`status`)');

INSERT IGNORE INTO `meal_request_counters` (`key`, `next_value`) VALUES ('meal_request', 1);
INSERT IGNORE INTO `app_settings` (`key`, `value`, `created_at`, `updated_at`) VALUES
  ('meal_eaten_deadline', '16:30', NOW(), NOW()),
  ('meal_collected_deadline', '18:00', NOW(), NOW());

DROP PROCEDURE IF EXISTS maharet_add_column_if_missing;
DROP PROCEDURE IF EXISTS maharet_add_index_if_missing;
DROP PROCEDURE IF EXISTS maharet_fix_auto_increment_id;
