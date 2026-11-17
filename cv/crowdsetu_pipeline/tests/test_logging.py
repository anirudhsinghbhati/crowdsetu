import json
import logging

from crowdsetu.logging import JsonFormatter


def test_json_formatter_emits_structured_fields():
    record = logging.LogRecord("test", logging.INFO, __file__, 1, "hello", (), None)
    record.context = {"camera_id": "camera-1"}
    payload = json.loads(JsonFormatter().format(record))
    assert payload["level"] == "INFO"
    assert payload["message"] == "hello"
    assert payload["camera_id"] == "camera-1"
