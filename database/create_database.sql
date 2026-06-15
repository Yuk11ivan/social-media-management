-- 创建数据库
CREATE DATABASE AI_Content_Platform;
GO

USE AI_Content_Platform;
GO

-- 创建内容表
CREATE TABLE content_items (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    original_text NVARCHAR(MAX) NOT NULL,
    original_image NVARCHAR(512) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 创建平台适配内容表
CREATE TABLE adapted_contents (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    item_id NVARCHAR(36) NOT NULL,
    platform NVARCHAR(50) NOT NULL,
    platform_name NVARCHAR(100) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    hashtags NVARCHAR(MAX) NULL,  -- JSON 字符串
    image NVARCHAR(512) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);
GO

-- 创建索引
CREATE INDEX idx_adapted_platform ON adapted_contents(platform);
CREATE INDEX idx_adapted_item_id ON adapted_contents(item_id);
CREATE INDEX idx_content_created ON content_items(created_at DESC);
GO

-- 创建推送日志表
CREATE TABLE push_logs (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    adapted_content_id NVARCHAR(36) NULL,
    platform NVARCHAR(50) NOT NULL,
    platform_name NVARCHAR(100) NOT NULL,
    status NVARCHAR(20) NOT NULL,  -- success/failed/pending
    content_id NVARCHAR(100) NULL,
    message NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 创建索引
CREATE INDEX idx_push_platform ON push_logs(platform);
CREATE INDEX idx_push_status ON push_logs(status);
CREATE INDEX idx_push_created ON push_logs(created_at DESC);
GO

-- 创建素材表
CREATE TABLE materials (
    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(200) NOT NULL,
    file_path NVARCHAR(512) NOT NULL,
    file_type NVARCHAR(50) NOT NULL,  -- image/template
    platform NVARCHAR(50) NULL,
    file_size BIGINT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 创建索引
CREATE INDEX idx_material_platform ON materials(platform);
CREATE INDEX idx_material_type ON materials(file_type);
CREATE INDEX idx_material_created ON materials(created_at DESC);
GO

-- 打印创建完成信息
PRINT 'Database and tables created successfully!';
PRINT 'Database name: AI_Content_Platform';
GO