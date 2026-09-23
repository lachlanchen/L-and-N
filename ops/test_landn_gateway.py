import unittest

from ops.landn_gateway import REQUESTS_PER_WINDOW, RateWindow, exact_origin_allowed


class GatewayTests(unittest.TestCase):
    def test_origin_requires_exact_scheme_and_authority(self) -> None:
        allowed = "https://l-and-n.lazying.art"
        self.assertTrue(exact_origin_allowed(f"{allowed}/practice", allowed))
        self.assertFalse(exact_origin_allowed("http://l-and-n.lazying.art", allowed))
        self.assertFalse(exact_origin_allowed("https://l-and-n.lazying.art.evil.test", allowed))
        self.assertFalse(exact_origin_allowed(None, allowed))

    def test_rate_window_is_bounded_and_expires(self) -> None:
        window = RateWindow()
        for index in range(REQUESTS_PER_WINDOW):
            self.assertTrue(window.allow("test", float(index)))
        self.assertFalse(window.allow("test", float(REQUESTS_PER_WINDOW)))
        self.assertTrue(window.allow("test", 61.0))


if __name__ == "__main__":
    unittest.main()


def test_native_app_origins_are_allowed() -> None:
    # The packaged apps load from their own local origin, so they must be
    # allowed or Android has no word recognition at all.
    allowed = landn_gateway.allowed_origins()
    assert "https://l-and-n.lazying.art" in allowed
    assert "https://localhost" in allowed
    assert "capacitor://localhost" in allowed
    assert landn_gateway.exact_origin_allowed("capacitor://localhost", allowed)
    assert not landn_gateway.exact_origin_allowed("https://evil.example", allowed)
