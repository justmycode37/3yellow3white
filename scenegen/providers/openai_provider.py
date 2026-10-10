import os

from openai import OpenAI


class OpenAIProvider:
    def __init__(self, model=None, **_):
        self.client = OpenAI()  # reads OPENAI_API_KEY
        self.model = model or os.environ.get("SCENEGEN_OPENAI_MODEL")
        if not self.model:
            raise ValueError("Set --model or SCENEGEN_OPENAI_MODEL to the GPT model name")

    def complete(self, system, user, name="request"):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
        )
        return response.choices[0].message.content
