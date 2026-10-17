-- Safe catalog seed. User-owned progress is intentionally not seeded.
insert into subjects(slug,name,overview) values
('python','Python','Language fluency, testing, packaging and practical application.'),('javascript','JavaScript','Browser and server-side JavaScript fundamentals.'),('typescript','TypeScript','Typed application design for reliable JavaScript systems.'),('react','React','Component architecture, state, accessibility and performance.'),('nextjs','Next.js','Production React applications, routing and server rendering.'),('nodejs','Node.js','Server-side JavaScript APIs and runtime practices.'),('fastapi','FastAPI','Typed Python APIs, validation and service boundaries.'),('sql','SQL','Querying, relational modeling and data reasoning.'),('postgresql','PostgreSQL','Production relational database design and operations.'),('machine-learning','Machine Learning','Modeling, evaluation and practical ML systems.'),('ai-engineering','AI Engineering','AI-enabled applications, evaluation and reliability.'),('llm-engineering','LLM Engineering','Prompting, structured output, evaluation and production controls.'),('rag','RAG','Retrieval-augmented generation systems and evaluation.'),('data-engineering','Data Engineering','Pipelines, data quality and reliable workflows.'),('system-design','System Design','Scalability, reliability and architecture trade-offs.'),('cloud','Cloud','Cloud architecture, networking, identity and reliability.'),('docker','Docker','Reproducible containers and deployment workflows.'),('kubernetes','Kubernetes','Container orchestration, scheduling and operations.'),('devops','DevOps','CI/CD, automation and observability.'),('testing','Testing','Unit, integration, contract and end-to-end testing.'),('cybersecurity','Cybersecurity','Secure engineering, threat modeling and defensive controls.'),('git-github','Git/GitHub','Source control, collaboration and repository evidence.'),('technical-communication','Technical Communication','Architecture explanation, documentation and project defense.')
on conflict(slug) do nothing;
insert into learning_resources(subject_id,title,url,kind,level,provider,verified)
select s.id,x.title,x.url,x.kind,x.level,x.provider,true from (values
('python','Python Tutorial','https://docs.python.org/3/tutorial/','documentation','all','Python'),
('javascript','MDN JavaScript Guide','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide','documentation','all','MDN'),
('typescript','TypeScript Handbook','https://www.typescriptlang.org/docs/handbook/intro.html','documentation','all','TypeScript'),
('react','React Learn','https://react.dev/learn','documentation','all','React'),
('nextjs','Next.js Learn','https://nextjs.org/learn','course','beginner','Vercel'),
('fastapi','FastAPI Documentation','https://fastapi.tiangolo.com/','documentation','all','FastAPI'),
('sql','PostgreSQL Tutorial','https://www.postgresql.org/docs/current/tutorial.html','documentation','beginner','PostgreSQL'),
('machine-learning','scikit-learn User Guide','https://scikit-learn.org/stable/user_guide.html','documentation','intermediate','scikit-learn'),
('llm-engineering','OpenAI Cookbook','https://cookbook.openai.com/','documentation','intermediate','OpenAI'),
('rag','LangChain Retrieval Concepts','https://python.langchain.com/docs/concepts/retrieval/','documentation','intermediate','LangChain'),
('docker','Docker Get Started','https://docs.docker.com/get-started/','documentation','beginner','Docker'),
('kubernetes','Kubernetes Basics','https://kubernetes.io/docs/tutorials/kubernetes-basics/','course','beginner','Kubernetes'),
('devops','GitHub Actions Documentation','https://docs.github.com/en/actions','documentation','all','GitHub'),
('testing','pytest Documentation','https://docs.pytest.org/en/stable/','documentation','all','pytest'),
('cybersecurity','OWASP Top 10','https://owasp.org/www-project-top-ten/','reference','all','OWASP'),
('git-github','GitHub Skills','https://skills.github.com/','course','beginner','GitHub'),
('technical-communication','Google Technical Writing','https://developers.google.com/tech-writing','course','beginner','Google')
) as x(slug,title,url,kind,level,provider) join subjects s on s.slug=x.slug
where not exists(select 1 from learning_resources r where r.title=x.title);
