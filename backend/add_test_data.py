# backend/add_test_data.py
import requests
import json
import time

API_BASE = "http://localhost:8000/api"

def check_backend():
    """Vérifie si le backend est accessible"""
    try:
        response = requests.get(f"{API_BASE}/prospects")
        return response.status_code == 200
    except:
        return False

def add_prospects():
    """Ajoute des prospects de test"""
    prospects = [
        {
            "company_name": "TechCorp France",
            "industry": "Technology",
            "website": "https://techcorp.fr",
            "email": "contact@techcorp.fr",
            "phone": "+33123456789"
        },
        {
            "company_name": "GreenEnergy Solutions",
            "industry": "Energy",
            "website": "https://greenenergy.fr",
            "email": "info@greenenergy.fr",
            "phone": "+33198765432"
        },
        {
            "company_name": "FinTech Innovations",
            "industry": "Finance",
            "website": "https://fintech-innovations.fr",
            "email": "contact@fintech.fr",
            "phone": "+33145678901"
        },
        {
            "company_name": "HealthTech Medical",
            "industry": "Healthcare",
            "website": "https://healthtech-medical.fr",
            "email": "info@healthtech.fr",
            "phone": "+33123456700"
        },
        {
            "company_name": "Smart Logistics",
            "industry": "Logistics",
            "website": "https://smart-logistics.fr",
            "email": "contact@smartlogistics.fr",
            "phone": "+33187654321"
        },
        {
            "company_name": "AI Solutions",
            "industry": "Technology",
            "website": "https://aisolutions.fr",
            "email": "contact@aisolutions.fr",
            "phone": "+33123456999"
        },
        {
            "company_name": "EcoBuild",
            "industry": "Construction",
            "website": "https://ecobuild.fr",
            "email": "info@ecobuild.fr",
            "phone": "+33123456888"
        },
        {
            "company_name": "DataFlow",
            "industry": "Technology",
            "website": "https://dataflow.fr",
            "email": "contact@dataflow.fr",
            "phone": "+33123456777"
        },
        {
            "company_name": "MediCare Plus",
            "industry": "Healthcare",
            "website": "https://medicareplus.fr",
            "email": "info@medicareplus.fr",
            "phone": "+33123456666"
        },
        {
            "company_name": "GreenTech",
            "industry": "Energy",
            "website": "https://greentech.fr",
            "email": "contact@greentech.fr",
            "phone": "+33123456555"
        }
    ]

    print("🚀 Ajout des prospects de test...")
    added = 0
    
    for prospect in prospects:
        try:
            response = requests.post(f"{API_BASE}/prospects", json=prospect)
            if response.status_code == 201:
                print(f"  ✅ {prospect['company_name']} ajouté")
                added += 1
            else:
                print(f"  ❌ Erreur pour {prospect['company_name']}: {response.text}")
        except Exception as e:
            print(f"  ❌ Erreur: {e}")
        time.sleep(0.3)
    
    print(f"\n✅ {added} prospects ajoutés avec succès !")
    return added

def trigger_scoring():
    """Déclenche le scoring"""
    print("\n🔄 Lancement du scoring...")
    try:
        response = requests.post(f"{API_BASE}/calls/scoring")
        if response.status_code == 200:
            print("✅ Scoring déclenché avec succès !")
            return True
        else:
            print(f"❌ Erreur lors du scoring: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    print("=" * 50)
    print("AI Sales Agent - Ajout de données de test")
    print("=" * 50)
    
    # Vérifier le backend
    print("\n🔍 Vérification du backend...")
    if not check_backend():
        print("❌ Le backend n'est pas accessible !")
        print("   Assurez-vous que le serveur est lancé sur http://localhost:8000")
        print("   Commande: uvicorn app.main:app --reload")
        return
    
    print("✅ Backend accessible")
    
    # Ajouter les prospects
    added = add_prospects()
    
    if added > 0:
        # Lancer le scoring
        trigger_scoring()
    
    print("\n" + "=" * 50)
    print("📊 Vérifiez les données sur:")
    print("   - http://localhost:5173/prospects")
    print("   - http://localhost:8000/api/prospects")
    print("=" * 50)

if __name__ == "__main__":
    main()