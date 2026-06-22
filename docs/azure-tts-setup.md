# Azure TTS Setup

Purpose:
- turn on proper API TTS for English, Sinhala, and Tamil
- keep browser `speechSynthesis` only as fallback

## What to create

1. Create or sign in to an Azure account
2. Create an Azure Speech resource (Microsoft Foundry / Azure AI Speech resource)
3. Use a free tier if it is available in your region

You need two values from Azure:

1. `AZURE_SPEECH_KEY`
2. `AZURE_SPEECH_REGION`

This repo uses `AZURE_SPEECH_KEY` plus `AZURE_SPEECH_REGION`. Azure quickstarts also show endpoint-based setup in some paths, but region-based auth is the correct pattern for this backend.

## Local setup

Add these to your root `.env`:

```env
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=your-region-here
```

Then restart the backend.

For local dev, env vars are fine. For production, prefer a managed secret store or identity-based pattern when your hosting platform supports it.

## Vercel setup

Add the same two environment variables in Vercel Project Settings:

1. `AZURE_SPEECH_KEY`
2. `AZURE_SPEECH_REGION`

Redeploy after saving them.

## How to verify

1. Open `http://127.0.0.1:8000/api/meta`
2. Confirm this becomes true:

```json
"tts": {
  "azure_configured": true
}
```

3. Open the app
4. Send one assistant message
5. Press `Play` on the assistant reply
6. Confirm audio plays without falling back to browser-only speech

## Expected voices

Current target mapping:

1. `en`
   - `en-IN-NeerjaNeural`
2. `si`
   - `si-LK-ThiliniNeural` or `si-LK-SameeraNeural`
3. `ta`
   - `ta-LK-SaranyaNeural` or `ta-LK-KumarNeural`

## Current app behavior

1. If Azure env vars exist, the backend TTS endpoint is used first
2. If Azure is not configured or fails, the frontend falls back to browser `speechSynthesis`
3. If neither works, the app stays text-only

## Cheapest safe path

1. Start with Azure free tier
2. Keep short spoken responses
3. Avoid reading long product grids aloud
4. Use rate limits already in backend to protect spend

## Files involved

1. [backend/tts_service.py](/D:/Projects/MCP%20Agent/backend/tts_service.py)
2. [backend/routes/tts.py](/D:/Projects/MCP%20Agent/backend/routes/tts.py)
3. [backend/routes/meta.py](/D:/Projects/MCP%20Agent/backend/routes/meta.py)
4. [frontend/src/app/api/tts/route.ts](/D:/Projects/MCP%20Agent/frontend/src/app/api/tts/route.ts)
5. [frontend/src/lib/speech.ts](/D:/Projects/MCP%20Agent/frontend/src/lib/speech.ts)
