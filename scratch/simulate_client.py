import os
import json
import requests
from pathlib import Path

# Load backend URL from environment or default to localhost
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

# Endpoint to simulate a voice interaction (uses the existing /voice-interact route)
endpoint = f"{backend_url}/voice-interact"

# Sample payload – you can adjust prospect_id and messages as needed
payload = {
    "prospect_id": 1,  # replace with a real prospect ID in your DB
    "client_message": "Bonjour, je suis intéressé par votre solution.",
    "history": [],
    "is_initial": True,
    "call_stage": "greeting",
    "refusal_count": 0,
    "attempted_refusals": [],
    "used_responses": []
}

def simulate_call():
    try:
        resp = requests.post(endpoint, json=payload)
        resp.raise_for_status()
        data = resp.json()
        print("✅ Simulation successful. Bot response:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"❌ Error during simulation: {e}")

if __name__ == "__main__":
    simulate_call()
