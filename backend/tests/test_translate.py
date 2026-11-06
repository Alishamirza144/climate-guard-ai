"""Unit tests for ClimateGuard AI Translation router."""

from app.routers.translate import (
    _resolve_translation,
    translate_text,
    translate_batch,
    translate_status,
    TranslateRequest,
    BatchTranslateRequest,
)


def test_resolve_translation_hindi():
    res, engine = _resolve_translation("Flood Risk", "en", "hi")
    assert "बाढ़ जोखिम" in res
    assert engine == "dictionary"

    res_no_threat, eng_no_threat = _resolve_translation("NO ACTIVE FLOOD THREAT", "en", "hi")
    assert "सक्रिय बाढ़ खतरा नहीं" in res_no_threat
    assert eng_no_threat == "dictionary"

    res_latency, _ = _resolve_translation("DATA LATENCY", "en", "hi")
    assert "विलंबता" in res_latency


def test_resolve_translation_marathi():
    res, engine = _resolve_translation("Live Command Hub", "en", "mr")
    assert "नियंत्रण कक्ष" in res
    assert engine == "dictionary"

    res_no_threat, _ = _resolve_translation("NO ACTIVE FLOOD THREAT", "en", "mr")
    assert "पूर धोका नाही" in res_no_threat

    res_routine, _ = _resolve_translation("Routine civic monitoring", "en", "mr")
    assert "देखरेख" in res_routine

    res_weather, _ = _resolve_translation("Mainly clear", "en", "mr")
    assert "स्वच्छ" in res_weather


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
        texts=["Flood Risk", "Heat Risk", "Drainage Risk", "DATA LATENCY", "Backend Response"],
        target_lang="gu",
    )
    resp = translate_batch(req)
    assert "Flood Risk" in resp.translations
    assert "પૂર જોખમ" in resp.translations["Flood Risk"]
    assert "DATA LATENCY" in resp.translations
    assert "ડેટા લેટન્સી" in resp.translations["DATA LATENCY"]


def test_endpoint_translate_status():
    status = translate_status()
    assert status.status == "operational"
    assert status.supported_languages_count == 23
    assert status.dynamic_provider_configured is False
    assert status.google_cloud_configured is False
    assert status.bhashini_configured is False
    assert status.engine == "curated_dictionary_fallback"
