@echo off
echo Starting Satisfactory Calculator...
set SAVES_DB_PATH=%~dp0planner-saves.db
start http://localhost:5173
yarn dev
