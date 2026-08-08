from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from tattvix.settings import DEV_INSECURE_SECRET_KEY, validate_production_settings


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
