# backend/app/routes/transfer.py
from fastapi import APIRouter, HTTPException
from signalwire.sdk import FunctionResult   # <-- Import du SDK SignalWire
import os

router = APIRouter()


@router.post("/transfer")
async def transfer_call(payload: dict):
    """
    Exemple d’appel d’un transfert d’appel via SignalWire.
    Le corps JSON attendu doit contenir :
        { "test_number": "+15551234567" }   # numéro de destination
    Si aucun numéro n’est fourni, on utilise le numéro de test par défaut.
    """
    test_number = payload.get("test_number", "+15551234567")

    # Vous pouvez ajouter ici toute logique de validation (ex. numéro de format valide)
    if not test_number.startswith("+"):
        raise HTTPException(status_code=400, detail="Le numéro doit commencer par '+' et être au format international.")

    # Renvoie l’objet FunctionResult qui indique à SignalWire de faire le transfert
    # `final=True` = transfert définitif, l’agent IA termine immédiatement.
    return FunctionResult("Transfert en cours…").connect(test_number, final=True)