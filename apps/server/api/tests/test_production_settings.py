from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from tattvix.settings import (
    DEV_INSECURE_SECRET_KEY,
    build_database_config,
    validate_production_settings,
)

SUPABASE_POOLER_URL = "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"


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
