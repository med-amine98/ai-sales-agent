# backend/quick_clear.py
import sqlite3

def quick_clear():
    """Supprime rapidement toutes les données"""
    conn = sqlite3.connect('sales_agent.db')
    cursor = conn.cursor()
    
    # Supprimer toutes les données
    cursor.execute("DELETE FROM calls")
    cursor.execute("DELETE FROM ml_predictions")
    cursor.execute("DELETE FROM prospects")
    cursor.execute("DELETE FROM interaction_history")
    
    # Réinitialiser les séquences d'auto-incrémentation
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='prospects'")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='calls'")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='ml_predictions'")
    
    conn.commit()
    conn.close()
    
    print("✅ Toutes les données mock ont été supprimées !")
    print("📌 Les tables sont vides et prêtes à être réutilisées.")

if __name__ == "__main__":
    confirm = input("⚠️ Supprimer TOUTES les données ? (o/N): ")
    if confirm.lower() == 'o':
        quick_clear()
    else:
        print("❌ Opération annulée")