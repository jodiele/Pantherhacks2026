# Suntology - PantherHacks2026

Sun safety companion: live UV indexing + planning, skin check scanner, sunscreen application helper, sun exposure education, and skin cancer awareness links.


---

## Features

UV Planning: Current UV, hourly curve, current and weekly weather forecasts

- Skin Scanner: Live camera imaging to check skin health with sunburns, as well as oily/dr skin
- Sunscreen Application Masking: Interactive sunscreen coverage helper with face masking and finger tracking for live updates
- AI Chatbot: Discuss questions and concerns with built in chatbot on various tabs
Firebase Authentication: Login/signup to save account information on skin details

## Sources

- Open-Meteo: UV index & hourly forecast
- WeatherAPI.com: current + week outlook
- Mistral AI: chat API
- OpenAI: alternative chat backend
- Firebase: email/password auth
- MediaPipe Tasks Vision: hand / face demos on the coverage map
- Flask: Python web framework for the local API
- PyTorch: model inference for photo scan
- Vite:  frontend dev server & build


## Stack

**Frontend** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Framer Motion, Firebase Auth, MediaPipe Tasks Vision, shadcn-style UI pieces
**Backend** Python 3.10+, Flask, PyTorch

## Running

Ran using localhost
Steps to run locally:
(NOTE: may not be able to run locally for others due to api keys)

- cd /path/to/suntology
- python3 run.py
- npm run api
second terminal:
- npm run dev
