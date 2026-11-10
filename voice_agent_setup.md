# Voice Agent Setup and Testing Guide

## 1️⃣ Frontend – Conditional Video Background

- The **Layout** component now renders the `VideoBackground` wrapper **only** on the `/calls` route.
- The video file must be served from the Vite `public/` folder. Copy the provided video:
  ```powershell
  copy "C:\Users\salah\Desktop\project\ai-sales-agent\frontend\7706615-uhd_4096_2160_25fps.mp4" "C:\Users\salah\Desktop\project\ai-sales-agent\frontend\public\"
  ```
- Verify the path in `VideoBackground.jsx` (it uses `/7706615-uhd_4096_2160_25fps.mp4`).

### Running the Frontend
```bash
cd C:\Users\salah\Desktop\project\ai-sales-agent\frontend
npm install   # one‑time
npm run dev   # starts Vite dev server (usually http://localhost:5173)
```
Navigate to `http://localhost:5173/calls` – you should see the video playing behind the UI. All other pages (`/dashboard`, `/prospects`, …) render without the video.

---

## 2️⃣ Backend – Expose via Ngrok for Webhooks

The backend runs on **FastAPI** (port **8000**). To receive inbound webhook calls (e.g., from SignalWire‑style endpoints) you need a public HTTPS URL.

### Start the Backend
```bash
cd C:\Users\salah\Desktop\project\ai-sales-agent\backend\app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
You should see `http://127.0.0.1:8000/` responding.

### Create an Ngrok Tunnel
```bash
ngrok http 8000
```
Ngrok will output a forwarding URL like `https://abcd1234.ngrok.io`. **Copy** this URL – you will need it for the simulation script.

---

## 3️⃣ Simulated Client – Python Script

A minimal script (`simulate_client.py`) is provided in `backend/` to trigger a virtual outbound call without a real phone number.

```python
# backend/simulate_client.py
import requests
import os

# Replace with the Ngrok URL from step 2
NGROK_URL = os.getenv("NGROK_URL", "https://abcd1234.ngrok.io")

# Destination is the virtual client number (any valid E.164 format)
DEST_NUMBER = "+15559876543"

# The webhook endpoint that the backend expects for the call answer
ANSWER_URL = f"{NGROK_URL}/api/calls/voice-interact"

def make_outbound_call(dest_number: str, answer_url: str):
    """Call the FastAPI endpoint that creates a virtual call.
    Adjust the payload as needed for your test scenario.
    """
    payload = {
        "dest_number": dest_number,
        "answer_url": answer_url,
    }
    # The `make_outbound_call` helper lives in `backend/app/routes/calls.py`
    # and is exposed via a custom utility. For testing we call the public route:
    response = requests.post(f"{NGROK_URL}/api/calls/virtual-call", json=payload)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    try:
        result = make_outbound_call(DEST_NUMBER, ANSWER_URL)
        print("✅ Call launched – response:", result)
    except Exception as e:
        print("❌ Error launching call:", e)
```
**How to run:**
```bash
cd C:\Users\salah\Desktop\project\ai-sales-agent\backend
python simulate_client.py
```
Make sure the environment variable `NGROK_URL` matches the tunnel URL, or edit the script directly.

---

## 4️⃣ End‑to‑End Test Flow
1. Start **backend** (`uvicorn …`).
2. Start **ngrok** (step 2) and note the HTTPS URL.
3. Update `simulate_client.py` with the correct `NGROK_URL` (or export it).
4. Run `python simulate_client.py` – the script will call the backend, which in turn streams the virtual call through the `/api/calls/voice-interact` endpoint.
5. Open the frontend at `http://localhost:5173/calls`. You should see the video background and the call‑control UI (🎤 Parler, ⏸️ Pause, Prêt, Raccrocher). The virtual call will be processed server‑side and you can watch the console logs for transcript updates.

---

## 5️⃣ Troubleshooting
- **Frontend syntax errors** – after the overwrite, the JSX is valid. If you still see Vite errors, clear the Vite cache: `npm run clean` (or delete `node_modules/.vite`).
- **Ngrok URL changes** – each time you restart ngrok you get a new subdomain; update the script accordingly.
- **CORS** – the backend is configured with `allow_origins=["*"]`, so the frontend can call it without extra headers.
- **Video not showing** – ensure the video file is inside `frontend/public/` and the filename matches exactly (case‑sensitive on some servers).

---

## 6️⃣ Quick Reference Links
- **Frontend entry point**: `file:///C:/Users/salah/Desktop/project/ai-sales-agent/frontend/src/components/Layout/Layout.jsx`
- **Video component**: `file:///C:/Users/salah/Desktop/project/ai-sales-agent/frontend/src/components/VideoBackground.jsx`
- **Backend FastAPI app**: `file:///C:/Users/salah/Desktop/project/ai-sales-agent/backend/app/main.py`
- **Simulation script**: `file:///C:/Users/salah/Desktop/project/ai-sales-agent/backend/simulate_client.py`

You can now run the whole stack and test the voice‑call flow without a real phone number. Let me know if you hit any hiccups or need further customisation!
