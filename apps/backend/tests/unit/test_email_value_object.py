"""Unit tests for Email value object."""

import pytest

from src.core.domain.value_objects.email import Email


class TestEmailValidation:
    def test_valid_email_accepted(self):
        email = Email("user@example.com")
        assert str(email) == "user@example.com"

    def test_email_with_plus_accepted(self):
        email = Email("user+tag@example.com")
        assert str(email) == "user+tag@example.com"

    def test_email_with_subdomain_accepted(self):
        email = Email("user@mail.example.com")
        assert str(email) == "user@mail.example.com"

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            Email("")

    def test_missing_at_raises(self):
        with pytest.raises(ValueError):
            Email("notanemail")

    def test_missing_domain_raises(self):
        with pytest.raises(ValueError):
            Email("user@")

    def test_missing_tld_raises(self):
        with pytest.raises(ValueError):
            Email("user@domain")

    def test_spaces_raise(self):
        with pytest.raises(ValueError):
            Email("user @example.com")


class TestEmailDomain:
    def test_domain_extracted_correctly(self):
        email = Email("user@example.com")
        assert email.domain == "example.com"

    def test_subdomain_included_in_domain(self):
        email = Email("user@mail.example.com")
        assert email.domain == "mail.example.com"


class TestEmailEquality:
    def test_same_email_is_equal(self):
        assert Email("user@example.com") == Email("user@example.com")

    def test_different_email_not_equal(self):
        assert Email("a@example.com") != Email("b@example.com")

    def test_email_is_hashable(self):
        emails = {Email("user@example.com")}
        assert Email("user@example.com") in emails
