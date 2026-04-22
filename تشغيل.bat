@echo off
chcp 65001 > nul
echo.
echo  ==========================================
echo   نظام ادارة البيانات الترابية - اقليم طاطا
echo  ==========================================
echo.
echo  جاري تشغيل الخادم...
echo  سيفتح المتصفح تلقائيا على: http://localhost:3000
echo.
cd /d "%~dp0"
start "" "http://localhost:3000"
node --experimental-sqlite server.js
pause
