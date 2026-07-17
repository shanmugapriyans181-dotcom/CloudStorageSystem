-- Cloud Storage Management System - MySQL Schema
-- Run this script to initialize the database

CREATE DATABASE IF NOT EXISTS cloud_storage
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cloud_storage;

-- ================================================================
-- USERS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  email            VARCHAR(100) NOT NULL UNIQUE,
  password         VARCHAR(255) NOT NULL,
  full_name        VARCHAR(100),
  profile_picture  VARCHAR(500),
  role             ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  storage_quota    BIGINT NOT NULL DEFAULT 5368709120,  -- 5 GB
  storage_used     BIGINT NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  last_login       DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FOLDERS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS folders (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  user_id     BIGINT NOT NULL,
  parent_id   BIGINT,
  path        VARCHAR(1000),
  color       VARCHAR(20) DEFAULT '#FFD700',
  is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at  DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  INDEX idx_user_parent (user_id, parent_id),
  INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FILES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS files (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  storage_path    VARCHAR(1000) NOT NULL,
  storage_key     VARCHAR(1000),
  content_type    VARCHAR(100),
  file_size       BIGINT,
  file_type       VARCHAR(50),   -- IMAGE, VIDEO, DOCUMENT, PDF, OTHER
  user_id         BIGINT NOT NULL,
  folder_id       BIGINT,
  is_deleted      TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at      DATETIME,
  is_encrypted    TINYINT(1) NOT NULL DEFAULT 0,
  checksum        VARCHAR(64),
  version         INT NOT NULL DEFAULT 1,
  download_count  BIGINT NOT NULL DEFAULT 0,
  thumbnail_path  VARCHAR(1000),
  description     VARCHAR(500),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
  INDEX idx_user_folder  (user_id, folder_id),
  INDEX idx_deleted      (is_deleted),
  INDEX idx_file_type    (file_type),
  FULLTEXT INDEX ft_name (name, original_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FILE VERSIONS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS file_versions (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id        BIGINT NOT NULL,
  version_number INT NOT NULL,
  storage_path   VARCHAR(1000) NOT NULL,
  file_size      BIGINT,
  checksum       VARCHAR(64),
  uploaded_by    BIGINT,
  change_notes   VARCHAR(500),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id)     REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_file_version (file_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- SHARED FILES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS shared_files (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id      BIGINT NOT NULL,
  shared_by    BIGINT NOT NULL,
  shared_with  BIGINT,
  share_token  VARCHAR(255) UNIQUE,
  permission   ENUM('VIEW','DOWNLOAD','EDIT') NOT NULL DEFAULT 'VIEW',
  expires_at   DATETIME,
  is_public    TINYINT(1) NOT NULL DEFAULT 0,
  access_count BIGINT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id)     REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_share_token  (share_token),
  INDEX idx_shared_with  (shared_with),
  INDEX idx_shared_by    (shared_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- ACTIVITY LOGS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  action        ENUM(
    'LOGIN','LOGOUT','REGISTER',
    'UPLOAD','DOWNLOAD','DELETE','RESTORE',
    'CREATE_FOLDER','RENAME','MOVE',
    'SHARE','UNSHARE',
    'VIEW','SEARCH',
    'UPDATE_PROFILE','CHANGE_PASSWORD'
  ) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   BIGINT,
  resource_name VARCHAR(255),
  details       VARCHAR(1000),
  ip_address    VARCHAR(50),
  user_agent    VARCHAR(500),
  file_size     BIGINT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_action (user_id, action),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FAVORITES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS favorites (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  file_id     BIGINT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_file (user_id, file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- NOTIFICATIONS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  type        VARCHAR(50) DEFAULT 'INFO', -- INFO, SHARE, DUPLICATE, SECURITY
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FILE AI METADATA TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS file_ai_metadata (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id              BIGINT NOT NULL UNIQUE,
  summary              TEXT,
  key_points           TEXT,
  important_dates      TEXT,
  category             VARCHAR(50), -- CERTIFICATES, PROJECTS, INVOICES, MEDICAL, CONTRACTS, RESEARCH, PERSONAL
  extracted_text       LONGTEXT,
  embedding            BLOB, -- Serialized float array for semantic vector matching
  sensitive_data_found TEXT, -- JSON/Comma-separated sensitive data details
  similarity_hash      VARCHAR(255),
  is_duplicate         TINYINT(1) NOT NULL DEFAULT 0,
  duplicate_of_file_id BIGINT,
  confidence_score     DOUBLE DEFAULT NULL,
  ai_model             VARCHAR(100) DEFAULT NULL,
  classification_time  DATETIME DEFAULT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_of_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- FILE DUPLICATES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS file_duplicates (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  original_file_id      BIGINT NOT NULL,
  duplicate_file_id     BIGINT NOT NULL,
  similarity_percentage DOUBLE NOT NULL,
  detection_time        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detection_type        VARCHAR(50) NOT NULL, -- FILENAME_DUPLICATE, CONTENT_DUPLICATE, SEMANTIC_DUPLICATE
  FOREIGN KEY (original_file_id)  REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- DEFAULT ADMIN USER  (password: Admin@1234)
-- ================================================================
INSERT IGNORE INTO users (username, email, password, full_name, role, is_email_verified)
VALUES (
  'admin',
  'admin@cloudstorage.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'System Administrator',
  'ADMIN',
  1
);
