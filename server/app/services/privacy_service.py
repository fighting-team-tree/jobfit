import re
from typing import Text, List, Dict

class PrivacyService:
    """
    Implements data privacy and quality checks inspired by NVIDIA NeMo Curator.
    Focuses on PII (Personally Identifiable Information) detection and anonymization
    to ensure data sent to AI models does not contain sensitive personal details.
    """

    def __init__(self):
        # Regex patterns for common PII
        self.patterns = {
            'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'PHONE': r'\b(?:\+?82|0)(?:-?\(?\d{2,3}\)?-?)\d{3,4}-?\d{4}\b', # KR Phone format
            'SSN_LIKE': r'\b\d{6}[-]\d{7}\b', # Resident Registration Number format (basic)
        }

    def scrub(self, text: str) -> str:
        """
        Main method to clean text: removes PII and fixes basic data quality issues.
        Using a 'redaction' strategy compatible with NeMo Curator's PII redaction concepts.
        """
        if not text:
            return ""

        redacted_text = text
        
        # 1. PII Redaction
        for pii_type, pattern in self.patterns.items():
            redacted_text = re.sub(pattern, f"<{pii_type}>", redacted_text)

        # 2. Data Quality: Whitespace Normalization
        redacted_text = " ".join(redacted_text.split())

        return redacted_text

    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        """
        Analyzes text to report what PII was found (for auditing/logging).
        """
        detected = {}
        for pii_type, pattern in self.patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                detected[pii_type] = matches
        return detected

privacy_service = PrivacyService()
