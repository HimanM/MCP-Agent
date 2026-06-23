import unittest
from fastapi import HTTPException

from routes.tts import TTSRequest, _validate_tts_request
from tts_service import build_tts_payload, normalize_tts_language


class TTSRouteTest(unittest.TestCase):
    def test_normalizes_supported_languages(self):
        self.assertEqual(normalize_tts_language("ta"), "ta")
        self.assertEqual(normalize_tts_language("si"), "en")
        self.assertEqual(normalize_tts_language("fr"), "en")

    def test_rejects_empty_or_oversized_text(self):
        with self.assertRaises(HTTPException):
            _validate_tts_request(TTSRequest(text="   ", language="en"))
        with self.assertRaises(HTTPException):
            _validate_tts_request(TTSRequest(text="x" * 1201, language="en"))

    def test_builds_payload_with_expected_language(self):
        payload = build_tts_payload("hello", "ta")
        self.assertEqual(payload["language_code"], "ta")
        self.assertEqual(payload["text"], "hello")


if __name__ == "__main__":
    unittest.main()
