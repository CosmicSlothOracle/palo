#!/usr/bin/env python3
"""Generate docs/js/chatbotKey.js containing the Groq API key fetched from the
GROQ_API_KEY environment variable. Intended to run during the build step so
the secret itself never enters the repository.
"""

import os
import sys
import pathlib


def main() -> None:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        print("[generate_chatbot_key] Error: GROQ_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    project_root = pathlib.Path(__file__).resolve().parent.parent
    js_dir = project_root / "docs" / "js"
    js_dir.mkdir(parents=True, exist_ok=True)
    out_file = js_dir / "chatbotKey.js"

    out_file.write_text(
        f"// auto-generated – do not edit\nwindow.GROQ_API_KEY = \"{key}\";\n",
        encoding="utf-8",
    )
    print(
        f"[generate_chatbot_key] Wrote key to {out_file.relative_to(project_root)}")


if __name__ == "__main__":
    main()
