insert into competencies(name,description) values
('Python','Language fluency and practical application'),
('Pandas','Data manipulation and analysis'),
('Machine Learning','Modeling, evaluation and practical use'),
('SQL','Querying and relational reasoning'),
('Debugging','Finding, isolating and verifying failures'),
('Reasoning','Technical decisions and trade-offs'),
('Application','Applying knowledge in realistic tasks'),
('Problem Solving','Decomposing unfamiliar problems'),
('Testing','Unit, integration, edge-case and failure-path testing'),
('FastAPI','Python API engineering'),
('Docker','Containerization and reproducible environments'),
('Deployment','Production delivery and operations'),
('Transfer','Applying concepts in unfamiliar contexts'),
('Adaptation','Changing approach when requirements shift'),
('Engineering','Maintainability, boundaries and reliability'),
('Communication','Technical explanation and documentation'),
('React','Component-based interface engineering'),
('Accessibility','Semantic and inclusive UI engineering')
on conflict(name) do nothing;

insert into competency_levels(competency_id,level_name,level_order,definition)
select c.id,x.level_name,x.level_order,x.definition from competencies c cross join (values
('Beginner',1,'Can explain core concepts and complete guided tasks.'),
('Practitioner',2,'Can apply concepts independently to familiar problems.'),
('Intermediate',3,'Can solve varied problems, test assumptions and explain trade-offs.'),
('Advanced',4,'Can design, adapt and defend solutions under realistic constraints.'),
('Expert',5,'Can lead complex work, teach others and reason across unfamiliar systems.')
) x(level_name,level_order,definition)
on conflict(competency_id,level_order) do nothing;

insert into career_roles(name,description) values
('ML Engineer','Build and productionize machine learning systems'),
('AI Engineer','Build AI-enabled products, evaluation systems and intelligent APIs'),
('Data Scientist','Analyze data, experiment, model and communicate findings'),
('Data Analyst','Turn business data into reliable analysis and decisions'),
('Backend Developer','Design reliable server-side APIs, services and data systems'),
('Full-Stack Developer','Build end-to-end web products across frontend and backend'),
('Frontend Developer','Build accessible, responsive and high-quality product interfaces'),
('Python Developer','Build maintainable Python services, automation and applications'),
('DevOps Engineer','Automate delivery, infrastructure, observability and reliability'),
('Cybersecurity','Assess, defend and engineer secure applications and systems'),
('Cloud Engineer','Design and operate scalable cloud infrastructure'),
('Product Data Engineer','Build reliable analytics and data platform workflows')
on conflict(name) do nothing;

insert into learning_resources(competency_id,title,provider,url,kind,level,verified)
select c.id,v.title,v.provider,v.url,v.kind,v.level,true from competencies c join (values
('Testing','pytest documentation','pytest','https://docs.pytest.org/en/stable/','documentation','Beginner → Intermediate'),
('FastAPI','FastAPI documentation','FastAPI','https://fastapi.tiangolo.com/','documentation','Intermediate'),
('Docker','Docker Get Started','Docker','https://docs.docker.com/get-started/','documentation','Beginner'),
('Python','Python official tutorial','Python','https://docs.python.org/3/tutorial/','documentation','All levels'),
('Machine Learning','scikit-learn User Guide','scikit-learn','https://scikit-learn.org/stable/user_guide.html','documentation','Intermediate'),
('SQL','PostgreSQL tutorial','PostgreSQL','https://www.postgresql.org/docs/current/tutorial.html','documentation','Beginner → Intermediate'),
('Accessibility','MDN Accessibility','MDN','https://developer.mozilla.org/en-US/docs/Web/Accessibility','documentation','Beginner')
) v(comp,title,provider,url,kind,level) on c.name=v.comp;

-- Illustrative bands; replace with a dated sourced feed before public claims.
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes)
select r.id,current_date,'India','Entry / Associate',600000,1200000,'SKILLSETRA demo dataset','Illustrative demo band, not a guarantee.'
from career_roles r where r.name='ML Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes)
select r.id,current_date,'India','Mid-level',1200000,2800000,'SKILLSETRA demo dataset','Illustrative demo band, not a guarantee.'
from career_roles r where r.name='ML Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes)
select r.id,current_date,'India','Senior',2500000,5000000,'SKILLSETRA demo dataset','Illustrative demo band, not a guarantee.'
from career_roles r where r.name='ML Engineer';

insert into challenges(slug,title,statement,constraints_json,starter_code,difficulty)
values
('repair-ingestion','Repair a failing ingestion pipeline','An event ingestion function is rejecting an entire batch when one record is malformed. Preserve valid events, isolate invalid records, return diagnostics, and explain how you would test the change.','["Preserve valid events","Do not hide malformed records","Add failure-path tests","Explain your debugging path"]','def ingest(events):\n    output = []\n    for event in events:\n        if event.get("value"):\n            output.append(normalize(event))\n        else:\n            raise ValueError("bad event")\n    return output','Intermediate')
on conflict(slug) do nothing;

insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='ML Engineer' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='ML Engineer' and c.name='Machine Learning' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='ML Engineer' and c.name='SQL' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='ML Engineer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='ML Engineer' and c.name='Deployment' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',600000,1200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='ML Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1200000,2800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='ML Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2500000,5000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='ML Engineer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='AI Engineer' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='AI Engineer' and c.name='FastAPI' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='AI Engineer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='AI Engineer' and c.name='Reasoning' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='AI Engineer' and c.name='Deployment' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',700000,1400000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='AI Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1400000,3200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='AI Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2800000,5500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='AI Engineer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Scientist' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Scientist' and c.name='Pandas' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Scientist' and c.name='Machine Learning' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Scientist' and c.name='SQL' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Scientist' and c.name='Reasoning' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',600000,1200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Scientist';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1200000,2500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Scientist';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2400000,4500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Scientist';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Analyst' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Analyst' and c.name='SQL' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Analyst' and c.name='Pandas' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Data Analyst' and c.name='Communication' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',400000,800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Analyst';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',800000,1600000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Analyst';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',1500000,2800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Data Analyst';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Backend Developer' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Backend Developer' and c.name='FastAPI' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Backend Developer' and c.name='SQL' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Backend Developer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Backend Developer' and c.name='Engineering' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',500000,1000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Backend Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1000000,2400000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Backend Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2200000,4500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Backend Developer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Full-Stack Developer' and c.name='React' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Full-Stack Developer' and c.name='FastAPI' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Full-Stack Developer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Full-Stack Developer' and c.name='Engineering' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Full-Stack Developer' and c.name='Deployment' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',500000,1000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Full-Stack Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1000000,2400000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Full-Stack Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2200000,4500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Full-Stack Developer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Frontend Developer' and c.name='React' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Frontend Developer' and c.name='Accessibility' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Frontend Developer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Frontend Developer' and c.name='Communication' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',400000,900000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Frontend Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',900000,2000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Frontend Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',1800000,3800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Frontend Developer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Python Developer' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Python Developer' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Python Developer' and c.name='FastAPI' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Python Developer' and c.name='Engineering' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',400000,900000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Python Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',900000,2000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Python Developer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',1800000,3600000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Python Developer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='DevOps Engineer' and c.name='Docker' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='DevOps Engineer' and c.name='Deployment' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='DevOps Engineer' and c.name='Engineering' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='DevOps Engineer' and c.name='Testing' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',600000,1200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='DevOps Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1200000,2800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='DevOps Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2500000,5000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='DevOps Engineer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cybersecurity' and c.name='Testing' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cybersecurity' and c.name='Engineering' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cybersecurity' and c.name='Reasoning' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',500000,1100000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cybersecurity';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1100000,2500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cybersecurity';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2200000,4500000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cybersecurity';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cloud Engineer' and c.name='Docker' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cloud Engineer' and c.name='Deployment' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Cloud Engineer' and c.name='Engineering' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',600000,1200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cloud Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1200000,2800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cloud Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2400000,4800000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Cloud Engineer';
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Product Data Engineer' and c.name='SQL' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Product Data Engineer' and c.name='Python' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Product Data Engineer' and c.name='Pandas' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Product Data Engineer' and c.name='Engineering' on conflict do nothing;
insert into role_competencies(role_id,competency_id,importance) select r.id,c.id,1 from career_roles r,competencies c where r.name='Product Data Engineer' and c.name='Deployment' on conflict do nothing;
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Entry / Associate',500000,1000000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Product Data Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Mid-level',1000000,2400000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Product Data Engineer';
insert into job_market_snapshots(role_id,market_date,location,experience_band,salary_min_inr,salary_max_inr,source_name,notes) select r.id,current_date,'India','Senior',2200000,4200000,'SKILLSETRA demo dataset','Illustrative demo band; replace with dated sourced data before public claims.' from career_roles r where r.name='Product Data Engineer';
insert into assessments(slug,title,pass_percent) values
('ml-engineer-baseline','ML Engineer Baseline Assessment',70),
('ai-engineer-baseline','AI Engineer Baseline Assessment',70)
on conflict(slug) do nothing;

-- Expanded subject catalog (idempotent by slug)
insert into subjects(slug,name,category,description,levels,languages) values
('python','Python','Programming','Core Python fluency, packaging, async patterns, testing and maintainable application code.','["Beginner","Intermediate","Advanced","Expert"]','["English","Hindi"]'),
('sql','SQL & Databases','Data','Relational modeling, joins, indexing, transactions and query reasoning.','["Beginner","Intermediate","Advanced"]','["English","Hindi"]'),
('machine-learning','Machine Learning','AI / ML','Modeling, evaluation, feature engineering, experimentation and production ML reasoning.','["Beginner","Intermediate","Advanced","Expert"]','["English"]'),
('ai-engineering','AI Engineering','AI / ML','LLM applications, evaluation, tool use, retrieval, safety and AI product engineering.','["Intermediate","Advanced","Expert"]','["English"]'),
('react','React & Next.js','Web','Components, state, server/client boundaries, accessibility and production UI patterns.','["Beginner","Intermediate","Advanced"]','["English","Hindi"]'),
('fastapi','FastAPI & APIs','Backend','API design, validation, dependencies, auth, testing and observability.','["Beginner","Intermediate","Advanced"]','["English"]'),
('docker','Docker & Containers','Cloud / DevOps','Images, containers, networking, volumes and reproducible application delivery.','["Beginner","Intermediate","Advanced"]','["English"]'),
('cloud','Cloud Engineering','Cloud / DevOps','Cloud architecture, networking, IAM, reliability, cost and deployment practices.','["Beginner","Intermediate","Advanced","Expert"]','["English"]'),
('cybersecurity','Cybersecurity','Security','Threat modeling, secure coding, identity, application security and defensive reasoning.','["Beginner","Intermediate","Advanced","Expert"]','["English"]'),
('data-analysis','Data Analysis & Visualization','Data','Cleaning, analysis, visualization, statistical reasoning and communicating findings.','["Beginner","Intermediate","Advanced"]','["English","Hindi"]'),
('testing','Software Testing','Engineering','Unit, integration, contract, end-to-end, property and failure-path testing.','["Beginner","Intermediate","Advanced"]','["English","Hindi"]'),
('system-design','System Design','Engineering','Scalability, distributed systems, reliability, queues, caching and architecture trade-offs.','["Intermediate","Advanced","Expert"]','["English"]'),
('devops','DevOps & CI/CD','Cloud / DevOps','CI/CD, automation, observability, release strategies and infrastructure workflows.','["Beginner","Intermediate","Advanced"]','["English"]'),
('communication','Technical Communication','Professional','Technical writing, decision records, project defense and clear explanation of trade-offs.','["Beginner","Intermediate","Advanced"]','["English","Hindi"]')
on conflict(slug) do update set description=excluded.description,levels=excluded.levels,languages=excluded.languages;
