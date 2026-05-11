from __future__ import annotations

from enum import StrEnum


class Language(StrEnum):
    DE = "de"
    AR = "ar"
    FR = "fr"
    EN = "en"


class AgeRange(StrEnum):
    YOUNG = "3-5"
    MIDDLE = "5-8"
    OLDER = "8-10"


class BookTheme(StrEnum):
    ANIMALS = "animals"
    ADVENTURE = "adventure"
    FRIENDSHIP = "friendship"
    NATURE = "nature"
    CULTURE = "culture"
    VALUES = "values"
