# 🎨 CAD Render Studio — AI-Powered 3D CAD Reconstruction Engine

[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![PyInstaller](https://img.shields.io/badge/PyInstaller-Standalone-000000?style=for-the-badge&logo=windows&logoColor=white)](https://pyinstaller.org)

**CAD Render Studio** is a full-stack, AI-powered industrial software suite designed to automate the conversion of product photography into high-precision, production-grade 3D CAD renders. 

Featuring an automated web image scraper, real-time worker queue processing, side-by-side human review workflows, and a zero-dependency standalone Windows executable distribution.

---

## 🌟 Key Features

- **⚡ Automated Image Scraper & Downloader**: Scrapes product photography directly from supplier APIs and catalogs using item serial numbers, with real-time SSE progress streaming and manual refresh fallback.
- **🤖 AI-Driven 3D CAD Reconstruction Engine**: Leverages OpenAI Vision models (`gpt-image-2`) with customizable **Medium** and **High** quality reconstruction presets.
- **📊 Real-Time Worker Queue (SSE)**: Live multi-threaded job dispatching featuring progress ring visualization, ETA calculations, pause/resume controls, and retry loops.
- **🔍 Side-by-Side Review & Approval**: High-resolution zoom comparison modal, bulk selection, and atomic one-click approval workflows moving renders to `CAD_DIRECTORY/`.
- **🔄 System Reconciliation**: Auto-syncs disk directory structures (`DATA_DIRECTORY`, `CAD_REVIEW_DIRECTORY`, `CAD_DIRECTORY`), SQLite database records, and Excel mapping spreadsheets (`Fiverr List for Auveco-1.xlsx`).
- **📦 Zero-Dependency Windows Desktop Distribution**: Standalone `.exe` launcher powered by PyInstaller that runs with zero prerequisites or coding setup required.

---

## 🏗️ Architecture & Technology Stack

```
                               ┌─────────────────────────────────────────┐
                               │       React 18 + TypeScript UI          │
                               │  Vite + Lucide Icons + Custom CSS       │
                               └────────────────────┬────────────────────┘
                                                    │ REST API / SSE
                               ┌────────────────────▼────────────────────┐
                               │           FastAPI Web Server            │
                               │   Uvicorn + Multi-Threaded Queue        │
                               └──────────┬──────────────────┬───────────┘
                                          │                  │
                      ┌───────────────────▼───┐          ┌───▼──────────────────┐
                      │ SQLite Database (WAL) │          │ OpenAI API Integrator│
                      │ Filesystem Store      │          │ GPT Vision Models    │
                      └───────────────────────┘          └──────────────────────┘
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Custom CSS Design System, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLite (WAL mode), Pydantic, OpenPyXL |
| **AI / ML** | OpenAI Vision API (`gpt-image-2`), Pillow (PIL) Image Pipeline |
| **Streaming** | Server-Sent Events (SSE) for live downloader & job queue streams |
| **Desktop Packaging** | PyInstaller `--onedir` bundle with embedded static frontend |

---

## 🔒 Security & Environment Setup

> [!IMPORTANT]
> **API Key Safety Notice**: Never commit your `.env` file or hardcode secret API keys into git repositories. `.env` is listed in `.gitignore` to prevent credential leaks.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mreeb/IMAGE-RENDERING.git
   cd IMAGE-RENDERING
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your OpenAI API Key into `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```

---

## 🚀 Quickstart & Development Setup

### 1. Backend Setup (Python Virtual Environment)
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows PowerShell
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup (React & Node.js)
```bash
cd frontend
npm install
```

### 3. Run Application in Development Mode

- **Start FastAPI Backend**:
  ```powershell
  python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Start React Frontend**:
  ```powershell
  cd frontend
  npm run dev
  ```
- Access the web interface at `http://localhost:5173`.

---

## 📦 Building the Standalone Desktop Executable

To compile the self-contained zero-dependency Windows desktop application:

1. **Build React static assets**:
   ```powershell
   cd frontend
   npm run build
   ```

2. **Compile PyInstaller bundle**:
   ```powershell
   pyinstaller --name="CAD_Render_Studio" --onedir --noconfirm --add-data="frontend/dist;frontend/dist" --add-data="backend;backend" launcher.py
   ```

3. **Output Executable**:
   The standalone bundle will be generated in `dist/CAD_Render_Studio/CAD_Render_Studio.exe`.

---

## 🧪 Automated Testing

Run the pytest suite to verify backend endpoints and database reconciliation:
```powershell
pytest backend/tests/ -v
```
*Note: All unit tests mock OpenAI API network calls to ensure zero credit consumption during testing.*

---

## 📁 Repository Structure

```text
IMAGE RENDERING/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI Endpoint Routers
│   │   ├── cad_converter.py # AI Reconstruction Pipeline
│   │   ├── config.py        # Path & Settings Resolver
│   │   ├── db.py            # SQLite Connection & Schema
│   │   ├── downloader.py    # Product Image Scraper Service
│   │   ├── excel_parser.py  # Mapping Workbook Parser
│   │   ├── job_queue.py     # Background Queue & SSE Streaming
│   │   ├── main.py          # FastAPI Application Entry
│   │   ├── models.py        # Pydantic Schemas
│   │   └── reconciler.py    # Directory & Database Reconciler
│   └── tests/               # Pytest Automated Test Suite
├── frontend/                # React 18 + TypeScript Web Application
├── launcher.py              # Desktop App Browser Launcher
├── generate_pdf_manual.py   # PDF User Manual Compiler Script
├── .env.example             # Environment Configuration Template
├── requirements.txt         # Python Dependencies
├── run.bat                  # One-Click Windows Batch Launcher
└── run.ps1                  # One-Click PowerShell Launcher
```

---

## 📜 License

This project is released under the [MIT License](LICENSE).
