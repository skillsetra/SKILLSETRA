import asyncio
import base64
import re
from urllib.parse import quote, urlparse

import httpx


RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class GitHubAPIError(RuntimeError):
    """Sanitized GitHub API failure with a useful, user-safe explanation."""

    def __init__(self, status_code: int, message: str = ""):
        self.status_code = status_code
        self.api_message = str(message or "").strip()[:400]
        super().__init__(self.user_message())

    def user_message(self) -> str:
        text = self.api_message.lower()
        if self.status_code == 0:
            return "Could not connect to GitHub. Check the server's internet connection and try again."
        if self.status_code == 401:
            return "GitHub rejected the API request (401). Check the configured GitHub token, if one is set."
        if self.status_code == 403 and ("rate limit" in text or "secondary rate" in text or "x-ratelimit" in text):
            return "GitHub API rate limit reached. Wait a little and retry, or configure a valid GitHub token in the backend environment."
        if self.status_code == 403:
            return "GitHub denied access to the requested repository data. Confirm the repository is public and GitHub API access is available."
        if self.status_code == 404:
            return "GitHub could not find the repository or its default-branch data. Confirm the URL is correct, the repository is public, and it has at least one commit."
        if self.status_code == 409:
            return "GitHub cannot analyze this repository yet. It may be empty or have no commit on its default branch. Create an initial commit and retry."
        if self.status_code == 422:
            return "GitHub could not process this repository reference. Check that its default branch is valid and retry."
        if self.status_code == 429:
            return "GitHub is rate-limiting requests. Wait briefly and retry."
        if self.status_code in RETRYABLE_STATUSES:
            return f"GitHub returned a temporary server error (HTTP {self.status_code}). Retry the analysis in a moment."
        return f"GitHub API request failed (HTTP {self.status_code}). {self.api_message or 'Check the repository URL and try again.'}"


def parse_repo_url(value: str):
    raw = (value or "").strip()
    if not raw:
        raise ValueError("Enter a GitHub repository URL.")
    if not raw.startswith(("http://", "https://")):
        raw = "https://github.com/" + raw.lstrip("/")
    p = urlparse(raw)
    if p.scheme != "https" or p.netloc.lower() not in {"github.com", "www.github.com"} or p.username or p.password or p.port:
        raise ValueError("Only HTTPS GitHub repository URLs are allowed.")
    if p.query or p.fragment:
        raise ValueError("Use a repository URL without query parameters or fragments.")
    parts = [x for x in p.path.split("/") if x]
    if len(parts) not in {2, 3} or (len(parts) == 3 and parts[2] != ""):
        raise ValueError("Use a repository URL like https://github.com/owner/repo.")
    owner, repo = parts[0], re.sub(r"\.git$", "", parts[1])
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", owner):
        raise ValueError("The GitHub owner name is invalid.")
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repo) or repo in {".", ".."}:
        raise ValueError("The GitHub repository name is invalid.")
    return owner, repo


async def github_request(path: str, token: str = "", retries: int = 2):
    """GET an allowlisted GitHub API path with bounded transient-error retries."""
    if not isinstance(path, str) or not path.startswith("/repos/") or path.startswith("//") or ".." in path.split("/"):
        raise ValueError("Invalid internal GitHub API path.")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "SKILLSETRA-GitHub-Intelligence/1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    max_retries = max(0, min(int(retries), 2))
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0), follow_redirects=False) as client:
                response = await client.get(f"https://api.github.com{path}", headers=headers)
            if response.is_redirect:
                raise ValueError("GitHub redirect rejected for SSRF protection.")
            if response.status_code in RETRYABLE_STATUSES and attempt < max_retries:
                retry_after = response.headers.get("Retry-After", "")
                try:
                    wait = min(max(float(retry_after), 0.0), 1.0)
                except (TypeError, ValueError):
                    wait = 0.25 * (attempt + 1)
                await asyncio.sleep(wait)
                continue
            if response.status_code >= 400:
                try:
                    detail = response.json().get("message", "")
                except (ValueError, AttributeError):
                    detail = ""
                raise GitHubAPIError(response.status_code, detail)
            try:
                return response.json()
            except ValueError as exc:
                raise GitHubAPIError(response.status_code, "GitHub returned an invalid JSON response.") from exc
        except httpx.TimeoutException as exc:
            if attempt < max_retries:
                await asyncio.sleep(0.2 * (attempt + 1))
                continue
            raise GitHubAPIError(0, "GitHub request timed out.") from exc
        except httpx.TransportError as exc:
            if attempt < max_retries:
                await asyncio.sleep(0.2 * (attempt + 1))
                continue
            raise GitHubAPIError(0, "Network transport error.") from exc
    raise GitHubAPIError(0, "GitHub request did not complete.")


async def _optional_request(path: str, token: str, fallback):
    """Optional metadata must not break analysis if a secondary API endpoint fails."""
    try:
        return await github_request(path, token)
    except (GitHubAPIError, httpx.HTTPError, ValueError):
        return fallback


def _names(items):
    return [x.get("path") or x.get("name", "") for x in items if isinstance(x, dict) and (x.get("path") or x.get("name"))]


def _claim(claim, evidence, confidence="medium", limitation=""):
    return {"claim": claim, "evidence": evidence, "confidence": confidence, "limitation": limitation}


async def analyze_public_repo(url: str, token: str = ""):
    owner, repo = parse_repo_url(url)
    meta = await github_request(f"/repos/{owner}/{repo}", token)
    # A server-wide token must never turn this public-repository analyzer into
    # an indirect private-repository inspection capability.
    if isinstance(meta, dict) and meta.get("private") is True:
        raise ValueError("Only public GitHub repositories can be analyzed. Private repository access is not supported.")

    branch = meta.get("default_branch")
    if not branch:
        raise ValueError("This GitHub repository has no default branch or initial commit. Create an initial commit and retry.")

    # Resolve the default branch to its commit and then use the canonical tree SHA.
    # This avoids branch-ref ambiguity (notably branch names containing slashes) and
    # makes failures distinguishable between a missing branch, commit, and tree.
    commit_ref = quote(str(branch), safe="/")
    commit = await github_request(f"/repos/{owner}/{repo}/commits/{commit_ref}", token)
    tree_sha = ((commit or {}).get("commit") or {}).get("tree", {}).get("sha")
    if not isinstance(tree_sha, str) or not re.fullmatch(r"[0-9a-fA-F]{40,64}", tree_sha):
        raise ValueError("GitHub did not return a valid tree reference for the repository's default branch.")

    tree = await github_request(f"/repos/{owner}/{repo}/git/trees/{quote(tree_sha, safe='')}?recursive=1", token)
    entries = tree.get("tree", []) if isinstance(tree, dict) else []
    truncated = bool(tree.get("truncated")) if isinstance(tree, dict) else False
    if len(entries) > 5000:
        entries = entries[:5000]
        truncated = True
    paths = [x.get("path", "") for x in entries if x.get("type") == "blob"]
    dirs = [x.get("path", "") for x in entries if x.get("type") == "tree"]

    # Secondary endpoints (language totals, commit sample, PR sample) are helpful but
    # are not prerequisites. An unauthenticated API quota must not discard a valid tree.
    languages = await _optional_request(f"/repos/{owner}/{repo}/languages", token, {})
    if not isinstance(languages, dict):
        languages = {}
    commits = await _optional_request(f"/repos/{owner}/{repo}/commits?per_page=12", token, [])
    prs = await _optional_request(f"/repos/{owner}/{repo}/pulls?state=all&per_page=10", token, [])
    readme_text = ""
    readme = await _optional_request(f"/repos/{owner}/{repo}/readme", token, {})
    if isinstance(readme, dict) and readme.get("content"):
        try:
            readme_text = base64.b64decode(readme["content"]).decode("utf-8", "ignore")[:8000]
        except (ValueError, TypeError):
            readme_text = ""

    low = {p.lower() for p in paths}
    signals = []
    if any(p.endswith("readme.md") for p in low): signals.append("README")
    if any("/test" in p or "/tests" in p or p.startswith("test") or "pytest" in p or "jest" in p or "vitest" in p for p in low): signals.append("Tests")
    if any(p.endswith("dockerfile") or "docker-compose" in p or p.endswith("compose.yml") for p in low): signals.append("Docker")
    if any(p.startswith(".github/workflows/") for p in low): signals.append("CI/CD")
    if any(p.endswith(x) for p in low for x in ("package.json", "pyproject.toml", "requirements.txt", "go.mod", "pom.xml", "cargo.toml")): signals.append("Dependency manifests")
    if any("/docs/" in p or p.startswith("docs/") for p in low): signals.append("Documentation")
    if any("terraform" in p or p.endswith(".tf") for p in low): signals.append("Infrastructure as code")
    if any("security" in p or "dependabot" in p for p in low): signals.append("Security configuration")
    root = [p for p in paths if "/" not in p][:80]
    optional_missing = []
    if not languages: optional_missing.append("language totals")
    if not isinstance(commits, list): commits = []
    if not isinstance(prs, list): prs = []
    if not readme_text: optional_missing.append("README excerpt")
    facts = {
        "visibility": "private" if meta.get("private") else "public",
        "repository": f"{owner}/{repo}",
        "url": f"https://github.com/{owner}/{repo}",
        "description": meta.get("description") or "No description",
        "default_branch": branch,
        "stars": meta.get("stargazers_count", 0),
        "forks": meta.get("forks_count", 0),
        "open_issues": meta.get("open_issues_count", 0),
        "updated_at": meta.get("updated_at"),
        "created_at": meta.get("created_at"),
        "languages": list(languages.keys())[:12],
        "root_files": root,
        "file_count": len(paths),
        "directory_count": len(dirs),
        "inspection_truncated": truncated,
        "signals": signals,
        "recent_commit_count_sample": len(commits),
        "pull_request_sample_count": len(prs),
        "has_tests": "Tests" in signals,
        "has_ci": "CI/CD" in signals,
        "has_docker": "Docker" in signals,
        "has_readme": "README" in signals,
        "has_docs": "Documentation" in signals,
        "has_security_config": "Security configuration" in signals,
        "readme_excerpt": readme_text[:6000],
        "partial_data": bool(optional_missing),
        "data_warnings": [f"GitHub did not provide {item}; remaining repository analysis is still valid." for item in optional_missing],
    }
    claims = [
        _claim("Repository structure contains observable engineering artifacts.", [f"{facts['file_count']} files and {facts['directory_count']} directories were returned by the repository tree.", f"Languages: {', '.join(facts['languages']) or 'none detected'}", f"Signals: {', '.join(signals) or 'none detected'}"], "high", "Repository artifacts do not prove the individual author wrote the code or has mastery."),
        _claim("Testing evidence is visible." if facts["has_tests"] else "Testing evidence was not found in the inspected tree.", ["Test directories/configurations were detected."] if facts["has_tests"] else ["No recognized test directory/configuration was found in the inspected tree."], "medium", "Repository inspection cannot prove test quality without executing tests."),
        _claim("CI/CD evidence is visible." if facts["has_ci"] else "CI/CD evidence was not found in the inspected tree.", ["GitHub Actions workflow files were detected."] if facts["has_ci"] else ["No GitHub Actions workflow files were detected."], "medium", "Other CI systems may exist outside the inspected repository or via external infrastructure."),
    ]
    suggestions = []
    if not facts["has_tests"]: suggestions.append({"title": "Add failure-path tests", "why": "No recognizable test artifacts were found in the inspected tree.", "competency": "Testing", "proof": "Add unit/integration tests and record a reproducible run."})
    if not facts["has_ci"]: suggestions.append({"title": "Add a CI quality gate", "why": "No GitHub Actions workflow was detected.", "competency": "Delivery", "proof": "Run type checks, lint and tests on pull requests."})
    if not facts["has_docs"]: suggestions.append({"title": "Document architecture", "why": "No docs directory was detected in the inspected tree.", "competency": "Communication", "proof": "Add architecture, setup, testing and decision records."})
    if not facts["has_security_config"]: suggestions.append({"title": "Document security controls", "why": "No obvious security configuration signal was detected.", "competency": "Security", "proof": "Add dependency scanning, secret handling and threat-model notes appropriate to the project."})
    if not suggestions: suggestions.append({"title": "Deepen transfer evidence", "why": "Multiple engineering signals are visible.", "competency": "Transfer", "proof": "Defend one design change under a new constraint and verify the changed behavior."})
    return {"facts": facts, "claims": claims, "suggestions": suggestions, "observed": facts, "inferred": claims, "recommended": suggestions}
