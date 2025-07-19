#!/usr/bin/env python3
"""Inject <script> tags for chatbot.js & chatbotKey.js into every HTML file
inside docs/ that doesn't already contain them.

Usage:
    python scripts/inject_chatbot_script.py

The script is idempotent – running it multiple times will not duplicate tags.
"""

import pathlib
import re

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS_DIR = PROJECT_ROOT / "docs"

TAG_SNIPPET = (
    "    <script src=\"/js/chatbotKey.js\"></script>\n"
    "    <script defer src=\"/js/chatbot.js\"></script>\n"
)


def inject_into_file(html_path: pathlib.Path) -> bool:
    """Return True if file was modified."""
    text = html_path.read_text(encoding="utf-8")
    if "chatbot.js" in text:
        return False  # already injected

    # Insert immediately before the closing </body> tag (case-insensitive)
    new_text, count = re.subn(
        r"</body>", TAG_SNIPPET + "</body>", text, flags=re.IGNORECASE)
    if count:
        html_path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> None:
    modified = 0
    for html_file in DOCS_DIR.rglob("*.html"):
        if inject_into_file(html_file):
            modified += 1
    print(f"[inject_chatbot_script] Injected tags into {modified} HTML files.")


if __name__ == "__main__":
    main()
