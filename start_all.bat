@echo off
echo Starting ScrapIt Ecosystem...

:: Set IP Address
set MY_IP=192.168.0.103

:: Start FastAPI in a new window
echo Launching Chatbot Server (FastAPI)...
start cmd /k "cd /d ""C:\Users\HP\OneDrive\Desktop\Chatbot---Scrapbot-main\Chatbot---Scrapbot-main\Chatbot---Scrapbot-main\Chatbot---Scrapbot-main"" && uvicorn web_app:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment
timeout /t 3 /nobreak > nul

:: Start Expo in current window
echo Launching Mobile App (Expo)...
if exist frontend (
  cd frontend
) else (
  cd scrapit
)
set REACT_NATIVE_PACKAGER_HOSTNAME=%MY_IP%
npx expo start --lan
