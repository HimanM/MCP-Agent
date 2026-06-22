import re

from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0

SINHALA_PATTERN = re.compile(r"[\u0D80-\u0DFF]")
TAMIL_PATTERN = re.compile(r"[\u0B80-\u0BFF]")
SINGLISH_MARKERS = ("mage", "wifet", "ahuw", "kiyapan", "ekak", "hari", "aiyo", "raa", "beela")
TANGLISH_MARKERS = ("kitta", "konjam", "irukku", "vandhen", "sollu", "paakalam", "venum", "kulla")


def detect_language(text: str) -> str:
    if SINHALA_PATTERN.search(text):
        return "si"
    if TAMIL_PATTERN.search(text):
        return "ta"
    normalized = text.lower()
    singlish_hits = sum(marker in normalized for marker in SINGLISH_MARKERS)
    tanglish_hits = sum(marker in normalized for marker in TANGLISH_MARKERS)
    if tanglish_hits >= 2 and tanglish_hits > singlish_hits:
        return "ta"
    if singlish_hits >= 2:
        return "si"
    try:
        lang = detect(text)
        if lang in ("si", "ta", "en"):
            return lang
    except Exception:
        pass
    return "en"


def get_language_name(code: str) -> str:
    return {"si": "Sinhala", "ta": "Tamil", "en": "English"}.get(code, "English")
