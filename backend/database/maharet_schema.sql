CREATE TABLE IF NOT EXISTS `client_companies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NULL,
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
  KEY `meal_requests_status_index` (`status`),
  CONSTRAINT `meal_requests_client_company_id_foreign`
    FOREIGN KEY (`client_company_id`) REFERENCES `client_companies` (`id`) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS `company_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_company_id` BIGINT UNSIGNED NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `paid_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_payments_company_month_unique` (`client_company_id`, `month`),
  KEY `company_payments_month_index` (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `meal_request_counters` (`key`, `next_value`) VALUES ('meal_request', 1);
INSERT IGNORE INTO `app_settings` (`key`, `value`, `created_at`, `updated_at`) VALUES
  ('meal_eaten_deadline', '16:30', NOW(), NOW()),
  ('meal_collected_deadline', '18:00', NOW(), NOW());
