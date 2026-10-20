from app.core.config import settings
settings.demo_mode=True
from fastapi.testclient import TestClient
from app.main import app
import uuid
import json
DEMO_SESSION = str(uuid.uuid4())
client=TestClient(app, headers={"X-SKILLSETRA-Demo-Session": DEMO_SESSION})

def test_health():
    r=client.get("/api/health"); assert r.status_code==200; assert r.json()["status"]=="ok"

def test_private_competencies():
    r=client.get("/api/competencies"); assert r.status_code==200; assert len(r.json()["items"])>=15

def test_assessment():
    r=client.get("/api/assessment"); assert r.status_code==200; assert len(r.json()["questions"])>=10

def test_challenge_submit():
    r=client.post("/api/challenges/debug-1/submit",json={"answer":"I would reproduce the issue, isolate malformed records, add edge case tests and verify the failure path."})
    assert r.status_code==200; assert r.json()["evidence_added"] is True

def test_ai_providers_and_subjects():
    providers=client.get('/api/ai/providers'); assert providers.status_code==200
    assert [p['id'] for p in providers.json()['providers']]==['puter']
    subjects=client.get('/api/subjects?language=English'); assert subjects.status_code==200
    assert len(subjects.json()['items'])>=10

def test_ai_chat_demo_provider_contract():
    r=client.post('/api/ai/ask',json={'question':'make me a roadmap for SQL','provider':'puter','language':'English','role':'ML Engineer','goal':'Become job-ready'})
    assert r.status_code==200
    assert r.json().get('answer') or r.json().get('mode')=='puter-client'

def test_github_url_parser():
    from app.github_intelligence import parse_repo_url
    assert parse_repo_url('https://github.com/owner/repo') == ('owner','repo')
    assert parse_repo_url('owner/repo.git') == ('owner','repo')

def test_evidence_claim_and_target_evidence():
    client.post("/api/profile/goal",json={"target_role":"Backend Developer","experience":"Early career","goal":"Build reliable APIs"})
    r=client.get('/api/evidence'); assert r.status_code==200
    body=r.json(); assert 'target_evidence' in body and body['target_evidence']
    created=client.post('/api/evidence/claims',json={
        'claim':'I can design reliable APIs',
        'competency':'APIs',
        'target_role':'Backend Developer',
        'evidence_title':'API test suite',
        'evidence_description':'A repeatable suite covers success and failure paths.',
        'evidence_type':'Project artifact'
    })
    assert created.status_code==200 and created.json()['saved'] is True

def test_public_contact():
    r=client.post('/api/contact',json={'name':'Test','email':'test@example.com','subject':'Hello','message':'This is a valid contact smoke test.','rating':5,'category':'Bug report'})
    assert r.status_code==200 and r.json()['received'] is True


def test_private_routes_reject_missing_demo_session():
    unauthenticated = TestClient(app)
    assert unauthenticated.get("/api/v1/competencies").status_code == 401

def test_demo_reset_requires_and_scopes_session():
    unauthenticated = TestClient(app)
    assert unauthenticated.post("/api/v1/demo/reset").status_code == 401
    a, b = str(uuid.uuid4()), str(uuid.uuid4())
    ca = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": a})
    cb = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": b})
    ca.post("/api/v1/profile", json={"name":"Session A","target_role":"Backend Developer","goal":"Test isolation"})
    ca.post("/api/v1/demo/reset")
    assert cb.get("/api/v1/profile").json().get("name") != "Session A"

def test_admin_evidence_is_denied_in_demo_mode():
    assert client.get("/api/v1/admin/evidence").status_code == 403


def test_resume_extract_txt_in_memory():
    response = client.post("/api/v1/resume/extract", files={"file": ("resume.txt", b"Python developer with a tested API project.", "text/plain")})
    assert response.status_code == 200
    body = response.json()
    assert body["extracted"] is True and body["stored"] is False
    assert "tested API project" in body["text"]

def test_resume_extract_rejects_wrong_content():
    response = client.post("/api/v1/resume/extract", files={"file": ("resume.pdf", b"not a pdf", "application/pdf")})
    assert response.status_code == 415


def test_malformed_ai_review_fails_closed():
    from app.routes import _parse_ai_review
    review = _parse_ai_review("The repository contains tests and deployment code, so it must be supported.")
    assert review["valid"] is False
    assert review["supported"] is False
    assert review["review_status"] == "failed-review"

def test_github_parser_rejects_non_repository_paths_and_query():
    from app.github_intelligence import parse_repo_url
    import pytest
    with pytest.raises(ValueError): parse_repo_url("https://github.com/owner/repo/../../evil")
    with pytest.raises(ValueError): parse_repo_url("https://github.com/owner/repo?redirect=https://evil.example")


def test_anonymous_feedback_has_no_fake_email_and_is_session_scoped():
    a_id, b_id = str(uuid.uuid4()), str(uuid.uuid4())
    a = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": a_id})
    b = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": b_id})
    response = a.post("/api/v1/contact", json={"name":"Anonymous user","email":None,"subject":"Feedback: UX","rating":4,"category":"Design","message":"The onboarding needs a clearer next step."})
    assert response.status_code == 200
    # The public response intentionally does not expose workspace feedback records.
    assert "email" not in response.json()
    assert b.get("/api/v1/workspace").status_code == 200


def test_assessment_attempt_id_prevents_duplicate_persistence():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    questions = isolated.get("/api/v1/assessment").json()["questions"]
    from app.routes import _general_assessment_questions
    key = {q["id"]:q["correct"] for q in _general_assessment_questions()}
    payload = {"assessment_id":"adaptive-v1","attempt_id":"repeat-safe-test","answers":{q["id"]:str(key[q["id"]]) for q in questions}}
    first = isolated.post("/api/v1/assessment/submit", json=payload)
    second = isolated.post("/api/v1/assessment/submit", json=payload)
    assert first.status_code == 200 and first.json()["duplicate"] is False
    assert second.status_code == 200 and second.json()["duplicate"] is True
    assert second.json()["score"] == first.json()["score"]

def test_ai_review_schema_rejects_truthy_string_boolean():
    from app.routes import _parse_ai_review
    malformed = '{"supported":"false","confidence":"high","evidence_score":99,"claim_match":"strong","ownership_score":99,"verification_score":99,"message":"ok","detected":[]}'
    assert _parse_ai_review(malformed)["valid"] is False

def test_claim_rejects_unsafe_evidence_url():
    response = client.post("/api/v1/evidence/claims", json={"claim":"I can build an API","competency":"APIs","evidence_title":"Demo API","evidence_url":"javascript:alert(1)"})
    assert response.status_code == 422


def test_browser_ai_review_is_untrusted_and_cannot_create_supporting_evidence():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    created = isolated.post("/api/v1/evidence/claims", json={"claim":"I can secure APIs","competency":"Security","target_role":"Backend Developer","evidence_title":"Claim only","evidence_description":"I say I can do this but provide no artifact."})
    assert created.status_code == 200
    claim_id = created.json()["claim"]["id"]
    fake = {"supported":True,"confidence":"high","evidence_score":99,"claim_match":"strong","ownership_score":99,"verification_score":99,"message":"Excellent evidence","detected":["claimed by user"]}
    reviewed = isolated.post(f"/api/v1/evidence/claims/{claim_id}/ai-review", json={"result":json.dumps(fake),"provider":"puter"})
    assert reviewed.status_code == 200
    assert reviewed.json()["claim"]["status"] == "client-ai-suggestion"
    assert reviewed.json()["claim"]["ai_review"]["supported"] is False
    assert not any(item.get("claim_id") == claim_id for item in isolated.get("/api/v1/evidence").json()["ledger"])

def test_client_cannot_claim_server_provider_result():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    created = isolated.post("/api/v1/evidence/claims", json={"claim":"I can secure APIs","competency":"Security","evidence_title":"Claim only"})
    claim_id = created.json()["claim"]["id"]
    fake = {"supported":True,"confidence":"high","evidence_score":99,"claim_match":"strong","ownership_score":99,"verification_score":99,"message":"Looks good","detected":[]}
    response = isolated.post(f"/api/v1/evidence/claims/{claim_id}/ai-review", json={"result":json.dumps(fake),"provider":"unknown-provider"})
    assert response.status_code == 400


def test_fresh_demo_starts_without_seeded_evidence_or_skill_scores():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    evidence = isolated.get("/api/v1/evidence").json()
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert evidence["ledger"] == []
    assert evidence["summary"]["total_evidence"] == 0
    assert all(item["status"] == "No practice signal yet" and item["evidence"] == 0 for item in dashboard["competencies"])
    assert dashboard["goal_progress"] is None


def test_analytics_uses_workspace_records_and_exposes_definitions():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.get("/api/v1/analytics")
    assert response.status_code == 200
    body = response.json()
    assert "claim_status_counts" in body
    assert "competency_signals" in body
    assert "metric_definitions" in body
    assert body["evidence_count"] == 0
    assert body["has_competency_signal"] is False
    assert body["activity_scores"] == []
    assert body["activity_counts"]["total_scored_activities"] == 0
    assert body["role_progress"]["unassessed_skill_count"] == 0


def test_ai_history_can_be_cleared_for_current_workspace():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    saved = isolated.post("/api/v1/ai/history", json={"item": {"role": "user", "text": "Test message"}})
    assert saved.status_code == 200
    assert isolated.get("/api/v1/ai/history").json()["items"]
    cleared = isolated.delete("/api/v1/ai/history")
    assert cleared.status_code == 200 and cleared.json()["cleared"] is True
    assert isolated.get("/api/v1/ai/history").json()["items"] == []


def test_unsupported_interview_provider_is_rejected_instead_of_silently_routed():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/interview/start", json={
        "role": "Embedded Systems Engineer",
        "interview_type": "Embedded Systems",
        "level": "Entry",
        "provider": "unknown-provider",
        "model": "test-model",
        "question_number": 1,
        "total_questions": 3
    })
    assert response.status_code == 400
    assert "only supports its configured AI service" in response.json()["error"]["message"]


def test_abuse_prone_routes_have_tighter_rate_limits():
    from app.main import _rate_limit_for
    assert _rate_limit_for("/api/v1/contact") <= 5
    assert _rate_limit_for("/api/v1/resume/extract") <= 10
    assert _rate_limit_for("/api/v1/github/analyze") <= 10
    assert _rate_limit_for("/api/v1/ai/history") <= 20


def test_api_rate_limit_middleware_returns_429(monkeypatch):
    from app import main as main_module
    monkeypatch.setattr(main_module, "_rate_limit_for", lambda _path: 1)
    probe = "/api/v1/__rate_limit_test_probe__"
    first = client.get(probe)
    assert first.status_code == 404
    second = client.get(probe)
    assert second.status_code == 429
    assert second.headers.get("retry-after")


def test_evidence_claim_without_ai_consent_is_saved_without_provider_review():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/evidence/claims", json={"claim":"I can build APIs","competency":"APIs","evidence_title":"API project","evidence_description":"A local project description without a linked artifact."})
    assert response.status_code == 200
    assert response.json()["saved"] is True
    assert response.json()["ai"]["mode"] == "consent-required"
    assert response.json()["claim"]["status"] == "awaiting-ai-consent"


def test_workspace_changes_survive_a_cache_reset_without_explicit_persist_calls():
    """Settings are saved by a route with no explicit persist(); the middleware must still store them."""
    from app.core.workspace import workspace_store
    sid = str(uuid.uuid4())
    c = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": sid})
    assert c.post("/api/v1/settings", json={"ai_provider": "puter", "language": "Hindi", "appearance": "light"}).status_code == 200
    workspace_store._cache.pop(f"demo-{sid}", None)  # simulate a server restart
    assert c.get("/api/v1/settings").json()["language"] == "Hindi"


def test_rate_limit_buckets_are_per_demo_session():
    from app import main as main_module
    from starlette.requests import Request

    def make(session):
        scope = {"type": "http", "headers": [(b"x-skillsetra-demo-session", session.encode())], "client": ("127.0.0.1", 1)}
        return Request(scope)

    assert main_module._client_identity(make("a")) != main_module._client_identity(make("b"))


def test_learning_link_rejects_non_http_urls():
    c = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    bad = c.post("/api/v1/learning-links", json={"field": "Python", "title": "x", "url": "javascript:alert(1)"})
    assert bad.status_code == 422


def test_reselect_role_preserves_existing_evidence_and_assessment_history():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    created = isolated.post("/api/v1/evidence/claims", json={
        "claim": "I can build reliable APIs",
        "competency": "APIs",
        "target_role": "Backend Developer",
        "evidence_title": "API test project",
        "evidence_description": "A test suite covers successful and failing API requests."
    })
    assert created.status_code == 200
    questions = isolated.get("/api/v1/assessment").json()["questions"]
    attempt = isolated.post("/api/v1/assessment/submit", json={"assessment_id":"preserve-history-test","attempt_id":"preserve-history-attempt","answers":{q["id"]:"0" for q in questions}})
    assert attempt.status_code == 200
    before = isolated.get("/api/v1/evidence").json()
    response = isolated.post("/api/v1/profile/reselect-role", json={
        "target_role": "Full-Stack Developer",
        "experience": "Early career",
        "goal": "Build a full-stack portfolio"
    })
    assert response.status_code == 200
    assert response.json()["history_preserved"] is True
    after = isolated.get("/api/v1/evidence").json()
    assert after["summary"]["claims"] == before["summary"]["claims"]
    assert after["claims"][0]["claim"] == "I can build reliable APIs"
    assert len(isolated.get("/api/v1/analytics").json()["assessment_scores"]) == 1
    assert isolated.get("/api/v1/profile").json()["target_role"] == "Full-Stack Developer"


def test_invalid_assessment_submission_does_not_mutate_empty_target_role():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    assessment = isolated.get("/api/v1/assessment?role=Backend%20Developer").json()
    invalid = isolated.post("/api/v1/assessment/submit", json={
        "assessment_id": assessment["id"], "attempt_id": "invalid-role-attempt", "answers": {"not-a-real-question-id":"0"}
    })
    assert invalid.status_code == 400
    assert isolated.get("/api/v1/profile").json().get("target_role", "") == ""


def test_first_role_specific_assessment_sets_active_role_and_appears_in_analytics():
    session_id = str(uuid.uuid4())
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": session_id})
    assert isolated.get("/api/v1/profile").json().get("target_role", "") == ""
    assessment = isolated.get("/api/v1/assessment?role=Backend%20Developer").json()
    from app.assessment_bank import role_questions
    key = {q["id"]: q["correct"] for q in role_questions("Backend Developer")}
    answers = {q["id"]: str(key[q["id"]]) for q in assessment["questions"]}
    submitted = isolated.post("/api/v1/assessment/submit", json={
        "assessment_id": assessment["id"], "attempt_id": "first-role-assessment", "answers": answers
    })
    assert submitted.status_code == 200
    assert submitted.json()["role_progress"]["role"] == "Backend Developer"
    # Simulate a backend process/cache restart while retaining the same demo-session key.
    from app.core.workspace import workspace_store
    workspace_store._cache.pop(f"demo-{session_id}", None)
    profile = isolated.get("/api/v1/profile").json()
    assert profile["target_role"] == "Backend Developer"
    analytics = isolated.get("/api/v1/analytics").json()
    assert analytics["selected_role"] == "Backend Developer"
    assert len(analytics["assessment_scores"]) == 1
    assert analytics["activity_counts"]["total_scored_activities"] >= 1
    assert analytics["selected_role_activity_counts"]["total_scored_activities"] >= 1
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert dashboard["role_progress"]["role"] == "Backend Developer"
    assert dashboard["role_progress"]["score"] is not None


def test_legacy_saved_assessment_history_backfills_missing_role_signals():
    import app.routes as routes
    session_id = f"legacy-v15-{uuid.uuid4()}"
    routes.state.bind(session_id)
    try:
        workspace = routes.state._current()
        workspace["profile"]["target_role"] = "Backend Developer"
        workspace["assessment_attempts"] = [{
            "role":"Backend Developer", "completed_at":"2026-10-01", "source":"Role-specific question bank",
            "answers":[
                {"competency":"APIs","role_competency":"APIs","answered":True,"is_correct":True},
                {"competency":"Testing","role_competency":"Testing","answered":True,"is_correct":False},
            ],
        }]
        workspace["challenge_attempts"] = []
        workspace["role_skill_progress"] = {}
        workspace["role_skill_signal_history"] = {}
        workspace.pop("_role_progress_history_migrated_v15",None)
        routes.backfill_legacy_role_progress()
        progress = workspace["role_skill_progress"]["Backend Developer"]
        assert progress["APIs"] == 100
        assert progress["Testing"] == 0
    finally:
        routes.state.reset(session_id)


def test_assessment_updates_progress_from_real_answers_but_not_from_ai_claim_scores():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Early career","goal":"Improve API skills"})
    questions = isolated.get("/api/v1/assessment").json()["questions"]
    from app import assessment_bank
    key = {q["id"]: q["correct"] for q in assessment_bank.role_questions("Backend Developer")}
    answers = {q["id"]: str((key[q["id"]] + 1) % 4) for q in questions}  # everything wrong ...
    for q in questions:
        if q["competency"] == "Testing": answers[q["id"]] = str(key[q["id"]])  # ... except Testing
    submitted = isolated.post("/api/v1/assessment/submit", json={"assessment_id":"progress-test","attempt_id":"progress-test-1","answers":answers})
    assert submitted.status_code == 200
    dashboard = isolated.get("/api/v1/dashboard").json()
    signals = {item["name"]: item for item in dashboard["competencies"]}
    assert signals["Testing"]["evidence"] == 100
    assert signals["Testing"]["status"] == "High practice signal"
    assert dashboard["goal_progress"] is not None
    before = signals["Testing"]["evidence"]
    isolated.post("/api/v1/evidence/claims", json={"claim":"I am excellent at testing","competency":"Testing","evidence_title":"Claim only","evidence_description":"No test artifact is attached."})
    after = {item["name"]: item for item in isolated.get("/api/v1/dashboard").json()["competencies"]}["Testing"]["evidence"]
    assert after == before, "Claim-only records must not inflate assessment progress."


def test_removed_provider_is_rejected_by_challenge_route():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/challenges/debug-1/submit", json={
        "answer":"I would preserve valid records, quarantine malformed records, add integration tests, and verify the debugging path.",
        "provider":"other-provider", "model":"test-model"
    })
    assert response.status_code == 400
    assert "only supports its configured AI service" in response.json()["error"]["message"]


def test_unknown_target_role_does_not_borrow_default_role_progress_or_salary_data():
    from app.routes import career_data, target_goal_progress
    assert target_goal_progress("Invented Role") is None
    result = career_data("Invented Role")
    assert result["market"] == []
    assert result["market_available"] is False
    assert "No competency template" in result["market_status"]


def test_learning_link_ids_do_not_reuse_deleted_ids():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    def create(title):
        return isolated.post("/api/v1/learning-links", json={"field":"Python","title":title,"url":"https://docs.python.org/3/","kind":"Documentation"})
    first = create("Python docs A").json()["item"]["id"]
    second = create("Python docs B").json()["item"]["id"]
    assert first != second
    assert isolated.delete(f"/api/v1/learning-links/{first}").status_code == 200
    third = create("Python docs C").json()["item"]["id"]
    assert third not in {first, second}


def test_custom_target_role_does_not_crash_career_intelligence_or_borrow_another_role():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    saved = isolated.post("/api/v1/profile/goal", json={"target_role":"Custom Research Engineer","experience":"Early career","goal":"Explore a new field"})
    assert saved.status_code == 200
    response = isolated.get("/api/v1/career/intelligence")
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "Custom Research Engineer"
    assert body["matrix"] == []
    assert body["market"] == []
    assert "No competency template" in body["market_status"]


def test_fresh_workspace_does_not_assume_ml_engineer_target_role():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    profile = isolated.get("/api/v1/profile").json()
    evidence = isolated.get("/api/v1/evidence").json()
    career = isolated.get("/api/v1/career/intelligence").json()
    assessment = isolated.get("/api/v1/assessment").json()
    assert profile["target_role"] == ""
    assert evidence["target_role"] == ""
    assert evidence["target_evidence"] == []
    assert career["role"] == "Target role not set"
    assert career["matrix"] == []
    assert assessment["role"] == "General competency baseline"


# ---- role-specific questions, tracks, reasons, public contact (Pass 7) ----------------------------

def _fresh():
    return TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})


def test_every_supported_role_gets_its_own_questions():
    from app.data import ROLES
    seen = {}
    c = _fresh()
    for role in [r["name"] for r in ROLES]:
        data = c.get("/api/v1/assessment", params={"role": role}).json()
        assert data["role"] == role
        assert data["id"].startswith("role-")
        assert len(data["questions"]) == 8
        assert all("correct" not in q and "explanation" not in q for q in data["questions"])
        seen[role] = tuple(q["question"] for q in data["questions"])
    assert len(set(seen.values())) == len(seen), "Each role must have a different question set."


def test_reselecting_role_changes_served_questions():
    c = _fresh()
    c.post("/api/v1/profile/goal", json={"target_role": "Data Analyst", "experience": "Early career", "goal": "x"})
    first = c.get("/api/v1/assessment").json()
    c.post("/api/v1/profile/reselect-role", json={"target_role": "Cybersecurity", "experience": "Early career", "goal": "x"})
    second = c.get("/api/v1/assessment").json()
    assert first["role"] == "Data Analyst" and second["role"] == "Cybersecurity"
    assert {q["question"] for q in first["questions"]} != {q["question"] for q in second["questions"]}


def test_unknown_role_query_is_rejected():
    assert _fresh().get("/api/v1/assessment", params={"role": "Wizard"}).status_code == 400


def test_tracks_have_distinct_questions_and_unknown_track_404s():
    c = _fresh()
    catalog = c.get("/api/v1/assessments/catalog").json()["items"]
    sets = {}
    for item in catalog:
        data = c.get("/api/v1/assessment", params={"track": item["id"]}).json()
        assert data["id"] == f"track-{item['id']}" and len(data["questions"]) == item["questions"]
        sets[item["id"]] = tuple(q["question"] for q in data["questions"])
    assert len(set(sets.values())) == len(sets)
    assert c.get("/api/v1/assessment", params={"track": "nope"}).status_code == 404


def test_submit_returns_reasons_for_every_question_including_unanswered():
    from app import assessment_bank
    c = _fresh()
    c.post("/api/v1/profile/goal", json={"target_role": "DevOps Engineer", "experience": "Early career", "goal": "x"})
    data = c.get("/api/v1/assessment").json()
    key = {q["id"]: q["correct"] for q in assessment_bank.role_questions("DevOps Engineer")}
    first = data["questions"][0]
    result = c.post("/api/v1/assessment/submit", json={"assessment_id": data["id"], "attempt_id": "reasons-1", "answers": {first["id"]: str(key[first["id"]])}}).json()
    assert result["total"] == 8 and result["correct"] == 1
    assert len(result["details"]) == 8
    assert all(d["why"] and d["expected"] for d in result["details"])
    assert result["details"][0]["is_correct"] is True and result["details"][1]["answered"] is False


def test_submit_rejects_answers_that_do_not_belong_to_the_assessment():
    c = _fresh()
    data = c.get("/api/v1/assessment", params={"role": "Data Scientist"}).json()
    response = c.post("/api/v1/assessment/submit", json={"assessment_id": data["id"], "answers": {"q1": "0"}})
    assert response.status_code == 400


def test_public_contact_works_without_a_session_and_validates():
    anon = TestClient(app)
    ok = anon.post("/api/v1/contact/public", json={"name": "Visitor", "subject": "Hello there", "message": "A question about privacy requests.", "category": "Privacy or data request"})
    assert ok.status_code == 200 and ok.json()["received"] is True
    bad = anon.post("/api/v1/contact/public", json={"name": "V", "email": "nope", "subject": "Hello there", "message": "A question about privacy requests."})
    assert bad.status_code == 422


def test_materials_static_mount_is_gone_and_only_documents_are_served():
    anon = TestClient(app)
    assert anon.get("/materials-static/README.md").status_code in {404, 405}
    c = _fresh()
    assert c.get("/api/v1/materials/file/README.md").status_code == 404
    assert c.get("/api/v1/materials/file/../../backend/app/routes.py").status_code in {404, 400}


def test_ai_browser_practice_updates_role_coverage_as_unverified_signal():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Early career","goal":"Improve API delivery"})
    response = isolated.post("/api/v1/practice/record-result", json={
        "source":"browser-ai-practice", "title":"Backend Developer AI practice", "assessment_id":"ai-practice-test",
        "role":"Backend Developer", "correct":2, "total":2,
        "competency_scores":[
            {"competency":"APIs","score":100,"answered":1,"total":1},
            {"competency":"Testing","score":100,"answered":1,"total":1},
        ],
    })
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 100 and body["client_scored"] is True
    assert body["role_progress"]["required_skill_count"] == 6
    assert body["role_progress"]["assessed_skill_count"] == 2
    assert body["role_progress"]["assessment_coverage_percent"] == 33
    assert body["role_progress"]["evidence_coverage_percent"] == 0
    assert "unverified" in body["notice"].lower()
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert dashboard["role_progress"]["score"] == body["role_progress"]["score"]
    targets = {item["competency"]: item for item in isolated.get("/api/v1/evidence").json()["target_evidence"]}
    assert targets["APIs"]["status"] == "assessed"
    assert targets["APIs"]["assessment_count"] == 1


def test_onboarding_baseline_practice_is_saved_to_role_analytics_and_evidence_gaps():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    assert isolated.get("/api/v1/profile").json().get("target_role", "") == ""
    response = isolated.post("/api/v1/practice/record-result", json={
        "source":"browser-ai-practice", "title":"Backend Developer onboarding baseline",
        "assessment_id":"onboarding-baseline-v1", "role":"Backend Developer", "correct":3, "total":6,
        "competency_scores":[
            {"competency":"Role fundamentals","score":50,"answered":1,"total":2},
            {"competency":"Testing","score":100,"answered":1,"total":1},
        ],
    })
    assert response.status_code == 200, response.text
    assert isolated.get("/api/v1/profile").json()["target_role"] == "Backend Developer"
    analytics = isolated.get("/api/v1/analytics").json()
    assert analytics["selected_role"] == "Backend Developer"
    assert any("onboarding baseline" in str(row.get("title", "")).lower() for row in analytics["assessment_scores"])
    assert analytics["selected_role_activity_counts"]["assessment_practice"] >= 1
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert dashboard["role_progress"]["score"] is not None
    target = isolated.get("/api/v1/evidence").json()["target_evidence"]
    assert any(skill["status"] == "assessed" for skill in target)
    assert any(skill["assessment_count"] > 0 for skill in target)


def test_client_scored_practice_rejects_excessive_question_count():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/practice/record-result", json={
        "source":"browser-ai-practice", "correct":21, "total":21,
        "competency_scores":[{"competency":"APIs","score":100,"answered":21,"total":21}],
    })
    assert response.status_code == 422


def test_repeated_good_and_bad_assessment_results_move_skill_signal_down_when_needed():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Early career","goal":"Improve testing"})
    data = isolated.get("/api/v1/assessment").json()
    from app.assessment_bank import role_questions
    key = {q["id"]:q["correct"] for q in role_questions("Backend Developer")}
    correct_answers = {q["id"]:str(key[q["id"]]) for q in data["questions"]}
    good = isolated.post("/api/v1/assessment/submit", json={"assessment_id":data["id"],"attempt_id":"signal-good","answers":correct_answers})
    assert good.status_code == 200
    assert good.json()["role_progress"]["score"] is not None
    before = {s["competency"]:s["signal_percent"] for s in good.json()["role_progress"]["skills"]}
    bad_answers = {qid:str((int(value)+1)%4) for qid,value in correct_answers.items()}
    bad = isolated.post("/api/v1/assessment/submit", json={"assessment_id":data["id"],"attempt_id":"signal-bad","answers":bad_answers})
    assert bad.status_code == 200
    after = {s["competency"]:s["signal_percent"] for s in bad.json()["role_progress"]["skills"]}
    assert any(after[name] < score for name,score in before.items() if score > 0)


def test_interview_question_handoff_uses_selected_difficulty_and_mode():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Intermediate","goal":"Practice system design"})
    response = isolated.post("/api/v1/interview/start", json={
        "role":"Backend Developer", "interview_type":"System Design", "level":"Intermediate",
        "language":"English", "provider":"puter", "model":"openai/gpt-oss-20b",
        "focus":"System design", "difficulty":"Expert", "mode":"Live Interview",
        "question_number":2,"total_questions":3,
        "previous_question":"How would you design a cache?",
        "previous_answer":"I would use a bounded cache and monitor hit rate."
    })
    assert response.status_code == 200
    body=response.json()
    assert body["mode"] == "puter-client"
    assert "Expert" in body["prompt"] and "Live Interview" in body["prompt"]
    assert "bounded cache" in body["prompt"] and "follow-up" in body["prompt"]
    assert body["provider"] == "puter"


def test_client_scored_interview_appears_as_interview_in_analytics():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    assert isolated.get("/api/v1/profile").json().get("target_role", "") == ""
    saved = isolated.post("/api/v1/practice/record-result", json={
        "source":"interview-practice", "title":"System Design interview · APIs", "score":80,
        "role":"Backend Developer", "competency":"APIs",
        "competency_scores":[
            {"competency":"APIs","score":80,"answered":1,"total":1},
            {"competency":"Communication","score":70,"answered":1,"total":1},
            {"competency":"Leadership","score":65,"answered":1,"total":1},
        ],
    })
    assert saved.status_code == 200
    assert isolated.get("/api/v1/profile").json()["target_role"] == "Backend Developer"
    analytics = isolated.get("/api/v1/analytics").json()
    assert analytics["activity_counts"]["interviews"] == 1
    assert analytics["interview_scores"][0]["score"] == 80
    assert analytics["interview_scores"][0]["type"] == "interview"
    assert any(item["type"] == "interview" and item["score"] == 80 for item in analytics["activity_scores"])
    assert analytics["role_progress"]["interview_attempt_count"] == 1
    communication = next(x for x in analytics["role_progress"]["skills"] if x["competency"] == "Communication")
    assert communication["has_signal"] is True
    assert communication["signal_percent"] == 70  # client-scored signals are capped at 75
    leadership = next(x for x in analytics["competency_signals"] if x["name"] == "Leadership")
    assert leadership["signal"] == 65


def test_settings_rejects_removed_ai_provider_names():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/settings", json={"ai_provider":"unsupported-provider"})
    assert response.status_code == 422
    assert isolated.get("/api/v1/settings").json()["ai_provider"] == "puter"


def test_project_defense_updates_role_relevant_practice_signal():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Intermediate","goal":"Build reliable services"})
    response = isolated.post("/api/v1/project-defense", json={
        "project_id":"demo-project","question":"How would you design and test this service?",
        "answer":"I chose this design because it is reliable. The trade-off is cost, so I would test, verify, measure security and scale failure cases.",
        "provider":"puter","language":"English",
    })
    assert response.status_code == 200
    assert response.json()["signal_update"]["competency"] == "System Design"
    assert response.json()["role_progress"]["assessed_skill_count"] >= 1


def test_reasoning_lab_contributes_to_target_role_progress_without_replacing_global_reasoning():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role":"Backend Developer","experience":"Intermediate","goal":"Improve technical reasoning"})
    response = isolated.post("/api/v1/reasoning/analyze", json={
        "problem":"A service latency increase requires diagnosis.",
        "answer":"Because the evidence suggests saturation, I would compare metrics, test an alternative hypothesis, evaluate trade-offs and verify with a measured benchmark.",
        "provider":"puter","language":"English",
    })
    assert response.status_code == 200
    progress = response.json()["role_progress"]
    assert progress["assessed_skill_count"] >= 1
    system_skill = next(skill for skill in progress["skills"] if skill["competency"] == "System Design")
    assert system_skill["has_signal"] is True and system_skill["practice_attempt_count"] >= 1
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert any(skill["name"] == "Reasoning" and skill["evidence"] > 0 for skill in dashboard["competencies"])


def test_claim_with_blank_optional_title_is_persisted():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/evidence/claims", json={
        "claim": "I can design and test reliable REST APIs",
        "competency": "APIs",
        "target_role": "Backend Developer",
        "evidence_title": "",
        "evidence_description": "I designed endpoints and tested valid and invalid requests.",
        "evidence_type": "Project artifact",
        "ai_consent": False,
    })
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["saved"] is True
    assert body["claim"]["evidence_title"] == "Self-declared claim"
    assert body["claim"]["status"] == "awaiting-ai-consent"
    workspace = isolated.get("/api/v1/evidence")
    assert workspace.status_code == 200
    assert any(item["id"] == body["claim"]["id"] for item in workspace.json()["claims"])


def test_blind_transfer_retest_result_is_saved_and_counted_as_practice():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/practice/record-result", json={
        "source":"blind-transfer-practice", "title":"Blind transfer · Testing", "role":"Backend Developer",
        "competency":"Testing", "correct":3, "total":5,
        "competency_scores":[{"competency":"Testing","score":60,"answered":5,"total":5}],
    })
    assert response.status_code == 200, response.text
    assert response.json()["score"] == 60
    analytics = isolated.get("/api/v1/analytics").json()
    assert any("blind-transfer" in str(x.get("source", "")).lower() for x in analytics["activity_scores"])
    assert analytics["selected_role_activity_counts"]["total_scored_activities"] == 1
    testing = next(x for x in analytics["role_progress"]["skills"] if x["competency"] == "Testing")
    assert testing["practice_attempt_count"] == 1
    assert testing["has_signal"] is True


def test_personalized_practice_compiler_saves_low_weight_role_signal():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/practice/record-result", json={
        "source":"personalized-practice-compiler", "title":"Testing · changed context", "role":"Backend Developer",
        "competency":"Testing", "score":88,
        "competency_scores":[{"competency":"Testing","score":88,"answered":1,"total":1}],
    })
    assert response.status_code == 200, response.text
    assert response.json()["client_scored"] is True
    assert "unverified" in response.json()["source"].lower()
    testing = next(x for x in response.json()["role_progress"]["skills"] if x["competency"] == "Testing")
    assert testing["has_signal"] is True
    assert testing["signal_percent"] <= 75
    assert testing["practice_attempt_count"] == 1
    analytics = isolated.get("/api/v1/analytics").json()
    assert analytics["selected_role_activity_counts"]["total_scored_activities"] == 1
    assert sum(1 for x in analytics["activity_scores"] if x.get("title") == "Testing · changed context") == 1


def test_interview_evaluation_prompt_scores_leadership_explicitly():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/interview/evaluate", json={
        "session_id":"interview-test", "question":"Tell me how you handled a conflict on a team.",
        "answer":"I clarified responsibilities, helped the team agree on priorities and followed up on the decision.",
        "language":"English", "provider":"puter", "model":"openai/gpt-oss-20b", "role":"Backend Developer",
        "competency":"Leadership", "interview_type":"Managerial", "difficulty":"Advanced", "mode":"Hiring-manager round",
    })
    assert response.status_code == 200, response.text
    body=response.json()
    assert body["mode"] == "puter-client"
    assert "leadership" in body["prompt"].lower()
    assert "communication" in body["prompt"].lower()


def test_test_interview_prompt_is_structured_and_voice_question_only():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/interview/start", json={
        "role":"Backend Developer", "interview_type":"Technical", "level":"Intermediate",
        "language":"English", "provider":"puter", "model":"openai/gpt-oss-20b",
        "focus":"Role fundamentals", "difficulty":"Advanced", "mode":"Test Interview",
        "question_number":1,"total_questions":3,
        "previous_question":"Should not affect independent test question",
        "previous_answer":"Prior test answer"
    })
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "puter-client"
    assert "structured voice-only interview test" in body["prompt"]
    assert "output only the question" in body["prompt"]
    assert "Prior test answer" not in body["prompt"]


def test_untimed_english_training_interview_prompt_is_level_adapted_and_english_only():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/interview/start", json={
        "role": "Backend Developer", "interview_type": "Behavioral / HR", "level": "Entry",
        "language": "English", "provider": "puter", "model": "openai/gpt-oss-20b",
        "focus": "English Speaking Training - Round 1 (Untimed)", "mode": "Live Interview",
        "difficulty": "Beginner", "question_number": 1, "total_questions": 3,
        "english_training": True, "english_level": "Beginner", "time_limit_minutes": 0,
    })
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "puter-client"
    prompt = body["prompt"]
    assert "Round 1 untimed English practice" in prompt
    assert "Speak ONLY English" in prompt
    assert "very simple everyday English" in prompt
    assert "Beginner" in prompt


def test_english_training_evaluation_requests_transcript_safe_coaching_fields():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/interview/evaluate", json={
        "session_id": "english-training-test", "question": "Tell me about your favourite project.",
        "answer": "I build a website and test the feature.", "language": "English", "provider": "puter",
        "model": "openai/gpt-oss-20b", "role": "Backend Developer", "competency": "Communication",
        "interview_type": "Behavioral / HR", "difficulty": "Beginner", "mode": "Live Interview",
        "english_training": True, "english_level": "Basic",
    })
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mode"] == "puter-client"
    assert "english_score_10" in body["prompt"]
    assert "corrected_sentence" in body["prompt"]
    assert "ignore likely transcription artefacts" in body["prompt"]
    assert "Write all English-training feedback in English" in body["prompt"]


def test_github_analysis_refuses_private_repositories_even_with_server_token(monkeypatch):
    import asyncio
    import pytest
    import app.github_intelligence as gh

    async def fake_github_request(path, token=""):
        assert path == "/repos/owner/private-repo"
        return {"private": True, "default_branch": "main"}

    monkeypatch.setattr(gh, "github_request", fake_github_request)
    with pytest.raises(ValueError, match="Only public GitHub repositories"):
        asyncio.run(gh.analyze_public_repo("https://github.com/owner/private-repo", "server-wide-token"))


def test_custom_roadmap_material_rejects_unsafe_url_and_bounds_fields():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    unsafe = isolated.post("/api/v1/roadmap/materials", json={"field":"Web","topic":"Links","title":"Unsafe","url":"javascript:alert(1)"})
    assert unsafe.status_code == 422
    oversized = isolated.post("/api/v1/roadmap/materials", json={"field":"x"*121,"title":"Valid title","url":"https://example.com/resource"})
    assert oversized.status_code == 422



def test_interview_start_includes_all_previous_questions_for_deduplication():
    import uuid
    c = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    previous = ["What is a cache and why is it useful?", "How would you debug a slow API?"]
    response = c.post("/api/v1/interview/start", json={
        "role": "Backend Developer", "interview_type": "Technical", "mode": "Test Interview",
        "provider": "puter", "model": "openai/gpt-oss-20b", "question_number": 3,
        "total_questions": 5, "previous_questions": previous,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "puter-client"
    assert "avoid repetition" in body["prompt"]
    assert all(question in body["prompt"] for question in previous)


def test_interview_start_rejects_oversized_previous_question_history():
    import uuid
    c = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = c.post("/api/v1/interview/start", json={
        "role": "Backend Developer", "provider": "puter", "question_number": 2,
        "previous_questions": [f"Question {i}?" for i in range(21)],
    })
    assert response.status_code == 422


def test_interview_start_rejects_oversized_previous_question_text():
    import uuid
    c = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = c.post("/api/v1/interview/start", json={
        "role": "Backend Developer", "provider": "puter", "question_number": 2,
        "previous_questions": ["Q" * 2001],
    })
    assert response.status_code == 422


def test_production_mode_rejects_demo_sessions(monkeypatch):
    # A public demo identifier must not authenticate workspace routes in production mode.
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "demo_mode", True)
    protected = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = protected.get("/api/v1/profile")
    assert response.status_code == 503
    assert "Demo mode is disabled for production" in response.json()["error"]["message"]


def test_project_upload_analyzes_zip_source_without_executing_it():
    import io
    import zipfile
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("src/main.py", 'print("hello uploaded project")\n')
        archive.writestr("node_modules/untrusted/ignored.js", 'throw new Error("not analyzed")')
    response = isolated.post("/api/v1/projects/analyze-upload", files={
        "files": ("sample-project.zip", archive_buffer.getvalue(), "application/zip")
    }, data={"name": "Uploaded Demo", "provider": "puter", "model": "openai/gpt-oss-20b", "language": "English"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["project"]["name"] == "Uploaded Demo"
    assert body["analysis_only"] is True
    assert 'print("hello uploaded project")' in body["ai_analysis"]
    assert "read-only project review" in body["ai_analysis"].lower()
    assert "not analyzed" not in body["ai_analysis"]


def test_project_upload_rejects_files_without_readable_source_or_description():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    response = isolated.post("/api/v1/projects/analyze-upload", files={
        "files": ("binary.bin", b"\x00\x01\x02", "application/octet-stream")
    }, data={"name": "Binary Project", "provider": "puter", "model": "openai/gpt-oss-20b"})
    assert response.status_code == 400, response.text
    assert "No readable text" in str(response.json().get("detail") or response.json().get("error", {}).get("message", ""))


def test_project_analysis_is_read_only_and_does_not_change_goal_or_role_progress():
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    profile_before = isolated.get("/api/v1/profile").json()
    projects_before = isolated.get("/api/v1/projects").json()
    evidence_before = isolated.get("/api/v1/evidence").json()
    created = isolated.post("/api/v1/projects/analyze", json={
        "name": "Test API project",
        "description": "A Python FastAPI service with pytest tests and deployment documentation.",
        "provider": "puter"
    })
    assert created.status_code == 200
    assert created.json()["analysis_only"] is True
    assert created.json()["project"]["status"].startswith("Analysis only")
    profile_after = isolated.get("/api/v1/profile").json()
    projects_after = isolated.get("/api/v1/projects").json()
    evidence_after = isolated.get("/api/v1/evidence").json()
    assert profile_after == profile_before
    assert projects_after == projects_before
    assert evidence_after == evidence_before


def test_resume_draft_is_persisted_in_current_workspace():
    payload = {"form":{"name":"Test Learner","role":"Backend Developer","skills":"Python, APIs"},"projects":[{"id":"p1","name":"API Demo","repoUrl":"https://github.com/example/api","demoUrl":""}]}
    saved = client.post("/api/v1/resume/draft", json=payload)
    assert saved.status_code == 200 and saved.json()["saved"] is True
    loaded = client.get("/api/v1/resume/draft")
    assert loaded.status_code == 200
    assert loaded.json()["draft"]["form"]["name"] == "Test Learner"
    assert loaded.json()["draft"]["projects"][0]["repoUrl"] == "https://github.com/example/api"


def test_claim_coverage_increases_pathway_progress_not_performance_signal():
    client.post("/api/profile/goal", json={"target_role":"Backend Developer","experience":"Early career","goal":"Build APIs"})
    before = client.get("/api/evidence").json()["role_progress"]
    created = client.post("/api/evidence/claims", json={"claim":"I can build REST APIs","competency":"APIs","target_role":"Backend Developer","evidence_title":"API claim","evidence_description":"I implemented endpoints and need to attach tests."})
    assert created.status_code == 200
    after = client.get("/api/evidence").json()["role_progress"]
    assert after["claim_coverage_percent"] >= before.get("claim_coverage_percent", 0)
    assert after["progress_percent"] >= before.get("progress_percent", 0)
    assert after.get("score") == before.get("score")


def test_resume_project_mentions_increase_pathway_coverage_not_performance_signal():
    import uuid
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    role = "Backend Developer"
    assert isolated.post("/api/profile/goal", json={"target_role": role, "experience": "Early career", "goal": "Build backend services"}).status_code == 200
    before = isolated.get("/api/evidence").json()["role_progress"]
    saved = isolated.post("/api/v1/resume/draft", json={"form":{"role": role}, "projects":[{"name":"API Service", "description":"Built REST APIs and added automated testing in Python", "stack":"FastAPI, Python, Testing"}]})
    assert saved.status_code == 200, saved.text
    after = isolated.get("/api/evidence").json()["role_progress"]
    assert after["claim_coverage_percent"] > before["claim_coverage_percent"]
    assert after["progress_percent"] >= before["progress_percent"]
    assert after.get("score") == before.get("score")


def test_claim_ids_remain_unique_for_concurrent_style_creates():
    import uuid
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    role = "Backend Developer"
    isolated.post("/api/profile/goal", json={"target_role": role, "experience": "Early career", "goal": "Build APIs"})
    payload = {"claim":"I can build tested REST APIs", "competency":"APIs", "target_role":role,"evidence_description":"A saved self claim to attach proof to."}
    first = isolated.post("/api/evidence/claims", json=payload)
    second = isolated.post("/api/evidence/claims", json=payload)
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["claim"]["id"] != second.json()["claim"]["id"]


def test_synonym_claim_matches_role_skill_coverage_without_raising_performance_signal():
    import uuid
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/profile/goal", json={"target_role":"Backend Developer","experience":"Early career","goal":"Build APIs"})
    before = isolated.get("/api/evidence").json()["role_progress"]
    response = isolated.post("/api/evidence/claims", json={"claim":"I build REST API endpoints and add tests", "competency":"REST API Development", "target_role":"Backend Developer", "evidence_description":"Self-described work on API endpoints pending independent repository review."})
    assert response.status_code == 200, response.text
    after = isolated.get("/api/evidence").json()["role_progress"]
    assert after["claim_coverage_percent"] >= before["claim_coverage_percent"]
    assert after["progress_percent"] >= before["progress_percent"]
    assert after.get("score") == before.get("score")


def test_claim_knowledge_check_scores_four_answers_and_keeps_answer_keys_private():
    import uuid
    from app import assessment_bank
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    role = "Backend Developer"
    assert isolated.post("/api/v1/profile/goal", json={"target_role": role, "experience": "Early career", "goal": "Build APIs"}).status_code == 200
    payload = {
        "claim": "I build tested REST APIs, validate requests and document failure cases",
        "competency": "APIs",
        "target_role": role,
        "evidence_title": "REST API project repository",
        "evidence_description": "Implemented API endpoints, validated request inputs, added success and failure tests, documented the setup, and reviewed the behavior with repeatable sample requests.",
        "evidence_url": "https://github.com/example/rest-api-project",
        "ai_consent": True,
    }
    created = isolated.post("/api/v1/evidence/claims", json=payload)
    assert created.status_code == 200, created.text
    assert created.json()["saved"] is True
    assert created.json()["ai"]["mode"] == "deferred-until-knowledge-check"
    claim_id = created.json()["claim"]["id"]

    quiz_response = isolated.post(f"/api/v1/evidence/claims/{claim_id}/knowledge-check")
    assert quiz_response.status_code == 200, quiz_response.text
    quiz = quiz_response.json()
    assert len(quiz["questions"]) == 4
    assert all("correct" not in question and "explanation" not in question for question in quiz["questions"])

    all_questions = []
    for bank in assessment_bank.ROLE_BANK.values():
        all_questions.extend(bank)
    all_questions.extend(assessment_bank.CORE_QUESTIONS)
    by_text = {str(question.get("question")): question for question in all_questions}
    answers = {}
    for question in quiz["questions"]:
        source = by_text.get(str(question["question"]))
        assert source is not None and source.get("correct") is not None
        answers[str(question["id"])] = int(source["correct"])

    submitted = isolated.post(f"/api/v1/evidence/claims/{claim_id}/knowledge-check/submit", json={
        "answers": answers,
        "attempt_id": "claim-knowledge-check-regression-pass",
    })
    assert submitted.status_code == 200, submitted.text
    result = submitted.json()
    assert result["score"] == 100 and result["passed"] is True
    assert result["artifact_eligible"] is True
    assert result["progress_recorded"] is True
    assert result["goal_progress"] is not None

    saved_workspace = isolated.get("/api/v1/evidence").json()
    saved_claim = next(item for item in saved_workspace["claims"] if item["id"] == claim_id)
    assert saved_claim["knowledge_check"]["status"] == "passed"
    assert all("correct" not in question and "explanation" not in question for question in saved_claim["knowledge_check"]["questions"])
    assert "details" not in saved_claim["knowledge_check"]
    assert all("details" not in attempt for attempt in saved_claim["knowledge_check"].get("attempts", []))


def test_assessment_studio_track_updates_goal_progress_and_analytics_graphs():
    from app import assessment_bank
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    configured = isolated.post("/api/v1/profile/goal", json={
        "target_role": "Backend Developer", "experience": "Early career", "goal": "Improve architecture and API reliability"
    })
    assert configured.status_code == 200
    before = isolated.get("/api/v1/analytics").json()
    previous_progress = before["role_progress"]["progress_percent"]

    data = isolated.get("/api/v1/assessment", params={"track": "system-design"}).json()
    bank = {question["id"]: question["correct"] for question in assessment_bank.track_questions("system-design")}
    answers = {question["id"]: str(bank[question["id"]]) for question in data["questions"]}
    result = isolated.post("/api/v1/assessment/submit", json={
        "assessment_id": data["id"], "attempt_id": "assessment-studio-progress-e2e", "answers": answers
    })
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["score"] == 100
    assert body["role_progress"]["configured"] is True
    assert body["role_progress"]["assessment_covered_skill_count"] >= 1
    assert body["role_progress"]["assessment_coverage_percent"] > 0
    assert body["role_progress"]["score"] is not None
    assert isinstance(body["goal_progress_change"], int)
    assert body["role_progress"]["progress_percent"] > previous_progress
    assert any(detail.get("role_competency") == "System Design" for detail in body["details"])

    after = isolated.get("/api/v1/analytics").json()
    assert after["role_progress"]["progress_percent"] == body["role_progress"]["progress_percent"]
    assert after["selected_role_activity_counts"]["assessments"] >= 1
    assert any(item.get("title") and item["score"] == 100 for item in after["assessment_scores"])
    dashboard = isolated.get("/api/v1/dashboard").json()
    assert dashboard["role_progress"]["progress_percent"] == body["role_progress"]["progress_percent"]


def test_assessment_duplicate_submission_returns_progress_without_double_counting():
    from app import assessment_bank
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role": "Backend Developer", "experience": "Early career", "goal": "Improve APIs"})
    data = isolated.get("/api/v1/assessment", params={"track": "backend"}).json()
    bank = {question["id"]: question["correct"] for question in assessment_bank.track_questions("backend")}
    payload = {"assessment_id": data["id"], "attempt_id": "assessment-duplicate-progress-test", "answers": {question["id"]: str(bank[question["id"]]) for question in data["questions"]}}
    first = isolated.post("/api/v1/assessment/submit", json=payload).json()
    activity_count = len(isolated.get("/api/v1/analytics").json()["assessment_scores"])
    second = isolated.post("/api/v1/assessment/submit", json=payload).json()
    assert second["duplicate"] is True
    assert second["role_progress"]["progress_percent"] == first["role_progress"]["progress_percent"]
    assert len(isolated.get("/api/v1/analytics").json()["assessment_scores"]) == activity_count


def test_unmapped_assessment_track_still_updates_overall_goal_without_fabricating_skill_mapping():
    from app import assessment_bank
    isolated = TestClient(app, headers={"X-SKILLSETRA-Demo-Session": str(uuid.uuid4())})
    isolated.post("/api/v1/profile/goal", json={"target_role": "Frontend Developer", "experience": "Early career", "goal": "Improve frontend engineering"})
    before = isolated.get("/api/v1/analytics").json()["role_progress"]
    data = isolated.get("/api/v1/assessment", params={"track": "ai-engineering"}).json()
    bank = {question["id"]: question["correct"] for question in assessment_bank.track_questions("ai-engineering")}
    # This track has no sound skill-level mapping to a Frontend Developer role.
    # A high score should still affect overall goal completion through the transparent
    # aggregate assessment component, without fabricating per-skill progress.
    answers = {q["id"]: str(bank[q["id"]]) for q in data["questions"]}
    response = isolated.post("/api/v1/assessment/submit", json={"assessment_id": data["id"], "attempt_id": "unmapped-track-test", "answers": answers})
    assert response.status_code == 200, response.text
    body = response.json()
    after = body["role_progress"]
    assert after["assessment_activity_score_percent"] == 100
    assert after["scored_assessment_count"] == 1
    assert after["assessment_coverage_percent"] == 0
    assert after["progress_percent"] == round(0.85 * after["base_progress_percent"] + 15)
    assert after["progress_percent"] > before["progress_percent"]
    analytics = isolated.get("/api/v1/analytics").json()
    assert analytics["role_progress"]["progress_percent"] == after["progress_percent"]
    assert any(row.get("score") == 100 and row.get("type") == "assessment" for row in analytics["assessment_scores"])
