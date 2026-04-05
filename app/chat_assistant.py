import json
import os
import re
import ssl
import urllib.error
import urllib.request
from typing import Any

import certifi

MAX_USER_MESSAGE_LEN = 2000
MAX_MESSAGES = 24

MISTRAL_CONVERSATIONS_URL = "https://api.mistral.ai/v1/conversations"
MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions"


def _https_context() -> ssl.SSLContext:
    """Use Mozilla’s CA bundle via certifi (fixes macOS Python SSL: CERTIFICATE_VERIFY_FAILED)."""
    return ssl.create_default_context(cafile=certifi.where())


def _normalize_secret(value: str | None) -> str:
    """Strip whitespace and optional surrounding quotes from .env values."""
    if not value:
        return ""
    s = value.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        s = s[1:-1].strip()
    return s


def _build_learn_system_prompt() -> str:
    return "\n".join(
        [
            "You are a concise educational assistant on a Learn page about sun exposure, UV, and skin cancer "
            "awareness (hackathon / public education context).",
            "The user is on a static Learn page (no photo was uploaded on this screen). "
            "Do not invent facial-scan results; ignore placeholder fields in JSON if present.",
            "Answer questions about: SPF and broad-spectrum sunscreen, UVA/UVB, reapplication, UV index, shade, "
            "hats/clothing, cumulative vs single-burn risk, and when to see a dermatologist.",
            "Rules: Never diagnose or prescribe. Encourage clinicians for changing moles, non-healing sores, "
            "severe pain, or anything worrying.",
            "Plain language; about 180 words max unless the user asks for more detail.",
            "Reply in plain text only; do not use markdown (no asterisk-based bold or italic).",
        ]
    )


def _build_system_prompt(scan_context: dict[str, Any]) -> str:
    if scan_context.get("context_mode") == "learn":
        return _build_learn_system_prompt()

    parts = [
        "You are a concise, friendly educational assistant for a hackathon skincare / UV-awareness demo.",
        "The user just ran a non-clinical photo scan (machine-learning demo, not a medical device).",
        "Rules: Never diagnose, prescribe medication, or claim certainty. Encourage seeing a clinician or "
        "dermatologist for changing moles, severe pain, infection signs, or anything worrying.",
        "Explain terms in plain language. Keep replies under about 180 words unless the user asks for detail.",
        "Reply in plain text only; do not use markdown (no asterisk-based bold or italic).",
        "",
        "How to use the scan JSON below:",
        "- For oily vs dry tendency from THIS photo, rely only on the human-readable `moisture_hint` string.",
        "- Treat `top_label` and `confidence` as an unreliable classifier guess (often wrong on random photos; "
        "labels can even be misspelled). Do NOT present them as proof of the user's skin type or condition.",
        "- Do not quote `top_label` or percentages as the reason their skin is oily/dry unless you also say it is "
        "only a rough demo signal and may be incorrect.",
        "",
        "If the user asks why skin is oily (or dry) in general, explain common factors: sebum production, "
        "genetics, hormones, heat/humidity, overwashing or harsh products, stress, and that oiliness varies by "
        "zone (e.g. T-zone). Suggest gentle non-comedogenic routines in general terms; a dermatologist can assess "
        "their skin properly.",
        "",
        "Scan context (demo outputs — may be inaccurate):",
        json.dumps(scan_context, indent=2),
    ]
    return "\n".join(parts)


def _http_post_json(url: str, payload: dict[str, Any], bearer: str, timeout: int = 90) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bearer}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_https_context()) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode()
        except OSError:
            err_body = str(e)
        raise RuntimeError(f"Mistral HTTP {e.code}: {err_body[:500]}") from e


def _mistral_outputs_to_text(raw: dict[str, Any]) -> str:
    outs = raw.get("outputs")
    if not isinstance(outs, list):
        return ""
    parts: list[str] = []
    for item in outs:
        if isinstance(item, str):
            parts.append(item)
            continue
        if not isinstance(item, dict):
            continue
        c = item.get("content")
        if isinstance(c, str) and c.strip():
            parts.append(c.strip())
        elif isinstance(c, list):
            for block in c:
                if isinstance(block, dict):
                    if block.get("type") == "text" and isinstance(block.get("text"), str):
                        parts.append(block["text"].strip())
    return "\n\n".join(parts).strip()


def _messages_to_mistral_entries(messages: list[dict[str, str]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for m in messages:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        entries.append(
            {
                "object": "entry",
                "type": "message.input",
                "role": role,
                "content": content,
                "prefix": False,
            }
        )
    return entries


def _parse_mistral_agent_version() -> int | str | None:
    raw = (os.environ.get("MISTRAL_AGENT_VERSION") or "0").strip()
    if not raw:
        return None
    if raw.lstrip("-").isdigit():
        return int(raw)
    return raw


def _mistral_agent_reply(
    system_prompt: str,
    messages: list[dict[str, str]],
    *,
    api_key: str,
    agent_id: str,
) -> str:
    entries = _messages_to_mistral_entries(messages)
    if not entries:
        raise RuntimeError("No valid messages for Mistral agent")

    payload: dict[str, Any] = {
        "agent_id": agent_id,
        "instructions": system_prompt,
        "inputs": entries,
        "stream": False,
        "store": True,
        "handoff_execution": "server",
    }
    ver = _parse_mistral_agent_version()
    if ver is not None:
        payload["agent_version"] = ver

    raw = _http_post_json(MISTRAL_CONVERSATIONS_URL, payload, api_key)
    text = _mistral_outputs_to_text(raw)
    if not text:
        raise RuntimeError(f"Empty Mistral agent outputs: {json.dumps(raw)[:300]}")
    return text


def _mistral_chat_reply(
    system_prompt: str,
    messages: list[dict[str, str]],
    *,
    api_key: str,
) -> str:
    model = (os.environ.get("MISTRAL_MODEL") or "mistral-small-latest").strip()
    api_messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for m in messages:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        api_messages.append({"role": role, "content": content})

    payload = {
        "model": model,
        "messages": api_messages,
        "max_tokens": 900,
        "temperature": 0.55,
    }
    raw = _http_post_json(MISTRAL_CHAT_URL, payload, api_key)
    try:
        return raw["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError("Unexpected Mistral chat response shape") from e


def _openai_reply(
    system_prompt: str,
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
) -> str:
    api_key = _normalize_secret(os.environ.get("OPENAI_API_KEY"))
    if not api_key:
        raise RuntimeError("OpenAI API key not configured")

    use_model = (model or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()

    api_messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for m in messages:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        api_messages.append({"role": role, "content": content})

    payload = {
        "model": use_model,
        "messages": api_messages,
        "max_tokens": 900,
        "temperature": 0.55,
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=90, context=_https_context()) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode()
        except OSError:
            err_body = str(e)
        raise RuntimeError(f"OpenAI HTTP {e.code}: {err_body[:400]}") from e

    try:
        return raw["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError("Unexpected OpenAI response shape") from e


def _demo_reply(user_text: str, scan_context: dict[str, Any]) -> str:
    t = user_text.lower()
    moisture = str(scan_context.get("moisture_hint", "")).lower()
    sun = str(scan_context.get("sunburn_degree", "")).lower()

    if any(w in t for w in ("sunscreen", "spf", "sun screen")):
        return (
            "For daily face use, many people do well with a broad-spectrum SPF 30+ and reapplication "
            "every ~2 hours outdoors (or after swimming/sweating). Hats and shade help too. "
            "This demo can’t tell if you’re burned—see a clinician if you have blistering, fever, or severe pain."
        )
    if "dry" in t or "moistur" in t:
        hint = (
            "Your scan hint leans dry—gentle cleanser and moisturizer can help comfort. "
            if "dry" in moisture
            else "If skin feels tight or flaky, a simple fragrance-free moisturizer after cleansing is a common approach. "
        )
        return hint + "Persistent or painful dryness is worth discussing with a clinician."
    if "oil" in t or "acne" in t or "pimple" in t:
        return (
            "If the demo leaned oily, lighter, non-comedogenic products are a common starting point—but "
            "that’s not a diagnosis. For acne that’s painful, scarring, or not improving, a dermatologist can help."
        )
    if any(w in t for w in ("burn", "sunburn", "red", "hurt")):
        return (
            f"The demo labeled sun-stress band as “{sun}”—that’s only a color heuristic, not a burn diagnosis. "
            "Cool compresses, hydration, and avoiding more UV can help mild irritation. Seek care for severe "
            "pain, widespread blisters, fever, confusion, or infection signs."
        )
    if any(w in t for w in ("doctor", "dermat", "when should")):
        return (
            "See a clinician promptly for rapidly changing moles, spreading redness, pus, fever, severe pain, "
            "or anything that worries you. This chat is educational only."
        )

    if scan_context.get("context_mode") == "learn":
        return (
            "I’m in offline demo mode — add `MISTRAL_API_KEY` or `OPENAI_API_KEY` to the Flask `.env` and restart "
            "`python run.py` for AI answers. General tips: SPF 30+ broad-spectrum, reapply ~2 hours outside, "
            "shade during peak UV, and see a clinician for changing moles or urgent skin issues."
        )

    top = scan_context.get("top_label") or "n/a"
    return (
        "Thanks for your question. I’m running in demo mode without a configured AI key—"
        "so I can only give general tips. On the API server, set `MISTRAL_API_KEY` (and `MISTRAL_AGENT_ID` for a "
        "Mistral Agent, or omit the agent id to use `mistral-small-latest` chat), or `OPENAI_API_KEY` for OpenAI.\n\n"
        f"From your scan snapshot, the model’s top label was “{top}” (often unreliable on random photos). "
        "Use the oily/dry hint and sun-stress band on the page as story elements, not medical facts. "
        "What would you like to know next—sunscreen routine, dry skin basics, or when to see a doctor?"
    )


def sanitize_messages(raw: Any) -> tuple[list[dict[str, str]], str | None]:
    if not isinstance(raw, list):
        return [], "messages must be a JSON array"
    out: list[dict[str, str]] = []
    for item in raw[-MAX_MESSAGES:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        content = content.strip()
        if not content:
            continue
        content = content[:MAX_USER_MESSAGE_LEN]
        if not re.search(r"\S", content):
            continue
        out.append({"role": role, "content": content})
    if not out:
        return [], "send at least one user or assistant message"
    if out[-1]["role"] != "user":
        return [], "last message must be from the user"
    return out, None


def _last_user_text(messages: list[dict[str, str]]) -> str:
    return next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")


def _call_llm(system: str, messages: list[dict[str, str]]) -> str:
    """Prefer Mistral (agent or chat), then OpenAI."""
    mistral_key = _normalize_secret(os.environ.get("MISTRAL_API_KEY"))
    if mistral_key:
        agent_id = _normalize_secret(os.environ.get("MISTRAL_AGENT_ID"))
        if agent_id:
            try:
                return _mistral_agent_reply(
                    system, messages, api_key=mistral_key, agent_id=agent_id
                )
            except RuntimeError as e:
                # Valid keys sometimes fail on Agents beta (401/403); chat API may still work.
                err = str(e)
                if "HTTP 401" in err or "HTTP 403" in err:
                    return _mistral_chat_reply(system, messages, api_key=mistral_key)
                raise
        return _mistral_chat_reply(system, messages, api_key=mistral_key)

    openai_key = _normalize_secret(os.environ.get("OPENAI_API_KEY"))
    if openai_key:
        return _openai_reply(system, messages)

    raise RuntimeError("no_llm_key")


def run_chat(scan_context: dict[str, Any], messages: list[dict[str, str]]) -> str:
    system = _build_system_prompt(scan_context)
    try:
        return _call_llm(system, messages)
    except RuntimeError as e:
        if str(e) == "no_llm_key":
            return _demo_reply(_last_user_text(messages), scan_context)
        return (
            _demo_reply(_last_user_text(messages), scan_context)
            + "\n\n—\n_Smart replies hit an error; showing demo text instead._ "
            + f"({e})"
        )
    except OSError as e:
        return (
            _demo_reply(_last_user_text(messages), scan_context)
            + "\n\n—\n_Smart replies are offline right now; showing demo text instead._ "
            + f"(Network error: {e})"
        )
