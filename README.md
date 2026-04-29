# ⚡ Postboy
> **The ultimate local-first API client for high-performance testing.**

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![UI](https://img.shields.io/badge/UI-Glassmorphism-purple?style=for-the-badge)](frontend/styles.css)

**Postboy** is a lightweight, blazing-fast, and local-first alternative to heavy API clients. Designed with a premium **Glassmorphism Dark Mode**, it offers a seamless experience for developers who value speed, privacy, and aesthetics.

---

## 🎨 Preview
![Postboy Showcase](https://raw.githubusercontent.com/placeholder/postboy/main/showcase.png)
*A sleek, modern interface designed for focus and productivity.*

---

## 🔥 Key Features

### 🚀 Performance & Network
- **Async Engine**: Powered by `HTTPX` for lightning-fast concurrent requests.
- **Variable Injection**: Full support for `{{variable}}` substitution in URLs, headers, and bodies.
- **Multi-Environment**: Seamlessly switch between Local, Staging, and Production contexts.

### 💎 User Experience (UX)
- **Glassmorphism UI**: A beautiful dark interface with subtle transparency and blur effects.
- **Smart Modals**: Custom, non-blocking modal system for a fluid workflow.
- **Scroll Optimized**: Handles massive JSON responses (multi-MB) without UI freezing.
- **Postman Sync**: Instant import for your existing v2.1 Collections.

### 🛡️ Privacy & Security
- **Local-First**: Your data never leaves your machine. No cloud, no account required.
- **JSON Storage**: Human-readable persistence in the `/data` directory.

---

## 📦 Installation & Setup

### 1. Requirements
- Python 3.10+
- Pip (Python package manager)

### 2. Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/postboy.git

# Enter the directory
cd postboy

# Install dependencies
pip install -r requirements.txt

# Run the engine
python main.py
```

### 3. Access the Dashboard
Open your favorite browser and go to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Project Anatomy
```bash
├── 🐍 backend/     # FastAPI app, models, and request engine
├── 🎨 frontend/    # HTML/CSS (Glassmorphism) and Vanilla JS
├── 📂 data/        # Your local collections & environment data (ignored by git)
├── 📚 specs/       # Technical documentation & roadmap
└── 🚀 main.py      # Entry point
```

---

## 🛠️ Tech Stack
- **Core**: [FastAPI](https://fastapi.tiangolo.com/)
- **Networking**: [HTTPX](https://www.python-httpx.org/)
- **Aesthetics**: Vanilla CSS3 + [Inter Font](https://fonts.google.com/specimen/Inter)
- **Logic**: Vanilla JS (ES6+)

---

## 🗺️ Roadmap
- [ ] Pre-request & Post-request Scripts (JS)
- [ ] Response Visualizers (Charts & HTML)
- [ ] Export to cURL / Postman
- [ ] Full OAuth2 Helper

## 🤝 Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

<p align="center">
  Developed with ❤️ by the Postboy Team
</p>
