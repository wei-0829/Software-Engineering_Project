#!/bin/bash

# API 測試腳本 - 使用 curl 顯示結果

BASE_URL="http://127.0.0.1:8000"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}=== 教室預約系統 API 測試 ===${NC}\n"

# 1. 登入測試
echo -e "${COLOR_BLUE}1. 登入 API 測試${NC}"
echo "發送登入請求..."
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"account":"test@example.com","password":"testpass123"}')

echo "回應："
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# 2. 取得所有建築物
echo -e "${COLOR_BLUE}2. 取得建築物列表${NC}"
RESPONSE=$(curl -s "$BASE_URL/api/rooms/classrooms/buildings/")
echo "回應："
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# 3. 取得所有教室
echo -e "${COLOR_BLUE}3. 取得教室列表${NC}"
RESPONSE=$(curl -s "$BASE_URL/api/rooms/classrooms/")
echo "回應："
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -50 || echo "$RESPONSE" | head -50
echo "(已截斷)..."
echo ""

# 4. 獲取特定教室已佔用的時間段 (需要 classroom_code)
echo -e "${COLOR_BLUE}4. 查詢教室占用時間（範例）${NC}"
echo "用法: curl -s '$BASE_URL/api/reservations/occupied/?classroom_code=CODE&date=2025-12-24' | python3 -m json.tool"
echo ""

echo -e "${COLOR_GREEN}✅ 測試完成${NC}"
