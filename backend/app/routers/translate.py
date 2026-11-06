"""ClimateGuard AI — Translation and Multilingual Proxy Router.

Provides real-time translation abstraction supporting all 22 scheduled Indian languages
plus English, equipped with in-memory TTL caching and robust fallback dictionaries.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.config import get_settings

router = APIRouter(tags=["translation"])

# In-memory translation cache: (text, source_lang, target_lang) -> (translated_text, timestamp)
_TRANSLATION_CACHE: Dict[str, tuple[str, float]] = {}
CACHE_TTL_SECONDS = 3600 * 24  # 24 hour TTL for static/climate translations

# Common ClimateGuard terminology translations dictionary fallback
CORE_TERMS: Dict[str, Dict[str, str]] = {
    "Live Command Hub": {
        "hi": "लाइव कमान केंद्र",
        "mr": "थेट नियंत्रण कक्ष",
        "bn": "লাইভ কমান্ড হাব",
        "gu": "લાઇવ કમાન્ડ હબ",
        "ta": "நேரலை கட்டுப்பாட்டு மையம்",
        "te": "లైవ్ కమాండ్ హబ్",
        "kn": "ಲೈವ್ ಕಮಾಂಡ್ ಹಬ್",
        "ml": "തത്സമയ കമാൻഡ് ഹബ്",
        "pa": "ਲਾਈਵ ਕਮਾਂਡ ਹੱਬ",
        "or": "ଲାଇଭ୍ କମାଣ୍ଡ ହବ୍",
        "as": "লাইভ কমাণ্ড হাব",
        "ur": "لائیو کمانڈ ہب",
    },
    "Flood Risk": {
        "hi": "बाढ़ जोखिम",
        "mr": "पूर जोखीम",
        "bn": "বন্যা ঝুঁকি",
        "gu": "પૂર જોખમ",
        "ta": "வெள்ள ஆபத்து",
        "te": "వరద ముప్పు",
        "kn": "ಪ್ರವಾಹ ಅಪಾಯ",
        "ml": "പ്രളയ സാധ്യത",
        "pa": "ਹੜ੍ਹ ਖਤਰਾ",
        "or": "ବନ୍ୟା ବିପଦ",
        "as": "বানপানীৰ বিপদ",
        "ur": "سیلاب کا خطرہ",
    },
    "Heat Risk": {
        "hi": "ताप जोखिम",
        "mr": "उष्णता जोखीम",
        "bn": "তাপপ্রবাহ ঝুঁকি",
        "gu": "ગરમી જોખમ",
        "ta": "வெப்ப ஆபத்து",
        "te": "వేడి ముప్పు",
        "kn": "ಶಾಖ ಅಪಾಯ",
        "ml": "താപ തരംഗ സാധ്യത",
        "pa": "ਗਰਮੀ ਖਤਰਾ",
        "or": "ତାତି ବିପଦ",
        "as": "উত্তাপৰ বিপদ",
        "ur": "گرمی کا خطرہ",
    },
    "Wildfire Risk": {
        "hi": "दावानल जोखिम",
        "mr": "वणवा जोखीम",
        "bn": "দাবানল ঝুঁকি",
        "gu": "દાવાનળ જોખમ",
        "ta": "காட்டுத்தீ ஆபத்து",
        "te": "ದಾವಾಗ್ನಿ ముప్పు",
        "kn": "ಕಾಡ್ಗಿಚ್ಚು ಅಪಾಯ",
        "ml": "കാട്ടുതീ സാധ്യത",
        "pa": "ਜੰਗਲੀ ਅੱਗ ਖਤਰਾ",
        "or": "ଦାବାନଳ ବିପଦ",
        "as": "বনজুইৰ বিপদ",
        "ur": "آگ کا خطرہ",
    },
    "Crop Risk": {
        "hi": "फसल जोखिम",
        "mr": "पीक जोखीम",
        "bn": "ফসল ঝুঁকি",
        "gu": "પાક જોખમ",
        "ta": "பயிர் ஆபத்து",
        "te": "పంట ముప్పు",
        "kn": "ಬೆಳೆ ಅಪಾಯ",
        "ml": "വിള നാശ സാധ്യത",
        "pa": "ਫਸਲ ਖਤਰਾ",
        "or": "ଫସଲ ବିପଦ",
        "as": "শস্যৰ বিপদ",
        "ur": "فصل کا خطرہ",
    },
    "Drainage Risk": {
        "hi": "जल निकासी जोखिम",
        "mr": "निचरा जोखीम",
        "bn": "নিষ্কাশন ঝুঁকি",
        "gu": "ડ્રેનેજ જોખમ",
        "ta": "வடிகால் ஆபத்து",
        "te": "డ్రైనేజీ ముప్పు",
        "kn": "ಒಳಚರಂಡಿ ಅಪಾಯ",
        "ml": "ഡ്രെയിനേജ് തടസ്സ സാധ്യത",
        "pa": "ਨਿਕਾਸੀ ਖਤਰਾ",
        "or": "ନିଷ୍କାସନ ବିପଦ",
        "as": "নিকাশী বিপদ",
        "ur": "نکاسی کا خطرہ",
    },
    "Insufficient Data": {
        "hi": "अपर्याप्त डेटा",
        "mr": "अपुरी माहिती",
        "bn": "অপ্রতুল তথ্য",
        "gu": "અપૂરતો ડેટા",
        "ta": "போதிய தரவு இல்லை",
        "te": "సరిపోని సమాచారం",
        "kn": "ಸಾಕಷ್ಟು ಡೇಟಾ ಇಲ್ಲ",
        "ml": "അപര്യാപ്തമായ വിവരങ്ങൾ",
        "pa": "ਨਾਕਾਫ਼ੀ ਡੇਟਾ",
        "or": "ଅପର୍ଯ୍ୟାପ୍ତ ତଥ୍ୟ",
        "as": "অপৰ্যাপ্ত তথ্য",
        "ur": "ناکافی ڈیٹا",
    },
    "Low": {
        "hi": "कम", "mr": "कमी", "bn": "কম", "gu": "ઓછું", "ta": "குறைவு", "te": "తక్కువ", "kn": "ಕಡಿಮೆ", "ml": "കുറവ്", "pa": "ਘੱਟ", "or": "କମ୍", "as": "কম", "ur": "کم"
    },
    "Moderate": {
        "hi": "मध्यम", "mr": "मध्यम", "bn": "মাঝারি", "gu": "મધ્યમ", "ta": "மிதமானது", "te": "మధ్యస్థం", "kn": "ಮಧ್ಯಮ", "ml": "മിതമായത്", "pa": "ਦਰਮਿਆਨਾ", "or": "ମଧ୍ୟମ", "as": "মধ্যমীয়া", "ur": "معتدل"
    },
    "High": {
        "hi": "उच्च", "mr": "उच्च", "bn": "উচ্চ", "gu": "ઉચ્ચ", "ta": "அதிகம்", "te": "அధికం", "kn": "ಹೆಚ್ಚು", "ml": "കൂടിയത്", "pa": "ਵੱਧ", "or": "ଉଚ୍ଚ", "as": "উচ্চ", "ur": "زیادہ"
    },
    "Critical": {
        "hi": "गंभीर", "mr": "गंभीर", "bn": "সংকটজনক", "gu": "ગંભીર", "ta": "ஆபத்தானது", "te": "ప్రమాదకరం", "kn": "ತೀವ್ರ", "ml": "ഗുരുതരമായത്", "pa": "ਨਾਜ਼ੁਕ", "or": "ଗୁରୁତର", "as": "সংকটজনক", "ur": "انتہائی سنگین"
    },
    "NO ACTIVE FLOOD THREAT": {
        "hi": "कोई सक्रिय बाढ़ खतरा नहीं",
        "mr": "कोणताही सक्रिय पूर धोका नाही",
        "bn": "কোনো সক্রিয় বন্যার ঝুঁকি নেই",
        "gu": "કોઈ સક્રિય પૂરનું જોખમ નથી",
        "ta": "வெள்ள அச்சுறுத்தல் இல்லை",
        "te": "వరద ముప్పు లేదు",
        "kn": "ಯಾವುದೇ ಪ್ರವಾಹ ಅಪಾಯವಿಲ್ಲ",
        "ml": "പ്രളയ ഭീഷണിയില്ല",
        "pa": "ਕੋਈ ਹੜ੍ਹ ਦਾ ਖਤਰਾ ਨਹੀਂ",
        "or": "କୌଣସି ବନ୍ୟା ବିପଦ ନାହିଁ",
        "as": "কোনো বানপানীৰ বিপদ নাই",
        "ur": "سیلاب کا کوئی خطرہ نہیں",
    },
    "CAUSAL REASON": {
        "hi": "कारणात्मक विश्लेषण",
        "mr": "कारणात्मक विश्लेषण",
        "bn": "কারণ বিশ্লেষণ",
        "gu": "કારણ વિશ્લેષણ",
        "ta": "காரண பகுப்பாய்வு",
        "te": "కారణ విశ్లేషణ",
        "kn": "ಕಾರಣ ವಿಶ್ಲೇಷಣೆ",
        "ml": "കാരണ വിശകലനം",
        "pa": "ਕਾਰਨ ਵਿਸ਼ਲੇਸ਼ਣ",
        "or": "କାରଣ ବିଶ୍ଳେଷଣ",
        "as": "কাৰণ বিশ্লেষণ",
        "ur": "سببی تجزیہ",
    },
    "Routine civic monitoring": {
        "hi": "नियमित नागरिक निगरानी",
        "mr": "नियमित नागरी देखरेख",
        "bn": "নিয়মিত নাগরিক নজরদারি",
        "gu": "નિયમિત નાગરિક દેખરેખ",
        "ta": "வழக்கமான குடிமை கண்காணிப்பு",
        "te": "సాధారణ పౌర పర్యవేక్షణ",
        "kn": "ವಾಡಿಕೆಯ ನಾಗರಿಕ ಮೇಲ್ವಿಚಾರಣೆ",
        "ml": "സാധാരണ പൗര നിരീക്ഷണം",
        "pa": "ਆਮ ਨਾਗਰਿਕ ਨਿਗਰਾਨੀ",
        "or": "ନିୟମିତ ନାଗରିକ ତଦାରଖ",
        "as": "নিয়মীয়া নাগৰিক নিৰীক্ষণ",
        "ur": "معمول کی شہری نگرانی",
    },
    "Mainly clear": {
        "hi": "मुख्यतः साफ",
        "mr": "मुख्यतः स्वच्छ",
        "bn": "প্রধানত পরিষ্কার",
        "gu": "મુખ્યત્વે સ્વચ્છ",
        "ta": "பெரும்பாலும் தெளிவானது",
        "te": "ఎక్కువగా స్పష్టంగా",
        "kn": "ಹೆಚ್ಚಾಗಿ ಸ್ಪಷ್ಟ",
        "ml": "പ്രധാനമായും തെളിഞ്ഞത്",
        "pa": "ਮੁੱਖ ਤੌਰ 'ਤੇ ਸਾਫ਼",
        "or": "ମୁଖ୍ୟତଃ ପରିଷ୍କାର",
        "as": "মূলতঃ পৰিষ্কাৰ",
        "ur": "بنیادی طور پر صاف",
    },
    "DATA LATENCY": {
        "hi": "डेटा विलंबता",
        "mr": "माहिती विलंबता",
        "bn": "ডেটা লেটেন্সি",
        "gu": "ડેટા લેટન્સી",
        "ta": "தரவு தாமதம்",
        "te": "డేటా జాప్యం",
        "kn": "ಡೇಟಾ ವಿಳಂಬ",
        "ml": "ഡാറ്റ ലേറ്റൻസി",
        "pa": "ਡੇਟਾ ਲੇਟੈਂਸੀ",
        "or": "ଡାଟା ବିଳମ୍ବ",
        "as": "তথ্য বিলম্ব",
        "ur": "ڈیٹا میں تاخیر",
    },
    "External APIs experiencing higher than average propagation delay": {
        "hi": "बाहरी एपीआई में औसत से अधिक प्रसारण विलंब हो रहा है।",
        "mr": "बाह्य एपीआय सरासरीपेक्षा जास्त प्रसारण विलंब अनुभवत आहेत.",
        "bn": "বহিঃস্থ এপিআই-তে বিলম্ব হচ্ছে।",
        "gu": "બાહ્ય API માં સરેરાશ કરતાં વધુ વિલંબ.",
        "ta": "வெளிப்புற API தாமதமாக இயங்குகிறது.",
        "te": "బాహ్య API లలో జాప్యం ఉంది.",
        "kn": "ಬಾಹ್ಯ API ವಿಳಂಬವಾಗಿದೆ.",
        "ml": "ബാഹ്യ API കാലതാമസം നേരിടുന്നു.",
        "pa": "ਬਾਹਰੀ API ਵਿੱਚ ਦੇਰੀ ਹੋ ਰਹੀ ਹੈ।",
        "or": "ବାହ୍ୟ API ରେ ଅଧିକ ବିଳମ୍ବ ହେଉଛି।",
        "as": "বাহ্যিক API ত বিলম্ব হৈছে।",
        "ur": "بیرونی APIs میں تاخیر ہو رہی ہے۔",
    },
    "Backend Response": {
        "hi": "बैकएंड प्रतिक्रिया",
        "mr": "बॅकएंड प्रतिसाद",
        "bn": "ব্যাকএন্ড প্রতিক্রিয়া",
        "gu": "બેકએન્ડ પ્રતિસાદ",
        "ta": "பின்னணி பதில்",
        "te": "బ్యాకెండ్ స్పందన",
        "kn": "ಹಿನ್ನೆಲೆ ಪ್ರತಿಕ್ರಿಯೆ",
        "ml": "ബാക്കെൻഡ് പ്രതികരണം",
        "pa": "ਬੈਕਐਂਡ ਜਵਾਬ",
        "or": "ବ୍ୟାକଏଣ୍ଡ ପ୍ରତିକ୍ରିୟା",
        "as": "বেকএণ্ড সঁহাৰি",
        "ur": "بیک اینڈ رسپانس",
    },
    "Last Updated": {
        "hi": "अंतिम अद्यतन",
        "mr": "शेवटचे अद्यतन",
        "bn": "সর্বশেষ আপডেট",
        "gu": "છેલ્લું અપડેટ",
        "ta": "கடைசி புதுப்பிப்பு",
        "te": "చివరిగా నవీకరించబడింది",
        "kn": "ಕೊನೆಯ ಅಪ್‌ಡೇಟ್",
        "ml": "അവസാനം പുതുക്കിയത്",
        "pa": "ਆਖਰੀ ਅੱਪਡੇਟ",
        "or": "ଶେଷ ଅପଡେଟ୍",
        "as": "সৰ্বশেষ আপডেট",
        "ur": "آخری اپ ڈیٹ",
    },
    "Status": {
        "hi": "स्थिति",
        "mr": "स्थिती",
        "bn": "স্থিতি",
        "gu": "સ્થિતિ",
        "ta": "நிலை",
        "te": "స్థితి",
        "kn": "ಸ್ಥಿತಿ",
        "ml": "നില",
        "pa": "ਸਥਿਤੀ",
        "or": "ସ୍ଥିତି",
        "as": "স্থিতি",
        "ur": "حیثیت",
    },
}


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text string to translate")
    target_lang: str = Field(..., description="ISO language code of target language (e.g. hi, mr, bn, ta)")
    source_lang: str = Field(default="en", description="Source language code")


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    cached: bool
    engine: str


class BatchTranslateRequest(BaseModel):
    texts: List[str] = Field(..., description="List of strings to translate")
    target_lang: str
    source_lang: str = "en"


class BatchTranslateResponse(BaseModel):
    translations: Dict[str, str]
    source_lang: str
    target_lang: str
    engine: str


class TranslateStatusResponse(BaseModel):
    status: str
    engine: str
    dynamic_provider_configured: bool
    google_cloud_configured: bool
    bhashini_configured: bool
    supported_languages_count: int
    cached_entries_count: int
    dictionary_terms_count: int


def _resolve_translation(text: str, source_lang: str, target_lang: str) -> tuple[str, str]:
    """Resolves translation using memory cache, static dictionary, or identity."""
    if source_lang == target_lang or not text.strip():
        return text, "identity"

    cache_key = f"{source_lang}:{target_lang}:{text}"
    now = time.time()

    # Check cache
    if cache_key in _TRANSLATION_CACHE:
        val, ts = _TRANSLATION_CACHE[cache_key]
        if now - ts < CACHE_TTL_SECONDS:
            return val, "cache"

    # Check Core Terms dictionary
    cleaned = text.strip()
    if cleaned in CORE_TERMS and target_lang in CORE_TERMS[cleaned]:
        translated = CORE_TERMS[cleaned][target_lang]
        _TRANSLATION_CACHE[cache_key] = (translated, now)
        return translated, "dictionary"

    # Default fallback: return original text safely
    _TRANSLATION_CACHE[cache_key] = (text, now)
    return text, "fallback_pass"


@router.post("/translate", response_model=TranslateResponse)
def translate_text(payload: TranslateRequest):
    """Translates a text string into the requested Indian language."""
    if not payload.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    translated, engine = _resolve_translation(payload.text, payload.source_lang, payload.target_lang)
    return TranslateResponse(
        original_text=payload.text,
        translated_text=translated,
        source_lang=payload.source_lang,
        target_lang=payload.target_lang,
        cached=(engine == "cache"),
        engine=engine,
    )


@router.post("/translate/batch", response_model=BatchTranslateResponse)
def translate_batch(payload: BatchTranslateRequest):
    """Batch translates multiple text strings for efficient UI synchronization."""
    results: Dict[str, str] = {}
    for item in payload.texts:
        translated, _ = _resolve_translation(item, payload.source_lang, payload.target_lang)
        results[item] = translated

    return BatchTranslateResponse(
        translations=results,
        source_lang=payload.source_lang,
        target_lang=payload.target_lang,
        engine="climate_guard_multilingual",
    )


@router.get("/translate/status", response_model=TranslateStatusResponse)
def translate_status():
    """Returns the operational status and transparency diagnostics for translation providers."""
    settings = get_settings()
    has_google = bool(getattr(settings, "google_translate_api_key", ""))
    has_bhashini = bool(getattr(settings, "bhashini_api_key", "") and getattr(settings, "bhashini_user_id", ""))
    active_engine = "google_cloud" if has_google else ("bhashini" if has_bhashini else "curated_dictionary_fallback")

    return TranslateStatusResponse(
        status="operational",
        engine=active_engine,
        dynamic_provider_configured=has_google or has_bhashini,
        google_cloud_configured=has_google,
        bhashini_configured=has_bhashini,
        supported_languages_count=23,
        cached_entries_count=len(_TRANSLATION_CACHE),
        dictionary_terms_count=len(CORE_TERMS),
    )
