from copy import deepcopy
from datetime import date,timedelta

ROLES=[
 {"name":"ML Engineer","description":"Build and productionize machine learning systems","skills":["Python","Machine Learning","SQL","Deployment","Testing","Communication"]},
 {"name":"AI Engineer","description":"Build AI-enabled products, evaluation systems and intelligent APIs","skills":["Python","AI Engineering","APIs","Evaluation","Deployment","Communication"]},
 {"name":"Data Scientist","description":"Analyze data, experiment, model and communicate findings","skills":["Python","SQL","Statistics","Machine Learning","Experimentation","Communication"]},
 {"name":"Data Analyst","description":"Turn business data into reliable analysis and decisions","skills":["SQL","Python","Statistics","Visualization","Communication"]},
 {"name":"Backend Developer","description":"Design reliable server-side APIs, services and data systems","skills":["Python","APIs","SQL","Testing","System Design","Communication"]},
 {"name":"Full-Stack Developer","description":"Build end-to-end web products across frontend and backend","skills":["React","JavaScript","APIs","Testing","Deployment","Communication"]},
 {"name":"Frontend Developer","description":"Build accessible, responsive and high-quality product interfaces","skills":["React","JavaScript","CSS","Accessibility","Testing","Communication"]},
 {"name":"Python Developer","description":"Build maintainable Python services, automation and applications","skills":["Python","Testing","APIs","SQL","Packaging","Communication"]},
 {"name":"DevOps Engineer","description":"Automate delivery, infrastructure, observability and reliability","skills":["Linux","Docker","CI/CD","Cloud","Observability","Communication"]},
 {"name":"Cybersecurity","description":"Assess, defend and engineer secure applications and systems","skills":["Security","Linux","Networking","Threat Modeling","Testing","Communication"]},
 {"name":"Cloud Engineer","description":"Design and operate scalable cloud infrastructure","skills":["Cloud","Networking","Linux","Terraform","Observability","Communication"]},
 {"name":"Product Data Engineer","description":"Build reliable analytics and data platform workflows","skills":["SQL","Python","Pipelines","Data Modeling","Cloud","Communication"]},
]

COMPETENCIES=[
 ("Python","Language fluency and practical application","Strong Evidence",91,"Advanced"),
 ("Pandas","Data manipulation and analysis","Strong Evidence",84,"Advanced"),
 ("Machine Learning","Modeling, evaluation and practical use","Strong Evidence",82,"Intermediate"),
 ("SQL","Querying and relational reasoning","Developing",63,"Intermediate"),
 ("Debugging","Finding, isolating and verifying failures","Developing",58,"Intermediate"),
 ("Reasoning","Explaining technical decisions and trade-offs","Developing",61,"Intermediate"),
 ("Application","Applying knowledge in realistic tasks","Developing",66,"Intermediate"),
 ("Problem Solving","Decomposing unfamiliar problems","Developing",60,"Intermediate"),
 ("Testing","Unit, integration, edge-case and failure-path testing","Limited",38,"Beginner"),
 ("FastAPI","Python API engineering","Limited",35,"Beginner"),
 ("Docker","Containerization and reproducible environments","Limited",31,"Beginner"),
 ("Deployment","Production delivery and operational evidence","Limited",28,"Beginner"),
 ("Transfer","Applying concepts in unfamiliar contexts","Transfer Gap",28,"Beginner"),
 ("Adaptation","Changing approach when requirements shift","Developing",46,"Beginner"),
 ("Engineering","Maintainability, boundaries and reliability","Developing",57,"Intermediate"),
 ("Communication","Clear technical explanations and documentation","Strong Evidence",79,"Intermediate"),
 ("React","Component-based interface engineering","Developing",54,"Intermediate"),
 ("Accessibility","Inclusive semantic and keyboard-first UI","Limited",34,"Beginner"),
 ("Leadership","Decision ownership, prioritization, accountability and support for others","Not assessed",0,"Not assessed"),
]

EVIDENCE=[
 {"id":"ev1","activity":"Challenge completed","competency":"Debugging","evidence":"Isolated malformed-record handling and described a verification path.","result":"Developing","confidence":"Medium","date":"2026-09-23"},
 {"id":"ev2","activity":"Project analyzed","competency":"Engineering","evidence":"Service boundaries and naming were clear; integration coverage was limited.","result":"Developing","confidence":"Medium","date":"2026-09-21"},
 {"id":"ev3","activity":"GitHub repository analyzed","competency":"Python","evidence":"Repeated Python application across API and data workflows.","result":"Strong","confidence":"High","date":"2026-09-18"},
 {"id":"ev4","activity":"Learning intervention completed","competency":"Testing","evidence":"Completed a focused integration-testing exercise.","result":"Developing","confidence":"Low","date":"2026-09-16"},
 {"id":"ev5","activity":"Defense question answered","competency":"Reasoning","evidence":"Explained a database choice and identified one scaling trade-off.","result":"Developing","confidence":"Medium","date":"2026-09-14"},
]

CHALLENGES=[
 {
  "id": "debug-1",
  "title": "Repair a failing ingestion pipeline",
  "variant": "baseline",
  "statement": "An event ingestion function is rejecting an entire batch when one record is malformed. Preserve valid events, isolate invalid records, return diagnostics, and explain how you would test the change.",
  "constraints": [
   "Preserve valid events",
   "Do not hide malformed records",
   "Add failure-path tests",
   "Explain your debugging path"
  ],
  "starter_code": "def ingest(events):\n    output = []\n    for event in events:\n        if event.get(\"value\"):\n            output.append(normalize(event))\n        else:\n            raise ValueError(\"bad event\")",
  "rubric": [
   {
    "label": "Preserve valid records",
    "terms": [
     "preserve valid",
     "valid events",
     "continue processing",
     "skip invalid"
    ],
    "met_detail": "Explains how valid events continue through the batch.",
    "miss_detail": "Does not clearly explain how valid events are preserved."
   },
   {
    "label": "Isolate malformed records",
    "terms": [
     "invalid record",
     "malformed",
     "quarantine",
     "reject only",
     "diagnostic"
    ],
    "met_detail": "Separates malformed input and keeps diagnostics visible.",
    "miss_detail": "Does not isolate malformed records or explain diagnostics."
   },
   {
    "label": "Failure-path tests",
    "terms": [
     "test",
     "unit test",
     "integration test",
     "edge case"
    ],
    "met_detail": "Includes tests for the changed failure behavior.",
    "miss_detail": "Does not specify failure-path tests."
   },
   {
    "label": "Verification/debugging path",
    "terms": [
     "debug",
     "verify",
     "verification",
     "logging",
     "reproduce"
    ],
    "met_detail": "Provides a concrete debugging or verification sequence.",
    "miss_detail": "Verification/debugging steps are too vague."
   }
  ]
 },
 {
  "id": "debug-2",
  "title": "Adapt a batch processor to a changing contract",
  "variant": "adaptive",
  "statement": "A new event shape has been introduced while older clients still send the previous shape. Preserve compatibility, isolate invalid events, and explain the tests you would add.",
  "constraints": [
   "Preserve backwards compatibility",
   "Validate input",
   "Make failures observable",
   "Avoid a brittle special case"
  ],
  "starter_code": "def parse_event(payload):\n    return {\"id\":payload[\"id\"],\"value\":payload[\"value\"]}",
  "rubric": [
   {
    "label": "Backward compatibility",
    "terms": [
     "backward compatibility",
     "backwards compatibility",
     "old client",
     "legacy",
     "version"
    ],
    "met_detail": "Addresses both old and new payload shapes.",
    "miss_detail": "Does not clearly preserve older clients."
   },
   {
    "label": "Input validation",
    "terms": [
     "validate",
     "validation",
     "schema",
     "pydantic",
     "contract"
    ],
    "met_detail": "Defines an explicit validation boundary.",
    "miss_detail": "Validation behavior is missing or vague."
   },
   {
    "label": "Observable failures",
    "terms": [
     "logging",
     "diagnostic",
     "error",
     "metrics",
     "observable",
     "dead letter"
    ],
    "met_detail": "Makes invalid inputs diagnosable.",
    "miss_detail": "Does not explain how failures remain observable."
   },
   {
    "label": "Non-brittle design",
    "terms": [
     "adapter",
     "versioned",
     "mapping",
     "strategy",
     "normalize"
    ],
    "met_detail": "Avoids a one-off special case and proposes a maintainable design.",
    "miss_detail": "Relies on a brittle special case."
   }
  ]
 },
 {
  "id": "debug-3",
  "title": "Diagnose a multi-failure API workflow",
  "variant": "adaptive",
  "statement": "An API intermittently fails with malformed input and a downstream timeout. Explain how you would isolate the failures, recover safely, and verify the fix.",
  "constraints": [
   "Separate failure causes",
   "Define safe retries",
   "Preserve useful diagnostics",
   "Verify behavior under both failures"
  ],
  "starter_code": "def handle(request):\n    data = parse(request)\n    result = downstream(data)\n    return transform(result)",
  "rubric": [
   {
    "label": "Separate failure causes",
    "terms": [
     "separate",
     "isolate",
     "malformed",
     "timeout",
     "independent"
    ],
    "met_detail": "Separates malformed-input and downstream-timeout causes.",
    "miss_detail": "Treats the failures as one undifferentiated problem."
   },
   {
    "label": "Safe retry/recovery",
    "terms": [
     "retry",
     "backoff",
     "idempotent",
     "recover",
     "timeout"
    ],
    "met_detail": "Defines a safe recovery or retry strategy.",
    "miss_detail": "Does not explain safe recovery."
   },
   {
    "label": "Useful diagnostics",
    "terms": [
     "logging",
     "trace",
     "correlation",
     "diagnostic",
     "error"
    ],
    "met_detail": "Preserves enough diagnostics to investigate failures.",
    "miss_detail": "Diagnostics are not concrete enough."
   },
   {
    "label": "Verification under both failures",
    "terms": [
     "test",
     "integration",
     "failure path",
     "both",
     "scenario"
    ],
    "met_detail": "Tests both failure modes explicitly.",
    "miss_detail": "Does not verify both failure modes."
   }
  ]
 }
]

RESOURCES=[
 {"id":"r1","competency":"Testing","level":"Beginner → Intermediate","kind":"documentation","title":"pytest documentation","why":"Build stronger unit and integration test evidence around the gap identified in your challenge.","url":"https://docs.pytest.org/en/stable/"},
 {"id":"r2","competency":"FastAPI","level":"Intermediate","kind":"documentation","title":"FastAPI documentation","why":"Strengthen API validation, dependency boundaries and production patterns in your current project.","url":"https://fastapi.tiangolo.com/"},
 {"id":"r3","competency":"Docker","level":"Beginner","kind":"documentation","title":"Docker Get Started","why":"Create reproducible environments and deployment evidence for your next project upgrade.","url":"https://docs.docker.com/get-started/"},
 {"id":"r4","competency":"Python","level":"All levels","kind":"documentation","title":"Python official tutorial","why":"Use the official language reference to reinforce fundamentals behind advanced implementation choices.","url":"https://docs.python.org/3/tutorial/"},
 {"id":"r5","competency":"Git","level":"All levels","kind":"youtube","title":"Git & GitHub learning path","why":"Improve source-control evidence and repository hygiene for engineering workflows.","url":"https://www.youtube.com/@freecodecamp"},
 {"id":"r6","competency":"Machine Learning","level":"Intermediate","kind":"documentation","title":"scikit-learn User Guide","why":"Deepen practical model selection and evaluation knowledge that supports ML engineering work.","url":"https://scikit-learn.org/stable/user_guide.html"},
 {"id":"r7","competency":"SQL","level":"Beginner → Intermediate","kind":"documentation","title":"PostgreSQL tutorial","why":"Build query and relational reasoning evidence using a production-grade relational database.","url":"https://www.postgresql.org/docs/current/tutorial.html"},
 {"id":"r8","competency":"Accessibility","level":"Beginner","kind":"documentation","title":"MDN Accessibility","why":"Strengthen semantic, keyboard and inclusive UI evidence for frontend work.","url":"https://developer.mozilla.org/en-US/docs/Web/Accessibility"},
 {"id":"r9","competency":"System Design","level":"Intermediate","kind":"youtube","title":"System Design: Trade-offs Explained","why":"Use a focused architecture video before a system-design interview or defense.","url":"https://www.youtube.com/watch?v=1nENigGr-a0"},
 {"id":"r14","competency":"Python","level":"Beginner","kind":"youtube","title":"Python learning videos","why":"Use a structured video track alongside the official Python documentation.","url":"https://www.youtube.com/@freecodecamp"},
 {"id":"r15","competency":"React","level":"Intermediate","kind":"youtube","title":"React learning videos","why":"Practice modern React concepts with project-based explanations.","url":"https://www.youtube.com/@freecodecamp"},
 {"id":"r16","competency":"Cloud","level":"Beginner","kind":"youtube","title":"AWS developer learning videos","why":"Supplement cloud fundamentals with provider-led video material.","url":"https://www.youtube.com/@amazonwebservices"},
 {"id":"r17","competency":"Cybersecurity","level":"Beginner","kind":"youtube","title":"OWASP security videos","why":"Learn application-security concepts from the OWASP community.","url":"https://www.youtube.com/@OWASPGLOBAL"},
 {"id":"r18","competency":"Software Engineering","level":"Intermediate","kind":"pdf","title":"Google SRE Book — PDF","why":"Study reliability, service operation and engineering practices in a printable reference format.","url":"https://sre.google/sre-book/"},
 {"id":"r19","competency":"Software Engineering","level":"Intermediate","kind":"pdf","title":"OWASP Top 10 — PDF / reference","why":"Keep a security reference beside application-security practice.","url":"https://owasp.org/www-project-top-ten/"},
 {"id":"r20","competency":"System Design","level":"Intermediate","kind":"pdf","title":"System Design visual reference","why":"Use the linked visual reference to review architecture concepts before an interview.","url":"https://www.youtube.com/watch?v=p-88GN1WVs8"},
 {"id":"r21","competency":"Web Development","level":"Intermediate","kind":"slides","title":"MDN Web development learning path","why":"Use a structured web platform reference suitable for note-taking and presentation preparation.","url":"https://developer.mozilla.org/en-US/docs/Learn"},
]

ROADMAP_MATERIALS=[
 {"id":"rm-ai","field":"AI Engineering","topic":"AI Engineering Foundations","title":"AI Engineering Field Roadmap","description":"A downloadable field guide for building AI engineering evidence.","url":"/roadmaps/ai-engineering/ai-engineering-field-guide.pdf","kind":"PDF"},
 {"id":"rm-ml","field":"Machine Learning","topic":"ML Engineering","title":"ML Engineering Field Roadmap","description":"Field guide for ML engineering practice and evidence.","url":"/roadmaps/ml-engineering/ml-engineering-field-guide.pdf","kind":"PDF"},
 {"id":"rm-data","field":"Data Science","topic":"Data Science","title":"Data Science Field Roadmap","description":"A field guide for data science learning and project evidence.","url":"/roadmaps/data-science/data-science-field-guide.pdf","kind":"PDF"},
 {"id":"rm-backend","field":"Backend Development","topic":"Backend Engineering","title":"Backend Development Field Roadmap","description":"API, testing and deployment-oriented roadmap material.","url":"/roadmaps/backend-development/backend-development-field-guide.pdf","kind":"PDF"},
 {"id":"rm-frontend","field":"Frontend Development","topic":"Frontend Engineering","title":"Frontend Development Field Roadmap","description":"Frontend engineering and accessibility roadmap material.","url":"/roadmaps/frontend-development/frontend-development-field-guide.pdf","kind":"PDF"},
 {"id":"rm-cyber","field":"Cybersecurity","topic":"Application Security","title":"Cybersecurity Field Roadmap","description":"Cybersecurity learning and evidence roadmap material.","url":"/roadmaps/cybersecurity/cybersecurity-field-guide.pdf","kind":"PDF"},
]

SALARY={
 "ML Engineer":[("Entry / Associate","India","₹6–12 LPA"),("Mid-level","India","₹12–28 LPA"),("Senior","India","₹25–50+ LPA")],
 "AI Engineer":[("Entry / Associate","India","₹7–14 LPA"),("Mid-level","India","₹14–32 LPA"),("Senior","India","₹28–55+ LPA")],
 "Data Scientist":[("Entry / Associate","India","₹6–12 LPA"),("Mid-level","India","₹12–25 LPA"),("Senior","India","₹24–45+ LPA")],
 "Data Analyst":[("Entry / Associate","India","₹4–8 LPA"),("Mid-level","India","₹8–16 LPA"),("Senior","India","₹15–28+ LPA")],
 "Backend Developer":[("Entry / Associate","India","₹5–10 LPA"),("Mid-level","India","₹10–24 LPA"),("Senior","India","₹22–45+ LPA")],
 "Full-Stack Developer":[("Entry / Associate","India","₹5–10 LPA"),("Mid-level","India","₹10–24 LPA"),("Senior","India","₹22–45+ LPA")],
 "Frontend Developer":[("Entry / Associate","India","₹4–9 LPA"),("Mid-level","India","₹9–20 LPA"),("Senior","India","₹18–38+ LPA")],
 "Python Developer":[("Entry / Associate","India","₹4–9 LPA"),("Mid-level","India","₹9–20 LPA"),("Senior","India","₹18–36+ LPA")],
 "DevOps Engineer":[("Entry / Associate","India","₹6–12 LPA"),("Mid-level","India","₹12–28 LPA"),("Senior","India","₹25–50+ LPA")],
 "Cybersecurity":[("Entry / Associate","India","₹5–11 LPA"),("Mid-level","India","₹11–25 LPA"),("Senior","India","₹22–45+ LPA")],
 "Cloud Engineer":[("Entry / Associate","India","₹6–12 LPA"),("Mid-level","India","₹12–28 LPA"),("Senior","India","₹24–48+ LPA")],
 "Product Data Engineer":[("Entry / Associate","India","₹5–10 LPA"),("Mid-level","India","₹10–24 LPA"),("Senior","India","₹22–42+ LPA")],
}

DEMO_PROFILE={"id":"demo-user","name":"Demo Learner","email":"demo@skillsetra.local","target_role":"","experience":"Early career","goal":"Become job-ready with credible evidence"}

ROADMAP_BY_ROLE={
 "ML Engineer":[("Baseline assessment","Demonstrate core Python/ML reasoning and identify the highest-impact gap.","Create a defensible baseline before adding more content.",["Python","Machine Learning"],"Assessment result + explained answers","1 day"),
 ("Testing depth","Build unit, integration and failure-path testing evidence.","Testing is currently limited and affects reliability evidence.",["Testing","Python"],"20+ meaningful tests with edge/failure coverage","3–5 days"),
 ("API engineering","Upgrade a FastAPI service with validation, observability and error handling.","Connect Python strength to production engineering.",["FastAPI","Engineering"],"Validated API + integration tests","4–7 days"),
 ("Containerize","Package the upgraded service with a reproducible Docker workflow.","Create deployment-adjacent evidence.",["Docker","Deployment"],"Dockerfile + local reproducible run","2–3 days"),
 ("Production project","Build a non-repetitive ML product with data, API and deployment boundaries.","Turn the gaps into a single integrated proof artifact.",["ML","SQL","FastAPI","Deployment"],"Project analysis + defense","2–3 weeks"),
 ("Adaptive re-test","Solve a different unfamiliar problem targeting the same gap.","Verify transfer rather than recall.",["Transfer","Debugging"],"New challenge evaluation","1 day")],
 "AI Engineer":[("AI foundations assessment","Demonstrate API, evaluation and reasoning fundamentals.","Establish a field-specific baseline.",["Python","AI Engineering"],"Assessment result","1 day"),("Evaluation loop","Design repeatable evaluation cases for an AI feature.","AI product quality depends on observable evaluation.",["Evaluation","Testing"],"Evaluation set + documented criteria","3–5 days"),("AI service","Build an AI-backed API with validation and failure handling.","Create engineering evidence around AI integration.",["APIs","FastAPI","AI"],"Working service + tests","1 week"),("Productionize","Add Docker and deployment workflow.","Make the AI service reproducible.",["Docker","Deployment"],"Containerized deployment proof","3–5 days"),("Defense","Defend model/provider, cost, privacy and failure decisions.","Test reasoning under changing constraints.",["Reasoning","Adaptation"],"Defense evaluation","1 day")],
}

# Expanded subject catalog for role-aware learning discovery.
SUBJECTS=[
 {"id":"python","name":"Python","category":"Programming","levels":["Beginner","Intermediate","Advanced","Expert"],"languages":["English","Hindi"],"description":"Core Python fluency, packaging, async patterns, testing and maintainable application code.","resources":[{"title":"Python Tutorial","type":"Docs","url":"https://docs.python.org/3/tutorial/"},{"title":"Python Programming","type":"Video","url":"https://www.youtube.com/@freecodecamp"}]},
 {"id":"sql-databases","name":"SQL & Databases","category":"Data","levels":["Beginner","Intermediate","Advanced"],"languages":["English","Hindi"],"description":"Relational modeling, joins, indexing, transactions and query reasoning.","resources":[{"title":"PostgreSQL Tutorial","type":"Docs","url":"https://www.postgresql.org/docs/current/tutorial.html"},{"title":"SQL Course","type":"Video","url":"https://www.youtube.com/@freecodecamp"}]},
 {"id":"machine-learning","name":"Machine Learning","category":"AI / ML","levels":["Beginner","Intermediate","Advanced","Expert"],"languages":["English"],"description":"Modeling, evaluation, feature engineering, experimentation and production ML reasoning.","resources":[{"title":"scikit-learn User Guide","type":"Docs","url":"https://scikit-learn.org/stable/user_guide.html"},{"title":"Machine Learning Course","type":"Video","url":"https://www.youtube.com/@GoogleDevelopers"}]},
 {"id":"react-nextjs","name":"React & Next.js","category":"Web","levels":["Beginner","Intermediate","Advanced"],"languages":["English","Hindi"],"description":"Components, state, server/client boundaries, accessibility and production UI patterns.","resources":[{"title":"React Documentation","type":"Docs","url":"https://react.dev/learn"},{"title":"Next.js Learn","type":"Course","url":"https://nextjs.org/learn"}]},
 {"id":"fastapi-apis","name":"FastAPI & APIs","category":"Backend","levels":["Beginner","Intermediate","Advanced"],"languages":["English"],"description":"API design, validation, dependencies, auth, testing and observability.","resources":[{"title":"FastAPI Documentation","type":"Docs","url":"https://fastapi.tiangolo.com/"},{"title":"FastAPI Tutorials","type":"Video","url":"https://www.youtube.com/@freecodecamp"}]},
 {"id":"docker-containers","name":"Docker & Containers","category":"Cloud / DevOps","levels":["Beginner","Intermediate","Advanced"],"languages":["English"],"description":"Images, containers, networking, volumes and reproducible application delivery.","resources":[{"title":"Docker Get Started","type":"Docs","url":"https://docs.docker.com/get-started/"},{"title":"Docker Learning","type":"Video","url":"https://www.youtube.com/@Docker"}]},
 {"id":"cloud-engineering","name":"Cloud Engineering","category":"Cloud / DevOps","levels":["Beginner","Intermediate","Advanced","Expert"],"languages":["English"],"description":"Cloud architecture, networking, IAM, reliability, cost and deployment practices.","resources":[{"title":"AWS Skill Builder","type":"Learning","url":"https://skillbuilder.aws/"},{"title":"AWS Developers","type":"Video","url":"https://www.youtube.com/@amazonwebservices"}]},
 {"id":"cybersecurity","name":"Cybersecurity","category":"Security","levels":["Beginner","Intermediate","Advanced","Expert"],"languages":["English"],"description":"Threat modeling, secure coding, identity, application security and defensive reasoning.","resources":[{"title":"OWASP Top 10","type":"Reference","url":"https://owasp.org/www-project-top-ten/"},{"title":"OWASP Foundation","type":"Video","url":"https://www.youtube.com/@OWASPGLOBAL"}]},
 {"id":"data-analysis-visualization","name":"Data Analysis & Visualization","category":"Data","levels":["Beginner","Intermediate","Advanced"],"languages":["English","Hindi"],"description":"Cleaning, analysis, visualization, statistical reasoning and communicating findings.","resources":[{"title":"Pandas User Guide","type":"Docs","url":"https://pandas.pydata.org/docs/user_guide/"},{"title":"Data Analysis Learning","type":"Video","url":"https://www.youtube.com/@freecodecamp"}]},
 {"id":"software-testing","name":"Software Testing","category":"Engineering","levels":["Beginner","Intermediate","Advanced"],"languages":["English","Hindi"],"description":"Unit, integration, contract, end-to-end, property and failure-path testing.","resources":[{"title":"pytest Documentation","type":"Docs","url":"https://docs.pytest.org/en/stable/"},{"title":"Testing Tutorials","type":"Video","url":"https://www.youtube.com/@freecodecamp"}]},
 {"id":"system-design","name":"System Design","category":"Engineering","levels":["Intermediate","Advanced","Expert"],"languages":["English"],"description":"Scalability, distributed systems, reliability, queues, caching and architecture trade-offs.","resources":[{"title":"Google SRE Books","type":"Reference","url":"https://sre.google/books/"},{"title":"System Design Learning","type":"Video","url":"https://www.youtube.com/@ByteByteGo"}]},
 {"id":"devops-ci-cd","name":"DevOps & CI/CD","category":"Cloud / DevOps","levels":["Beginner","Intermediate","Advanced"],"languages":["English"],"description":"CI/CD, automation, observability, release strategies and infrastructure workflows.","resources":[{"title":"GitHub Actions Docs","type":"Docs","url":"https://docs.github.com/en/actions"},{"title":"GitHub YouTube","type":"Video","url":"https://www.youtube.com/@GitHub"}]},
 {"id":"technical-communication","name":"Technical Communication","category":"Professional","levels":["Beginner","Intermediate","Advanced"],"languages":["English","Hindi"],"description":"Technical writing, decision records, project defense and clear explanation of trade-offs.","resources":[{"title":"Google Technical Writing","type":"Course","url":"https://developers.google.com/tech-writing"},{"title":"Google for Developers","type":"Video","url":"https://www.youtube.com/@GoogleDevelopers"}]},
]