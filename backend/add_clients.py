import requests
import json

API_URL = "http://localhost:8000/api/prospects"

# Liste de clients fictifs
clients = [
    {"company_name": "Digital Solutions", "industry": "Technology", "website": "https://digitalsolutions.fr", "email": "contact@digitalsolutions.fr", "phone": "+33123456111"},
    {"company_name": "EcoClean", "industry": "Environment", "website": "https://ecoclean.fr", "email": "info@ecoclean.fr", "phone": "+33123456222"},
    {"company_name": "SmartHome", "industry": "IoT", "website": "https://smarthome.fr", "email": "contact@smarthome.fr", "phone": "+33123456333"},
    {"company_name": "BioFood", "industry": "Food", "website": "https://biofood.fr", "email": "info@biofood.fr", "phone": "+33123456444"},
    {"company_name": "CloudTech", "industry": "Technology", "website": "https://cloudtech.fr", "email": "contact@cloudtech.fr", "phone": "+33123456555"},
]

for client in clients:
    response = requests.post(API_URL, json=client)
    if response.status_code == 201:
        print(f"✅ {client['company_name']} ajouté")
    else:
        print(f"❌ Erreur: {client['company_name']}")

print("\n📌 Lancez maintenant le scoring depuis l'interface !")