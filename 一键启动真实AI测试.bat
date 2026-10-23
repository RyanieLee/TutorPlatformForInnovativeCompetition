@echo off
setlocal
chcp 65001 >nul
title 领航云学堂 - 真实AI测试
set "nodeExe=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 set "nodeExe=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not "%nodeExe%"=="node.exe" if not exist "%nodeExe%" (
  echo 请先安装 Node.js 20 或更新版本，再重新双击此文件。
  pause
  exit /b 1
)
set "launcher=%~dp0scripts\start-ai-preview.mjs"
if not exist "%launcher%" set "launcher=%~dp0ai-assistant\scripts\start-ai-preview.mjs"
if not exist "%launcher%" (
  echo 找不到启动脚本，请将此文件放在项目根目录或 ai-assistant 文件夹旁边。
  pause
  exit /b 1
)
"%nodeExe%" "%launcher%" %*
if errorlevel 1 pause
endlocal
