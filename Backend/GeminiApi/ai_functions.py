import os
from google import genai  # pip install -q -U google-genai
from pydantic import BaseModel, Field  # pip install pydantic
from typing import List
import json

# Initialize Gemini client from environment. Prefer an explicit GEMINI_API_KEY_1,
# otherwise use the first key from GEMINI_API_KEYS if provided.
_gemini_key = os.environ.get('GEMINI_API_KEY_1')
if not _gemini_key:
    _list = os.environ.get('GEMINI_API_KEYS')
    if _list:
        parts = [s.strip() for s in _list.split(',') if s.strip()]
        if parts:
            _gemini_key = parts[0]

client = genai.Client(api_key=_gemini_key) if _gemini_key else genai.Client(api_key='API_KEY')
model = "gemini-2.5-flash"


def _ensure_text(resp) -> str:
    """Return response.text as str or raise a clear error."""
    text = getattr(resp, "text", None)
    if text is None:
        raise ValueError("Model response has no text")
    return text


def topic_summarizer(topic: str, content: str) -> str:
    prompt = (
        f"Siz - tájiriyiybeli oqıtıwshı hám analitiksiz. Tómendegi tekstti analizleń hám "
        f"'{topic}' teması boyınsha eń tiykarǵı hám zárúr maǵlıwmatlardı ajıratıp alıń. "
        f"Juwaptı Qaraqalpaq tilinde, túsinikli, logikalıq dizbekte hám qısqasha mazmun (konspekt) kórinisinde jazıp beriń.\n\n"
        f"TEMA: {topic}\n"
        f"TEKST MAZMUNÍ: {content}"
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt
    )

    return _ensure_text(response)


def test_analyze(test_answers: List[dict]) -> str:
    prompt = (
        f"Siz - bilimlendiriw boyınsha ekpertsiz. Tómendegi test nátiyjelerin analizleń. "
        f"Paydalanıwshınıń qaysı temalarda jaqsı ekenligin hám qaysı jerlerde qáteleskenin anıqlań. "
        f"Juwaptı Qaraqalpaq tilinde, doslarsha hám motivaciya beretuǵın usılda jazıń. "
        f"Qáte juwaplar ushın qısqasha túsindirme beriń.\n\n"
        f"TEST JUWAPLARÍ: {test_answers}"
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt
    )

    return _ensure_text(response)


class AnswerAnalyze(BaseModel):
    is_correct: bool = Field(description="Sorawǵa durıs juwap bergen bolsa True, qáte juwap bergen bolsa False.")
    suggestion: str = Field(description="Juwap qáte bolsa ne ushın qáte ekenligi yamasa durıs bolsa ne ushın durıs ekenligi haqqında qısqasha maǵlıwmat.")


def answer_analyze(question: str, answer: str) -> AnswerAnalyze:
    prompt = (
        f"Sizge soraw hám paydalanıwshınıń juwabı beriledi. Sizdiń wazıypańız - juwaptıń faktologik jaqtan durıslıǵın tekseriw. "
        f"Eger juwap durıs bolsa, onı tastıyıqlań. Eger qáte yamasa tolıq emes bolsa, durıs juwaptı hám onıń sebebin Qaraqalpaq tilinde túsindiriń. "
        f"Túsindirme qısqa hám anıq bolsın.\n\n"
        f"SORAW: {question}\n"
        f"PAYDALANÍWSHÍ JUWABÍ: {answer}"
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": AnswerAnalyze.model_json_schema(),
        },
    )

    text = _ensure_text(response)
    return AnswerAnalyze.model_validate_json(text)


class FlashCard(BaseModel):
    title: str = Field(description="Flash-kartanıń teması yamasa atı.")
    description: str = Field(description="Flash-kartanıń mazmunı yamasa anıqlaması.")


def generate_flash_cards(topic: str, content: str) -> List[FlashCard]:
    prompt = (
        f"Berilgen tema hám tekst tiykarında oqıw ushın eń zárúr túsiniklerdi (terminler, sáneler, qaǵıydalar) ajıratıp alıń. "
        f"Hár bir túsinik ushın 'Flash-karta' jaratıń.\n"
        f"- 'Title': Bul termin yamasa qısqasha atı bolsın.\n"
        f"- 'Description': Bul onıń anıq, qısqasha juwabı yamasa anıqlaması bolsın.\n"
        f"Barlıq maǵlıwmat Qaraqalpaq tilinde bolıwı shárt.\n\n"
        f"TEMA: {topic}\n"
        f"MAZMUNÍ: {content}"
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": {
                "type": "array",
                "items": FlashCard.model_json_schema()
            },
        },
    )

    text = _ensure_text(response)
    json_response = json.loads(text)
    return [FlashCard.model_validate(item) for item in json_response]
