"""
Max Dashboard launcher
Opens the GitHub Pages dashboard in Google Chrome in kiosk/full-screen mode.

Run:
    python launcher.py
"""

import os
import shutil
import subprocess
import sys

URL = "https://rijwal-lang.github.io/Max-Dashboard/"


def find_chrome():
    candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        shutil.which("chrome"),
    ]

    for path in candidates:
        if path and os.path.isfile(path):
            return path

    return None


def main():
    chrome = find_chrome()

    if not chrome:
        print("Google Chrome was not found.")
        print("Install Chrome or add chrome.exe to PATH.")
        sys.exit(1)

    # --kiosk removes the normal browser UI and displays the dashboard
    # webpage as the full-screen Chrome window.
    subprocess.Popen([
        chrome,
        "--kiosk",
        "--start-maximized",
        "--disable-infobars",
        URL,
    ])

    print("Max Dashboard launched in Chrome kiosk mode.")
    print(URL)


if __name__ == "__main__":
    main()
