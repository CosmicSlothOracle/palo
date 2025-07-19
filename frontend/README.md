# KOSGE Website (Neustrukturierung)

## Zielstruktur

Das Projekt wird in zwei Hauptteile getrennt:

- **Frontend** (`/frontend`):
  - `/public`: Statische Dateien (HTML, CSS, JS, Bilder)
  - `/locales`: Übersetzungsdateien (JSON)
- **Backend** (`/backend`):
  - Flask-API für Authentifizierung, Banner-Upload, Teilnehmer- und Übersetzungsverwaltung
  - `/uploads`: Speicherort für hochgeladene Banner

## Features (geplant)

- Zentrale, sichere Authentifizierung für Admins
- Banner-Upload und Verwaltung über das Backend
- Teilnehmerverwaltung (Formular, Speicherung, Admin-Übersicht)
- Zentrale, dynamische Mehrsprachigkeit (alle Inhalte über API/JSON)
- Klare Trennung von Frontend und Backend (API-first)

## Entwicklung

- Frontend und Backend werden separat entwickelt und können unabhängig deployed werden.
- Die API wird als REST-API mit Flask bereitgestellt.

## Setup (in Kürze)

- Siehe jeweils `/frontend/README.md` und `/backend/README.md` für Details.

## Overview

This is the official website for Kollektiv für solidarische Gesundheit e.V. (KOSGE), a collective for solidarity health in Berlin. The website is designed to be multilingual, responsive, and accessible.

## Features

### Multilingual Support

- The website is available in multiple languages:
  - German (default)
  - English
  - Turkish
  - Russian
  - Arabic
- Language selection is available in the top-right corner of the website
- User language preferences are saved in the browser's local storage

### Responsive Design

- The website is fully responsive and works on all devices (desktop, tablet, mobile)
- Adaptive layout that changes based on screen size
- Mobile-friendly navigation

### Interactive Elements

- Hero slideshow with automatic transitions
- Hover effects on interactive elements for better user experience
- Smooth transitions and animations

## File Structure

- `index.html` - Main HTML file (German)
- `lang/` - Directory containing translated versions of the website
  - `en.html` - English version
  - `tr.html` - Turkish version
  - `ru.html` - Russian version
  - `ar.html` - Arabic version
  - `einfach.html` - Simple language version (German)
- `css/` - Directory containing CSS files
  - `style.css` - Main stylesheet
- `translate_tool/` - Directory containing translation scripts
  - `translate_html.py` - Python script for translating the website

## Translation

The website uses a custom Python script for translation. To update translations:

1. Make changes to the main `index.html` file (German version)
2. Run the translation script:
   ```
   python translate_tool/translate_html.py
   ```
3. The script will generate updated HTML files for all supported languages in the `lang/` directory

## Local Development

To run the website locally:

1. Clone this repository
2. Navigate to the project directory
3. Start a local web server:
   ```
   python -m http.server 8000
   ```
4. Open your browser and go to `http://localhost:8000`

## Contact

For any questions or issues, please contact:

- Email: info@kosge-berlin.de
- Phone: +49 1520 7240947
