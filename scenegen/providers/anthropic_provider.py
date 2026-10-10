import os

import anthropic


class AnthropicProvider:
    def __init__(self, model=None, effort="high", **_):
        # Credentials resolve from ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an
        # `ant auth login` profile.
        self.client = anthropic.Anthropic()
        self.model = model or os.environ.get("SCENEGEN_ANTHROPIC_MODEL", "claude-opus-5-5")
        self.effort = effort

    def complete(self, system, user, name="request"):
        with self.client.beta.messages.stream(
            model=self.model,
            max_tokens=64000,
            system=system,
            output_config={"effort": self.effort},
            # On a safety refusal, the API re-runs the request on a fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": user}],
        ) as stream:
            message = stream.get_final_message()
        if message.stop_reason == "refusal":
            raise RuntimeError(f"{name}: model refused the request")
        if message.stop_reason == "max_tokens":
            raise RuntimeError(f"{name}: response hit max_tokens and is truncated")
        return "".join(b.text for b in message.content if b.type == "text")
