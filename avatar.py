import requests
import json
import urllib3

# Désactiver les avertissements SSL (UNIQUEMENT pour test)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://three.ws/api/mcp-studio"
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "forge_free",
        "arguments": {
            "prompt": "un avatar masculin professionnel en costume, style cartoon, fond neutre",
            "tier": "draft"
        }
    }
}

headers = {"content-type": "application/json"}

try:
    # Ajouter verify=False pour ignorer les erreurs SSL
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
    print("Statut:", response.status_code)
    print("Réponse:", response.json())
except requests.exceptions.Timeout:
    print("Erreur: Délai d'attente dépassé")
except requests.exceptions.ConnectionError as e:
    print(f"Erreur de connexion: {e}")
except Exception as e:
    print(f"Erreur: {e}")