"""Runtime learning-material catalog.

Drop YouTube URLs into links.txt and PDF/PPT/PPTX files into each subject's materials/
folder. The backend scans the directory at request time, so new materials appear
without changing application code.
"""
from __future__ import annotations
from pathlib import Path
from urllib.parse import quote
import re

ROOT = Path(__file__).resolve().parents[2] / "learning-materials"
VIDEO_HOSTS = ("youtube.com", "youtu.be")
EXT_KIND = {".pdf": "pdf", ".ppt": "slides", ".pptx": "slides"}
ROLE_MATERIALS = {
    "ML Engineer": {"Python","Machine Learning","SQL","Testing","Deployment","Docker","Data Analysis & Visualization","Deep Learning","AI Engineering"},
    "AI Engineer": {"Python","AI Engineering","FastAPI & APIs","LLM Evaluation","RAG & Retrieval","Machine Learning","Docker & Containers","Testing"},
    "Data Scientist": {"Python","SQL & Databases","Data Analysis & Visualization","Machine Learning","Deep Learning","Statistics"},
    "Data Analyst": {"Python","SQL & Databases","Data Analysis & Visualization","Technical Communication"},
    "Backend Developer": {"Python","FastAPI & APIs","SQL & Databases","Backend Engineering","Testing","Docker & Containers","System Design","Git & GitHub"},
    "Full-Stack Developer": {"Python","Full-Stack Engineering","Frontend Engineering","React & Next.js","FastAPI & APIs","SQL & Databases","Testing","Docker & Containers","Git & GitHub"},
    "Frontend Developer": {"Frontend Engineering","React & Next.js","UI Engineering","Software Testing","Accessibility","Git & GitHub"},
    "Python Developer": {"Python","FastAPI & APIs","Backend Engineering","SQL & Databases","Testing","Packaging","Docker & Containers"},
    "DevOps Engineer": {"Linux & Networking","Docker & Containers","DevOps & CI/CD","Cloud Engineering","Kubernetes","Terraform & Infrastructure as Code","Observability & Reliability","Git & GitHub"},
    "Cybersecurity": {"Cybersecurity","Linux & Networking","Software Testing","Git & GitHub"},
    "Cloud Engineer": {"Cloud Engineering","Linux & Networking","Terraform & Infrastructure as Code","Kubernetes","Observability & Reliability","Docker & Containers","DevOps & CI/CD"},
    "Product Data Engineer": {"SQL & Databases","Python","Data Engineering","Data Analysis & Visualization","Cloud Engineering","Docker & Containers"},
}
DISPLAY_NAMES = {
    "sql-databases": "SQL & Databases",
    "data-analysis-visualization": "Data Analysis & Visualization",
    "machine-learning": "Machine Learning",
    "ai-engineering": "AI Engineering",
    "backend-engineering": "Backend Engineering",
    "frontend-engineering": "Frontend Engineering",
    "react-nextjs": "React & Next.js",
    "fullstack-engineering": "Full-Stack Engineering",
    "fastapi-apis": "FastAPI & APIs",
    "docker-containers": "Docker & Containers",
    "cloud-engineering": "Cloud Engineering",
    "cybersecurity": "Cybersecurity",
    "devops-ci-cd": "DevOps & CI/CD",
    "system-design": "System Design",
    "data-engineering": "Data Engineering",
    "product-engineering": "Product Engineering",
    "ui-engineering": "UI Engineering",
    "flutter-dart": "Flutter & Dart",
    "kubernetes": "Kubernetes",
    "git-github": "Git & GitHub",
    "llm-evaluation": "LLM Evaluation",
    "rag-retrieval": "RAG & Retrieval",
    "observability-reliability": "Observability & Reliability",
    "linux-networking": "Linux & Networking",
    "terraform-iac": "Terraform & Infrastructure as Code",
    "distributed-systems": "Distributed Systems",
    "deep-learning": "Deep Learning",
    "software-testing": "Software Testing",
    "technical-communication": "Technical Communication",
}

def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")

def _subject_dirs() -> list[Path]:
    if not ROOT.exists():
        return []
    return sorted([p for p in ROOT.iterdir() if p.is_dir()])

def _line_resource(subject: str, line: str, idx: int) -> dict | None:
    raw = line.strip()
    if not raw or raw.startswith("#"):
        return None
    # Supported format: Title | URL | Type | Level
    parts = [x.strip() for x in raw.split("|")]
    url = next((x for x in parts if x.startswith(("http://", "https://"))), "")
    if not url:
        return None
    title = parts[0] if parts[0] != url else f"{subject} resource {idx}"
    kind = next((x.lower() for x in parts[2:] if x.lower() in {"youtube", "video", "pdf", "slides", "course", "reference", "documentation", "learning"}), "")
    if not kind:
        kind = "youtube" if any(h in url.lower() for h in VIDEO_HOSTS) else "resource"
    if kind == "video": kind = "youtube"
    level = next((x for x in parts[2:] if x.lower() not in {"youtube","video","pdf","slides","course","reference","documentation","learning"}), "All levels")
    return {"id": f"folder-{_slug(subject)}-{idx}", "competency": subject, "field": subject, "roles": [role for role,fields in ROLE_MATERIALS.items() if subject in fields], "level": level, "kind": kind, "title": title, "url": url, "why": f"Added from the SKILLSETRA learning-materials/{_slug(subject)} folder."}

def scan_materials() -> tuple[list[dict], list[dict]]:
    resources: list[dict] = []
    subjects: list[dict] = []
    for folder in _subject_dirs():
        subject = DISPLAY_NAMES.get(folder.name, folder.name.replace("-", " ").title())
        readme = folder / "README.md"
        description = ""
        if readme.exists():
            for line in readme.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.lower().startswith("description:"):
                    description = line.split(":", 1)[1].strip()
                    break
        folder_resources: list[dict] = []
        links = folder / "links.txt"
        if links.exists():
            for idx, line in enumerate(links.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                item = _line_resource(subject, line, idx)
                if item: folder_resources.append(item)
        materials = folder / "materials"
        if materials.exists():
            for path in sorted(materials.rglob("*")):
                if not path.is_file() or path.suffix.lower() not in EXT_KIND:
                    continue
                rel = path.relative_to(ROOT).as_posix()
                folder_resources.append({
                    "id": f"file-{_slug(rel)}", "competency": subject, "field": subject,
                    "roles": [role for role,fields in ROLE_MATERIALS.items() if subject in fields],
                    "level": "All levels",
                    "kind": EXT_KIND[path.suffix.lower()], "title": path.stem.replace("-", " ").replace("_", " ").title(),
                    "url": f"/api/v1/materials/file/{quote(rel, safe='/')}",
                    "why": f"Local {EXT_KIND[path.suffix.lower()].upper()} material supplied for {subject}."
                })
        if folder_resources:
            resources.extend(folder_resources)
            subjects.append({"id": _slug(folder.name), "name": subject, "category": "Learning field", "roles": [role for role,fields in ROLE_MATERIALS.items() if subject in fields], "levels": ["Beginner", "Intermediate", "Advanced"], "languages": ["English", "Hindi"], "description": description or f"Curated material for {subject}.", "resources": folder_resources})
    return resources, subjects
