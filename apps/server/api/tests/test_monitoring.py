from secrets import token_urlsafe

from django.test import SimpleTestCase

from tattvix.monitoring import sentry_init_options, scrub_event

RAW_TOKEN = token_urlsafe(32)


class ScrubEventTests(SimpleTestCase):
    def test_check_in_token_is_redacted_from_request_url(self):
        event = {
            "request": {
                "url": f"https://api.tattwix.in/api/check-in/{RAW_TOKEN}/submit/",
                "method": "POST",
            }
        }

        scrubbed = scrub_event(event, {})

        self.assertEqual(
            scrubbed["request"]["url"],
            "https://api.tattwix.in/api/check-in/[token]/submit/",
        )

    def test_request_payload_cookies_headers_and_query_are_dropped(self):
        event = {
            "request": {
                "url": "https://api.tattwix.in/api/me/",
                "data": {"document_number": "1234 5678 9012"},
                "cookies": {"__session": "secret"},
                "headers": {"Authorization": "Bearer secret"},
                "query_string": f"redirect=/check-in/{RAW_TOKEN}",
                "env": {"REMOTE_ADDR": "203.0.113.9"},
            }
        }

        request = scrub_event(event, {})["request"]

        for key in ("data", "cookies", "headers", "query_string", "env"):
            self.assertNotIn(key, request)

    def test_breadcrumb_urls_and_messages_are_redacted(self):
        event = {
            "breadcrumbs": {
                "values": [
                    {"data": {"url": f"/api/check-in/{RAW_TOKEN}/"}},
                    {"message": f"GET /api/check-in/{RAW_TOKEN}/ 404"},
                ]
            }
        }

        crumbs = scrub_event(event, {})["breadcrumbs"]["values"]

        self.assertNotIn(RAW_TOKEN, str(crumbs))

    def test_exception_messages_are_redacted(self):
        event = {
            "exception": {
                "values": [{"value": f"Token {RAW_TOKEN} at /check-in/{RAW_TOKEN}"}]
            }
        }

        self.assertNotIn(RAW_TOKEN, str(scrub_event(event, {})))

    def test_logentry_and_transaction_are_redacted(self):
        event = {
            "logentry": {"message": f"lookup /check-in/{RAW_TOKEN}/ failed"},
            "transaction": f"/api/check-in/{RAW_TOKEN}/",
        }

        self.assertNotIn(RAW_TOKEN, str(scrub_event(event, {})))


class SentryInitOptionsTests(SimpleTestCase):
    def test_no_dsn_means_no_sentry(self):
        self.assertIsNone(sentry_init_options(dsn="", environment="production"))

    def test_privacy_defaults_are_locked_down(self):
        options = sentry_init_options(dsn="https://k@o1.ingest.sentry.io/1", environment="production")

        self.assertFalse(options["send_default_pii"])
        # Frame locals in check-in code can hold names and document numbers.
        self.assertFalse(options["include_local_variables"])
        self.assertEqual(options["max_request_body_size"], "never")
        self.assertIs(options["before_send"], scrub_event)
        self.assertIs(options["before_send_transaction"], scrub_event)
        self.assertEqual(options["environment"], "production")

    def test_release_is_included_when_given(self):
        options = sentry_init_options(
            dsn="https://k@o1.ingest.sentry.io/1", environment="preview", release="abc1234"
        )

        self.assertEqual(options["release"], "abc1234")

    def test_release_key_is_omitted_when_none(self):
        options = sentry_init_options(
            dsn="https://k@o1.ingest.sentry.io/1", environment="preview", release=None
        )

        self.assertNotIn("release", options)
