import unittest

from agent.language import detect_language


class LanguageTest(unittest.TestCase):
    def test_detects_romanized_singlish_as_sinhala(self):
        self.assertEqual(detect_language("hello machan mage wifet aahu una mama iiye raa beela enakota"), "si")

    def test_detects_romanized_tanglish_as_tamil(self):
        self.assertEqual(detect_language("anna wife kitta konjam kovam irukku da, na yesterday late ah vandhen"), "ta")


if __name__ == "__main__":
    unittest.main()
