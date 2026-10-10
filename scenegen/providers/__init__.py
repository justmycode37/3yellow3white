"""LLM back ends. Every provider exposes `complete(system, user, name) -> str`.

- claude-code: Claude via the `claude` CLI on your Pro/Max login (no API key).
- anthropic: Claude via the Anthropic SDK (needs an API key).
- openai:    GPT via the OpenAI SDK (planned production back end).
- handoff:   writes the request to a file and reads the answer from a file, so
             any chat assistant (or a person) can play the LLM. No API key needed.
"""


class PendingResponse(Exception):
    """Raised by the handoff provider when a response file is not written yet."""


def get_provider(name, **options):
    if name == "claude-code":
        from .claude_code_provider import ClaudeCodeProvider
        return ClaudeCodeProvider(**options)
    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider(**options)
    if name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(**options)
    if name == "handoff":
        from .handoff_provider import HandoffProvider
        return HandoffProvider(**options)
    raise ValueError(f"Unknown provider {name!r}; choose claude-code, anthropic, openai or handoff")
