import json
import os
import subprocess
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from tattvix.settings import (
    DEV_INSECURE_SECRET_KEY,
    build_database_config,
    validate_production_settings,
)

SUPABASE_POOLER_URL = "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
SERVER_DIR = Path(__file__).resolve().parents[2]
BROWSABLE_RENDERER = "rest_framework.renderers.BrowsableAPIRenderer"


def renderer_classes_for_debug(debug: str) -> list[str]:
    # tattvix.settings enforces production env requirements at import time
    # and cannot be re-imported safely in-process, so import it in a fresh
    # interpreter with the given DJANGO_DEBUG value.
    env = {
        **os.environ,
        "DJANGO_DEBUG": debug,
        "DJANGO_SECRET_KEY": "a-sufficiently-long-random-production-secret",
        "DJANGO_ALLOWED_HOSTS": "example.com",
        "OBJECT_STORAGE_ENDPOINT_URL": "https://storage.example.com",
        "OBJECT_STORAGE_SECRET_ACCESS_KEY": "a-production-object-storage-secret",
    }
    code = (
        "import json; from tattvix.settings import REST_FRAMEWORK; "
        "print(json.dumps(REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES']))"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=SERVER_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


class RendererSettingsTests(SimpleTestCase):
    def test_browsable_api_renderer_is_absent_when_debug_is_false(self):
        renderers = renderer_classes_for_debug("false")

        self.assertIn("rest_framework.renderers.JSONRenderer", renderers)
        self.assertNotIn(BROWSABLE_RENDERER, renderers)

    def test_browsable_api_renderer_is_present_when_debug_is_true(self):
        renderers = renderer_classes_for_debug("true")

        self.assertIn(BROWSABLE_RENDERER, renderers)


class BuildDatabaseConfigTests(SimpleTestCase):
    def test_default_keeps_persistent_connections_and_server_side_cursors(self):
        config = build_database_config(
            SUPABASE_POOLER_URL, ssl_require=True, transaction_pooler=False
        )

        self.assertEqual(config["CONN_MAX_AGE"], 60)
        self.assertFalse(config.get("DISABLE_SERVER_SIDE_CURSORS", False))
        self.assertEqual(config["OPTIONS"]["sslmode"], "require")

    def test_transaction_pooler_drops_state_that_does_not_survive_pooling(self):
        # In transaction mode each transaction may land on a different
        # backend: named cursors and held connections both break.
        config = build_database_config(
            SUPABASE_POOLER_URL, ssl_require=True, transaction_pooler=True
        )

        self.assertEqual(config["CONN_MAX_AGE"], 0)
        self.assertTrue(config["DISABLE_SERVER_SIDE_CURSORS"])
        self.assertNotIn("prepare_threshold", config["OPTIONS"])


class ValidateProductionSettingsTests(SimpleTestCase):
    def test_debug_mode_skips_all_checks(self):
        # Dev defaults are fine when DEBUG=True; nothing should raise.
        validate_production_settings(
            debug=True,
            secret_key=DEV_INSECURE_SECRET_KEY,
            allowed_hosts_env=None,
        )

    def test_dev_secret_key_in_production_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_production_settings(
                debug=False,
                secret_key=DEV_INSECURE_SECRET_KEY,
                allowed_hosts_env="example.com",
            )

    def test_empty_secret_key_in_production_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_production_settings(
                debug=False,
                secret_key="",
                allowed_hosts_env="example.com",
            )

    def test_unset_allowed_hosts_in_production_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_production_settings(
                debug=False,
                secret_key="a-sufficiently-long-random-production-secret",
                allowed_hosts_env=None,
            )

    def test_blank_allowed_hosts_in_production_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_production_settings(
                debug=False,
                secret_key="a-sufficiently-long-random-production-secret",
                allowed_hosts_env="   ",
            )

    def test_valid_production_config_passes(self):
        # Should not raise.
        validate_production_settings(
            debug=False,
            secret_key="a-sufficiently-long-random-production-secret",
            allowed_hosts_env="example.com,www.example.com",
        )
