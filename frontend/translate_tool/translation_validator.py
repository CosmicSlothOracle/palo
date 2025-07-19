import os
import re
from bs4 import BeautifulSoup


class TranslationValidator:
    def __init__(self, reference_file='index.html'):
        """
        Initialize the validator with a reference HTML file
        """
        self.reference_file = reference_file
        self.lang_dir = 'lang'
        self.reference_soup = self._load_reference_html()

    def _load_reference_html(self):
        """
        Load the reference HTML file
        """
        with open(self.reference_file, 'r', encoding='utf-8') as f:
            return BeautifulSoup(f, 'html.parser')

    def _load_translation_html(self, translation_file):
        """
        Load a translation HTML file
        """
        full_path = os.path.join(self.lang_dir, translation_file)
        with open(full_path, 'r', encoding='utf-8') as f:
            return BeautifulSoup(f, 'html.parser')

    def validate_structure(self, translation_file):
        """
        Validate the overall structure of the translation
        """
        translation_soup = self._load_translation_html(translation_file)
        errors = []

        # Check basic structure elements
        reference_sections = self.reference_soup.find_all(
            ['header', 'nav', 'main', 'footer'])
        translation_sections = translation_soup.find_all(
            ['header', 'nav', 'main', 'footer'])

        if len(reference_sections) != len(translation_sections):
            errors.append(
                f"Mismatched number of main sections in {translation_file}")

        # Check number of sections in main content
        reference_main_sections = self.reference_soup.select('main section')
        translation_main_sections = translation_soup.select('main section')

        if len(reference_main_sections) != len(translation_main_sections):
            errors.append(
                f"Mismatched number of sections in main content for {translation_file}")

        return errors

    def validate_css_links(self, translation_file):
        """
        Validate CSS links in the translation
        """
        translation_soup = self._load_translation_html(translation_file)
        errors = []

        # Check for correct CSS link
        css_links = translation_soup.find_all('link', rel='stylesheet')
        correct_css_found = any(
            '/css/style.css' in link.get('href', '') for link in css_links)

        if not correct_css_found:
            errors.append(
                f"Missing or incorrect CSS link in {translation_file}")

        return errors

    def validate_slideshow(self, translation_file):
        """
        Validate the slideshow structure
        """
        translation_soup = self._load_translation_html(translation_file)
        errors = []

        # Check hero slideshow
        reference_hero_slides = self.reference_soup.select('.hero-slide')
        translation_hero_slides = translation_soup.select('.hero-slide')

        if len(reference_hero_slides) != len(translation_hero_slides):
            errors.append(
                f"Mismatched number of hero slides in {translation_file}")

        return errors

    def validate_language_controls(self, translation_file):
        """
        Validate language controls and options
        """
        translation_soup = self._load_translation_html(translation_file)
        errors = []

        # Check language select exists
        language_select = translation_soup.find('select', id='language')
        if not language_select:
            errors.append(f"Missing language select in {translation_file}")

        return errors

    def validate_scripts(self, translation_file):
        """
        Validate presence of required scripts
        """
        translation_soup = self._load_translation_html(translation_file)
        errors = []

        # Check for background slideshow script
        bg_slideshow_script = translation_soup.find(
            'script', string=re.compile('addBackgroundImage'))
        if not bg_slideshow_script:
            errors.append(
                f"Missing background slideshow script in {translation_file}")

        # Check for hero slideshow script
        hero_slideshow_script = translation_soup.find(
            'script', string=re.compile('Hero Slideshow functionality'))
        if not hero_slideshow_script:
            errors.append(
                f"Missing hero slideshow script in {translation_file}")

        return errors

    def run_full_validation(self):
        """
        Run full validation on all translation files
        """
        # Explicitly list the translation files
        translation_files = ['tr.html', 'ru.html', 'ar.html', 'en.html']

        validation_results = {}
        for file in translation_files:
            print(f"Validating {file}...")
            file_errors = []

            file_errors.extend(self.validate_structure(file))
            file_errors.extend(self.validate_slideshow(file))
            file_errors.extend(self.validate_language_controls(file))
            file_errors.extend(self.validate_scripts(file))
            file_errors.extend(self.validate_css_links(file))

            validation_results[file] = file_errors

        return validation_results


def main():
    validator = TranslationValidator()
    results = validator.run_full_validation()

    print("\n--- Validation Results ---")
    for file, errors in results.items():
        print(f"\n{file}:")
        if errors:
            for error in errors:
                print(f"  - {error}")
        else:
            print("  ✓ No issues found")


if __name__ == '__main__':
    main()
