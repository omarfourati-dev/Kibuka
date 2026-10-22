"""Texte der Sprach-Landingpages /ar, /fr, /en.

Muttersprachlich formuliert, nicht wörtlich aus dem Deutschen übersetzt —
Zielgruppe sind mehrsprachige Familien, die in ihrer Herkunftssprache
suchen. Nur belegbare Fakten (keine Bewertungen, keine Nutzerzahlen).

Platzhalter in Texten: {single}, {monthly}, {yearly} (fertig formatierte
Preise) und {trial} (Testphase inkl. Einheit, z. B. „14 jours“).
"""

from __future__ import annotations

from dataclasses import dataclass

from ....core.domain.value_objects.language import Language


@dataclass(frozen=True)
class LandingCopy:
    title: str
    description: str
    h1: str
    intro: str
    benefits: tuple[str, ...]
    nav: tuple[str, str, str]  # Start, Bibliothek, Preise
    languages_label: str
    daily_heading: str
    daily_note: str
    books_heading: str
    ages: str  # {low}, {high}
    cta: str
    library_link: str
    faq_heading: str
    faq: tuple[tuple[str, str], ...]


OG_LOCALES: dict[Language, str] = {
    Language.DE: "de_DE",
    Language.AR: "ar_AR",
    Language.FR: "fr_FR",
    Language.EN: "en_US",
}

# Name jeder Sprache in ihrer eigenen Sprache (Sprachumschalter, llms.txt)
NATIVE_NAMES: dict[Language, str] = {
    Language.DE: "Deutsch",
    Language.AR: "العربية",
    Language.FR: "Français",
    Language.EN: "English",
}


def money(lang: Language, value: float) -> str:
    amount = f"{value:.2f}"
    if lang == Language.AR:
        return f"{amount} يورو"
    if lang == Language.EN:
        return f"€{amount}"
    return f"{amount.replace('.', ',')} €"


def trial_period(lang: Language, days: int) -> str:
    if lang == Language.AR:
        # Arabische Zahlwort-Kongruenz: 1 / 2 / 3–10 / ab 11 unterschiedlich
        if days == 1:
            return "يوم واحد"
        if days == 2:
            return "يومان"
        return f"{days} أيام" if 3 <= days <= 10 else f"{days} يومًا"
    if lang == Language.FR:
        return f"{days} jour" if days == 1 else f"{days} jours"
    return f"{days} day" if days == 1 else f"{days} days"


COPY: dict[Language, LandingCopy] = {
    Language.AR: LandingCopy(
        title="Kibuka – قصص أطفال بالعربية: قصة مصوّرة جديدة كل يوم",
        description=(
            "كل يوم قصة مصوّرة جديدة للأطفال من 3 إلى 10 سنوات، تُقرأ بصوت مسموع "
            "بالعربية والألمانية والفرنسية والإنجليزية. مثالية للعائلات متعددة اللغات."
        ),
        h1="قصة أطفال جديدة كل يوم – بالعربية والألمانية والفرنسية والإنجليزية",
        intro=(
            "كيبوكا (Kibuka) رفيق العائلات التي تعيش بأكثر من لغة: كل يوم يصدر كتاب "
            "مصوّر جديد للأطفال من 3 إلى 10 سنوات، يُقرأ بصوت مسموع بأربع لغات، وتُبرَز "
            "كل كلمة لحظة نطقها. هكذا يبقى طفلك قريبًا من العربية وهو يكبر مع لغات أخرى."
        ),
        benefits=(
            "قصة واحدة بأربع لغات: انتقل بين العربية والألمانية والفرنسية والإنجليزية بلمسة واحدة.",
            "قراءة صوتية مع إبراز الكلمات واحدةً تلو الأخرى، ليتابع طفلك النص بنفسه.",
            "النص العربي يُعرض من اليمين إلى اليسار بخط واضح ومريح للقراءة.",
            "قصة اليوم مجانية.",
            "لا إعلانات أثناء القراءة أبدًا.",
        ),
        nav=("الرئيسية", "المكتبة", "الأسعار"),
        languages_label="اللغات:",
        daily_heading="قصة اليوم:",
        daily_note="مجانية اليوم – للقراءة والاستماع.",
        books_heading="قصص جديدة",
        ages="من {low} إلى {high} سنوات",
        cta="اشتراك ابتداءً من {monthly} شهريًا – مع تجربة مجانية لمدة {trial}",
        library_link="تصفّح المكتبة كاملة",
        faq_heading="أسئلة شائعة",
        faq=(
            (
                "ما هو كيبوكا؟",
                "كيبوكا تطبيق قراءة للأطفال من 3 إلى 10 سنوات: كل يوم يصدر كتاب مصوّر "
                "جديد برسوم من إنتاج الذكاء الاصطناعي، يُقرأ بصوت مسموع بالعربية "
                "والألمانية والفرنسية والإنجليزية، مع إبراز الكلمات واحدةً تلو الأخرى.",
            ),
            (
                "هل يناسب كيبوكا العائلات ثنائية اللغة؟",
                "نعم، فهذا هو الهدف منه: كل قصة متوفرة باللغات الأربع، ويمكن التبديل "
                "بينها بلمسة واحدة، فيسمع الطفل القصة نفسها بلغة البيت وبلغة المدرسة.",
            ),
            (
                "كم يكلّف كيبوكا؟",
                "قصة اليوم مجانية. سعر الكتاب الواحد {single}، والاشتراك الذي يشمل جميع "
                "الكتب {monthly} شهريًا أو {yearly} سنويًا، شاملًا ضريبة القيمة المضافة.",
            ),
            (
                "هل يمكنني إلغاء الاشتراك؟",
                "نعم، في أي وقت ودون مدة التزام، مباشرةً من ملفك الشخصي. ويبدأ الاشتراك "
                "الأول بفترة تجربة مجانية مدتها {trial}.",
            ),
            (
                "هل توجد إعلانات؟",
                "لا إعلانات أبدًا أثناء القراءة، ومع الاشتراك يصبح كيبوكا خاليًا تمامًا من الإعلانات.",
            ),
            (
                "على أي أجهزة يعمل كيبوكا؟",
                "في متصفح الإنترنت (ويمكن تثبيته كتطبيق)، وعلى أجهزة أندرويد وآيفون.",
            ),
        ),
    ),
    Language.FR: LandingCopy(
        title="Kibuka – Livres pour enfants bilingues : une histoire par jour",
        description=(
            "Chaque jour, une nouvelle histoire illustrée à lire et à écouter en français, "
            "arabe, allemand et anglais. Pour les familles multilingues, de 3 à 10 ans."
        ),
        h1="Une nouvelle histoire pour enfants chaque jour – en français, arabe, "
        "allemand et anglais",
        intro=(
            "Kibuka accompagne les familles qui vivent en plusieurs langues : chaque "
            "jour paraît un nouveau livre illustré pour les 3–10 ans, lu à voix haute dans "
            "quatre langues, avec chaque mot mis en surbrillance au moment où il est "
            "prononcé. Idéal pour faire vivre la langue de la maison au quotidien."
        ),
        benefits=(
            "Une histoire, quatre langues : passez du français à l’arabe, à l’allemand "
            "ou à l’anglais d’un simple geste.",
            "Lecture audio avec surlignage mot à mot, pour que votre enfant suive le texte "
            "par lui-même.",
            "L’histoire du jour est offerte.",
            "Jamais de publicité pendant la lecture.",
        ),
        nav=("Accueil", "Bibliothèque", "Tarifs"),
        languages_label="Langues :",
        daily_heading="L’histoire du jour :",
        daily_note="Gratuite aujourd’hui – à lire et à écouter.",
        books_heading="Nouvelles histoires",
        ages="{low} à {high} ans",
        cta="Abonnement dès {monthly} par mois – {trial} d’essai gratuit",
        library_link="Voir toute la bibliothèque",
        faq_heading="Questions fréquentes",
        faq=(
            (
                "Qu’est-ce que Kibuka ?",
                "Kibuka est une application de lecture pour les enfants de 3 à 10 ans : "
                "chaque jour paraît un nouveau livre illustré par IA, lu à voix haute en "
                "français, en arabe, en allemand et en anglais, avec le texte surligné mot "
                "à mot.",
            ),
            (
                "Kibuka convient-il aux familles bilingues ?",
                "Oui, c’est même sa raison d’être : chaque histoire existe dans les "
                "quatre langues et l’on passe de l’une à l’autre d’un geste. Votre enfant "
                "entend ainsi la même histoire dans la langue de la maison et dans celle "
                "de l’école.",
            ),
            (
                "Combien coûte Kibuka ?",
                "L’histoire du jour est gratuite. Un livre à l’unité coûte {single}, "
                "l’abonnement à tous les livres {monthly} par mois ou {yearly} par an, "
                "TVA comprise.",
            ),
            (
                "Puis-je résilier l’abonnement ?",
                "Oui, à tout moment et sans durée minimale, directement depuis votre "
                "profil. Le premier abonnement commence par {trial} d’essai gratuit.",
            ),
            (
                "Y a-t-il de la publicité ?",
                "Jamais pendant la lecture. Avec un abonnement, Kibuka est entièrement "
                "sans publicité.",
            ),
            (
                "Sur quels appareils fonctionne Kibuka ?",
                "Dans le navigateur (installable comme une application), sur Android et sur iOS.",
            ),
        ),
    ),
    Language.EN: LandingCopy(
        title="Kibuka – Bilingual Children’s Books, a New Story Every Day",
        description=(
            "A new illustrated children’s story every day, read aloud in English, German, "
            "Arabic and French. Made for multilingual families with kids aged 3 to 10."
        ),
        h1="A new children’s story every day – in English, German, Arabic and French",
        intro=(
            "Kibuka is made for families who live in more than one language. Every day "
            "there’s a new illustrated book for children aged 3 to 10, read aloud in four "
            "languages, with each word highlighted as it’s spoken – so your child can "
            "follow along and keep every family language alive."
        ),
        benefits=(
            "One story, four languages: switch between English, German, Arabic and French "
            "with a single tap.",
            "Read-aloud audio with word-by-word highlighting, so children can follow the "
            "text on their own.",
            "Today’s story is free.",
            "No ads while your child is reading – ever.",
        ),
        nav=("Home", "Library", "Pricing"),
        languages_label="Languages:",
        daily_heading="Today’s story:",
        daily_note="Free to read and listen to today.",
        books_heading="New stories",
        ages="ages {low}–{high}",
        cta="Subscribe from {monthly} a month – try it free for {trial}",
        library_link="Browse the full library",
        faq_heading="Frequently asked questions",
        faq=(
            (
                "What is Kibuka?",
                "Kibuka is a reading app for children aged 3 to 10. Every day a new "
                "AI-illustrated picture book is published and read aloud in English, "
                "German, Arabic and French, with the text highlighted word by word.",
            ),
            (
                "Is Kibuka good for bilingual families?",
                "That’s exactly who it’s for. Every story is available in all four "
                "languages and you can switch with one tap, so children hear the same "
                "story in their home language and in the language they use at school.",
            ),
            (
                "How much does Kibuka cost?",
                "Today’s story is free. Single books cost {single}; a subscription with "
                "every book costs {monthly} a month or {yearly} a year, VAT included.",
            ),
            (
                "Can I cancel my subscription?",
                "Yes, any time and with no minimum term, right from your profile. Your "
                "first subscription starts with a free trial of {trial}.",
            ),
            (
                "Are there ads?",
                "Never while your child is reading. With a subscription, Kibuka is "
                "completely ad-free.",
            ),
            (
                "Which devices does Kibuka work on?",
                "In any web browser (you can install it like an app), on Android and on iOS.",
            ),
        ),
    ),
}
