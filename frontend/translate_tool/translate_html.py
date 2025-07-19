from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator
import os
import re
import json

# Sprachen festlegen: Zielsprachen und ISO-Codes mit zusätzlichen Informationen
LANGUAGES = {
    'de': {'code': 'de', 'name': 'deutsch', 'flag': '🇩🇪'},
    'en': {'code': 'en', 'name': 'english', 'flag': '🇬🇧'},
    'tr': {'code': 'tr', 'name': 'türkçe', 'flag': '🇹🇷'},
    'ru': {'code': 'ru', 'name': 'русский', 'flag': '🇷🇺'},
    'ar': {'code': 'ar', 'name': 'العربية', 'flag': '🇸🇦'},
    # Simple language is manually created and not auto-translated
    'einfach': {'code': 'de', 'name': 'einfache sprache', 'manual': True}
}

# Ausgangsdatei (Deutsch)
INPUT_FILE = "index.html"


def clean_text(text):
    """Remove unnecessary whitespace and clean text for translation."""
    return re.sub(r'\s+', ' ', text).strip()


def translate_text(text, target_lang):
    try:
        # Skip very short or non-text content
        if len(text.strip()) < 2 or not re.search(r'[a-zA-Z]', text):
            return text

        # Clean text before translation
        cleaned_text = clean_text(text)

        # Attempt translation with error handling
        try:
            translated = GoogleTranslator(
                source='auto', target=target_lang).translate(cleaned_text)
            return translated
        except Exception as e:
            print(
                f"Translation error for '{text}': {target_lang} --> {str(e)}")
            return text  # Return original text if translation fails
    except Exception as e:
        print(f"Unexpected error translating '{text}': {str(e)}")
        return text


def translate_html_file(input_file, lang_code, lang_info):
    """Translate an HTML file to the specified language."""
    with open(input_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Parse the HTML
    soup = BeautifulSoup(html_content, 'html.parser')

    # Update the HTML language attribute
    html_tag = soup.find('html')
    if html_tag:
        html_tag['lang'] = lang_info.get('code', lang_code)

    # Update language selector to reflect current language
    language_select = soup.find('select', {'id': 'language'})
    if language_select:
        for option in language_select.find_all('option'):
            if lang_code in option['value'] or (lang_code == 'de' and 'index.html' in option['value']):
                option['selected'] = 'selected'
            else:
                # Remove selected attribute if it exists
                if 'selected' in option.attrs:
                    del option.attrs['selected']

    # Translate text nodes while preserving structure
    for tag in soup.find_all(text=True):
        parent = tag.parent.name
        if parent not in ['script', 'style']:  # Skip script and style tags
            stripped = tag.strip()
            if stripped and len(stripped) > 1:
                translated = translate_text(
                    stripped, lang_info.get('code', lang_code))
                tag.replace_with(translated)

    # Preserve CSS link
    css_link = soup.find('link', rel='stylesheet')
    if not css_link:
        # If no CSS link exists, create one
        css_link = soup.new_tag('link')
        css_link['rel'] = 'stylesheet'
        css_link['href'] = '/css/style.css'
        head_tag = soup.find('head')
        if head_tag:
            head_tag.append(css_link)
    else:
        # Ensure the CSS link points to the correct absolute path
        css_link['href'] = '/css/style.css'

    # Save the translated file
    output_file = f"lang/{lang_code}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(str(soup))


def generate_language_config():
    """Generate a JSON configuration for client-side language handling"""
    config = {
        'default_language': 'de',
        'available_languages': {}
    }

    for lang_code, lang_info in LANGUAGES.items():
        config['available_languages'][lang_code] = {
            'name': lang_info['name'],
            'file': 'index.html' if lang_code == 'de' else f'lang/{lang_code}.html'
        }
        if 'flag' in lang_info:
            config['available_languages'][lang_code]['flag'] = lang_info['flag']

    # Ensure the lang directory exists
    os.makedirs('lang', exist_ok=True)

    # Write the configuration to a JSON file
    with open('lang/language_config.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

# Main translation process


def main():
    # Create the lang directory if it doesn't exist
    os.makedirs('lang', exist_ok=True)

    # Generate translations for each language
    for lang_code, lang_info in LANGUAGES.items():
        # Skip German (source language) and manually created languages
        if lang_code == 'de' or lang_info.get('manual', False):
            continue

        # Translate the HTML file
        translate_html_file('index.html', lang_code, lang_info)
        print(
            f"✅ {lang_info['name'].capitalize()} translation saved → lang/{lang_code}.html")

    # Generate language configuration
    generate_language_config()


if __name__ == "__main__":
    main()
