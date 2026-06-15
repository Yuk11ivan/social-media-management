# SQL Server 数据库初始化脚本
# 请在运行前修改下面的数据库密码

$SQL_SERVER = "localhost"
$SQL_USERNAME = "sa"
# 请修改为你的 sa 密码
$SQL_PASSWORD = Read-Host -AsSecureString "请输入 SQL Server sa 密码" | ConvertFrom-SecureString -AsPlainText
$DATABASE_NAME = "AI_Content_Platform"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " SQL Server 数据库初始化" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查 SQL Server 是否运行
$service = Get-Service -Name MSSQLSERVER -ErrorAction SilentlyContinue
if ($service.Status -ne "Running") {
    Write-Host "错误: SQL Server 服务未运行" -ForegroundColor Red
    Write-Host "请先启动 SQL Server 服务" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ SQL Server 服务运行中" -ForegroundColor Green
Write-Host ""

# 检查 ODBC 驱动
$odbcDrivers = Get-ItemProperty -Path "HKLM:\SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers" -ErrorAction SilentlyContinue
if (-not $odbcDrivers -or -not $odbcDrivers.PSObject.Properties["ODBC Driver 18 for SQL Server"]) {
    Write-Host "警告: ODBC Driver 18 for SQL Server 未安装" -ForegroundColor Yellow
    Write-Host "请下载安装: https://learn.microsoft.com/zh-cn/sql/connect/odbc/download-odbc-driver-for-sql-server" -ForegroundColor Cyan
    Write-Host ""
}

# 测试数据库连接
Write-Host "测试数据库连接..." -ForegroundColor Yellow
try {
    $connectionString = "Server=$SQL_SERVER;Database=master;User Id=$SQL_USERNAME;Password=$SQL_PASSWORD;TrustServerCertificate=True;Encrypt=True;"
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    $connection.Close()
    Write-Host "✓ 数据库连接成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 数据库连接失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 执行数据库创建脚本
$scriptPath = Join-Path $PSScriptRoot "create_database.sql"
if (Test-Path $scriptPath) {
    Write-Host "创建数据库和表..." -ForegroundColor Yellow

    try {
        $connectionString = "Server=$SQL_SERVER;Database=master;User Id=$SQL_USERNAME;Password=$SQL_PASSWORD;TrustServerCertificate=True;Encrypt=True;"
        $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()

        $script = Get-Content $scriptPath -Raw
        $script = $script -replace "\bGO\b", ";" -split ";"

        foreach ($batch in $script) {
            if ($batch.Trim()) {
                $command = $connection.CreateCommand()
                $command.CommandText = $batch.Trim()
                $command.CommandTimeout = 30
                $command.ExecuteNonQuery() | Out-Null
            }
        }

        $connection.Close()
        Write-Host "✓ 数据库创建成功" -ForegroundColor Green
    } catch {
        Write-Host "✗ 数据库创建失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "错误: 未找到 create_database.sql" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " 初始化完成!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "数据库配置信息:" -ForegroundColor Yellow
Write-Host "  服务器: $SQL_SERVER" -ForegroundColor White
Write-Host "  数据库: $DATABASE_NAME" -ForegroundColor White
Write-Host "  用户名: $SQL_USERNAME" -ForegroundColor White
Write-Host ""
Write-Host "请设置环境变量或在 config.py 中修改:" -ForegroundColor Yellow
Write-Host "  SQL_SERVER=$SQL_SERVER" -ForegroundColor White
Write-Host "  SQL_USERNAME=$SQL_USERNAME" -ForegroundColor White
Write-Host "  SQL_PASSWORD=<你的密码>" -ForegroundColor White
Write-Host ""
Write-Host "或直接在终端运行:" -ForegroundColor Yellow
Write-Host "  `$env:SQL_SERVER='$SQL_SERVER'" -ForegroundColor White
Write-Host "  `$env:SQL_USERNAME='$SQL_USERNAME'" -ForegroundColor White
Write-Host "  `$env:SQL_PASSWORD='<你的密码>'" -ForegroundColor White
Write-Host ""
Write-Host "然后启动后端服务:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python main.py" -ForegroundColor White
Write-Host ""