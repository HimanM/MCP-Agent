import base64
import unittest

from fastapi import HTTPException

from routes.stt import MAX_AUDIO_BYTES, STTRequest, _validate_stt_request


class STTRouteTest(unittest.TestCase):
    def test_rejects_empty_audio(self):
        with self.assertRaises(HTTPException):
            _validate_stt_request(STTRequest(audio_base64="   ", format="webm"))

    def test_rejects_invalid_format(self):
        with self.assertRaises(HTTPException):
            _validate_stt_request(STTRequest(audio_base64=base64.b64encode(b"ok").decode(), format="exe"))

    def test_rejects_oversized_audio(self):
        payload = STTRequest(
            audio_base64=base64.b64encode(b"x" * (MAX_AUDIO_BYTES + 1)).decode(),
            format="webm",
        )
        with self.assertRaises(HTTPException):
            _validate_stt_request(payload)


if __name__ == "__main__":
    unittest.main()
