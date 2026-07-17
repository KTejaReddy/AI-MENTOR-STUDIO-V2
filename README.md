# Mentor AI Studio V2

A modern AI-powered engineering learning platform for B.Tech students.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, SQLite, Pydantic
- **AI:** Groq API (abstracted via provider interface)

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
mentor-ai-studio/
  backend/       # FastAPI application
  frontend/      # React application
  database/      # SQLite database files
  docs/          # Documentation
```
