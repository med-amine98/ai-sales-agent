import os
import random
import logging

logger = logging.getLogger(__name__)


class LocalLLM:
    """A very lightweight fallback language model.

    The implementation is deliberately simple – it does not require any heavy
    machine‑learning dependencies. It can be replaced later with a real tiny
    transformer model (e.g. a distilled GPT‑2) without changing the public API.
    """

    def __init__(self):
        # In a real deployment you could load a model file here.
        # For now we just log its initialisation.
        logger.info("LocalLLM initialised – using deterministic template responses.")

    def generate(self, prompt: str) -> str:
        """Generate a response for *prompt*.

        The fallback simply echoes the prompt with a prefix and adds a tiny
        amount of random variation so the conversation does not look completely
        robotic.
        """
        variations = [
            "Voici ce que je peux dire :",
            "En résumé :",
            "Je vous propose :",
            "Permettez‑moi de vous expliquer :",
        ]
        prefix = random.choice(variations)
        return f"[LocalLLM] {prefix} {prompt[:150]}..."
