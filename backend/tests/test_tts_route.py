import unittest
from fastapi import HTTPException

from routes.tts import TTSRequest, _validate_tts_request
from tts_service import build_ssml, normalize_tts_language


class TTSRouteTest(unittest.TestCase):
    def test_normalizes_supported_languages(self):
        self.assertEqual(normalize_tts_language("si"), "si")
        self.assertEqual(normalize_tts_language("ta"), "ta")
        self.assertEqual(normalize_tts_language("fr"), "en")

    def test_rejects_empty_or_oversized_text(self):
        with self.assertRaises(HTTPException):
            _validate_tts_request(TTSRequest(text="   ", language="en"))
        with self.assertRaises(HTTPException):
            _validate_tts_request(TTSRequest(text="x" * 321, language="en"))

    def test_builds_ssml_with_expected_voice(self):
        ssml = build_ssml("hello", "ta")
        self.assertIn("ta-LK-SaranyaNeural", ssml)
        self.assertIn("hello", ssml)


if __name__ == "__main__":
    unittest.main()
