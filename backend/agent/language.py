import re

from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0

SINHALA_PATTERN = re.compile(r"[\u0D80-\u0DFF]")
TAMIL_PATTERN = re.compile(r"[\u0B80-\u0BFF]")


def detect_language(text: str) -> str:
    if SINHALA_PATTERN.search(text):
        return "si"
    if TAMIL_PATTERN.search(text):
        return "ta"
    try:
        lang = detect(text)
        if lang in ("si", "ta", "en"):
            return lang
    except Exception:
        pass
    return "en"


def get_language_name(code: str) -> str:
    return {"si": "Sinhala", "ta": "Tamil", "en": "English"}.get(code, "English")
