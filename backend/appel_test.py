# appel_test.py  (à placer dans le dossier du projet)
from main import make_outbound_call

# -------------------------------------------------
# Remplacez les deux valeurs ci‑dessous :
# -------------------------------------------------
dest_number = "+15559876543"                     # votre mobile (format international)
answer_url = "https://abcd1234.ngrok.io/signalwire/voice"   # URL publique du tunnel

# -------------------------------------------------
# Lancer l’appel
# -------------------------------------------------
try:
    sid = make_outbound_call(dest_number, answer_url)
    print("✅ Appel lancé – SID :", sid)
    print("👉 Vous recevrez bientôt l’appel sur le numéro indiqué.")
except Exception as e:
    print("❌ Erreur lors de la création de l’appel :", e)