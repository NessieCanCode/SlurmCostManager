import os
import tempfile
import unittest
from unittest import mock
import logging

from invoice import _load_profile


class LoadProfileTests(unittest.TestCase):
    def test_missing_file_returns_empty_profile(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(_load_profile(td), {})

    def test_invalid_json_logs_error(self):
        with tempfile.TemporaryDirectory() as td:
            path = os.path.join(td, "institution.json")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write("{invalid")
            with self.assertLogs(level="ERROR") as cm:
                self.assertEqual(_load_profile(td), {})
            self.assertIn("Failed to parse", cm.output[0])

    def test_os_error_logs_error(self):
        with tempfile.TemporaryDirectory() as td:
            with mock.patch("builtins.open", side_effect=PermissionError("denied")):
                with self.assertLogs(level="ERROR") as cm:
                    self.assertEqual(_load_profile(td), {})
        self.assertIn("Unable to read", cm.output[0])


if __name__ == "__main__":
    unittest.main()
