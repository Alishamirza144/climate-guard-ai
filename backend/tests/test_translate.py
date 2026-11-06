"""Unit tests for ClimateGuard AI Translation router."""

from app.routers.translate import (
    _resolve_translation,
    translate_text,
    translate_batch,
    TranslateRequest,
    BatchTranslateRequest,
)


def test_resolve_translation_hindi():
    res, engine = _resolve_translation("Flood Risk", "en", "hi")
    assert "बाढ़ जोखिम" in res
    assert engine == "dictionary"


def test_resolve_translation_marathi():
    res, engine = _resolve_translation("Live Command Hub", "en", "mr")
    assert "नियंत्रण कक्ष" in res
    assert engine == "dictionary"


def test_resolve_translation_cache():
    # First call sets cache
    res1, eng1 = _resolve_translation("Heat Risk", "en", "ta")
    assert eng1 == "dictionary"

    # Second call gets from cache
    res2, eng2 = _resolve_translation("Heat Risk", "en", "ta")
    assert eng2 == "cache"
    assert res1 == res2


def test_endpoint_translate_text():
    req = TranslateRequest(text="Crop Risk", target_lang="bn")
    resp = translate_text(req)
    assert resp.original_text == "Crop Risk"
    assert "ফসল ঝুঁকি" in resp.translated_text
    assert resp.target_lang == "bn"


def test_endpoint_translate_batch():
    req = BatchTranslateRequest(
        texts=["Flood Risk", "Heat Risk", "Drainage Risk"],
        target_lang="gu",
    )
    resp = translate_batch(req)
    assert "Flood Risk" in resp.translations
    assert "પૂર જોખમ" in resp.translations["Flood Risk"]
