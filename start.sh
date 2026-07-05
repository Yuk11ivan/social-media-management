#!/bin/bash
# Render 启动脚本
cd backend
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
