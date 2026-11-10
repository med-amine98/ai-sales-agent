# client_simulation.py
"""Simple client‑simulation script for the AI Sales Agent.

Requirements (install once in the virtual‑env used for the backend):
    pip install requests pyttsx3

Usage:
    1️⃣  Make sure the backend is running and exposed via ngrok.
    2️⃣  Update NGROK_URL below if your tunnel URL changes.
    3️⃣  Run the script:   python client_simulation.py
    4️⃣  The script will iterate over QUESTIONS, POST each to the
        /api/calls/virtual endpoint, print the JSON response and use
        the system TTS engine to speak the agent's answer.
"""

import time
import json
import requests
import pyttsx3

# ---------------------------------------------------------------------------
# CONFIGURATION – replace if your ngrok URL changes
# ---------------------------------------------------------------------------
NGROK_URL = "https://2602-197-17-101-71.ngrok-free.app"
API_BASE = f"{NGROK_URL}/api"
# Correct endpoint for voice interaction
VIRTUAL_CALL_ENDPOINT = f"{API_BASE}/calls/voice-interact"

# Payload for initial request (no client message)
def initial_payload():
    return {"prospect_id": PROSPECT_ID, "client_message": "", "is_initial": True, "call_stage": "greeting"}

# Payload for subsequent messages
def message_payload(message: str, history: list, stage: str = "discovery"):
    return {
        "prospect_id": PROSPECT_ID,
        "client_message": message,
        "is_initial": False,
        "history": history,
        "call_stage": stage,
    }

# You can set a prospect ID that exists in the demo data (e.g., 777)
PROSPECT_ID = 777

# List of questions the simulated client will ask. Feel free to extend.
QUESTIONS = [
    "Bonjour, c'est quel service ?",
    "Combien coûte votre abonnement ?",
    "Je suis disponible jeudi à 14h, est‑ce bien ?",
    "Merci, au revoir",
]

# ---------------------------------------------------------------------------
# Initialise TTS engine (offline, platform‑independent)
# ---------------------------------------------------------------------------
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # words per minute
engine.setProperty('volume', 1.0)
# Choose a French voice if available; fallback to default.
# Choose a French voice if available; fallback to the first voice.
for voice in engine.getProperty('voices'):
    # Some TTS installations expose `languages` as an empty list – guard against that.
    lang_match = False
    if hasattr(voice, 'languages') and voice.languages:
        try:
            lang_match = 'fr' in voice.languages[0].decode('utf-8').lower()
        except Exception:
            # If decoding fails, ignore this voice.
            lang_match = False
    # Fallback: also check the voice name/description for "French".
    if not lang_match:
        lang_match = 'french' in (voice.name + voice.id).lower()
    if lang_match:
        engine.setProperty('voice', voice.id)
        break

def speak(text: str):
    """Speak the given text synchronously."""
    engine.say(text)
    engine.runAndWait()

def post_question(question: str, history: list, stage: str = "discovery"):
    """POST a question to the voice‑interact endpoint.
    The first call should be an initial payload (empty message). For subsequent
    calls we include the conversation history so the backend can keep context.
    """
    # Build payload – on the first call the caller will pass an empty string
    # and we treat it as the initial request.
    if not question:
        payload = initial_payload()
    else:
        payload = message_payload(question, history, stage)
    try:
        resp = requests.post(VIRTUAL_CALL_ENDPOINT, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Warning: Error contacting API: {e}")
        return None
    return data

def main():
    print(f"Starting simulated client (prospect id: {PROSPECT_ID})")
    # Initial request to get greeting/pitch
    init_result = post_question("", [], "greeting")
    if not init_result:
        print("Error: Failed to get initial response.")
        return
    bot_reply = init_result.get('bot_response') or init_result.get('response') or init_result.get('text')
    print(f"Agent (initial): {bot_reply}")
    speak(bot_reply)
    # Prepare conversation history for subsequent turns
    history = [{"sender": "bot", "text": bot_reply}]
    current_stage = init_result.get('next_stage', 'discovery')
    # Iterate over predefined questions
    for q in QUESTIONS:
        print(f"\n🗣️  Client: {q}")
        result = post_question(q, history, current_stage)
        if not result:
            print("Error: No response, aborting.")
            break
        bot_reply = result.get('bot_response') or result.get('response') or result.get('text')
        if not bot_reply:
            print(f"Warning: Unexpected payload: {json.dumps(result, ensure_ascii=False, indent=2)}")
            continue
        print(f"Agent: {bot_reply}")
        speak(bot_reply)
        # Update history and stage
        history.append({"sender": "client", "text": q})
        history.append({"sender": "bot", "text": bot_reply})
        current_stage = result.get('next_stage', current_stage)
        time.sleep(2)
    print("\n✅ Simulation finished.")

if __name__ == "__main__":
    main()
