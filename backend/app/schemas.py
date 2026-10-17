from typing import Any
from pydantic import BaseModel,Field,field_validator

def _safe_http_url(value:str|None)->str|None:
    """Only allow empty values or http(s) URLs so stored links can never be javascript:/data: URLs."""
    if value is None or value=="":return value
    v=value.strip()
    if not v.lower().startswith(("http://","https://")):
        raise ValueError("URL must start with http:// or https://")
    return v

class ChallengeSubmit(BaseModel):
    answer:str=Field(min_length=1,max_length=12000)
    provider:str|None=None
    model:str|None=None
    language:str="English"

class ProjectAnalyze(BaseModel):
    name:str=Field(min_length=1,max_length=120)
    description:str=Field(min_length=10,max_length=5000)
    repo_url:str=Field(default='',max_length=1000)
    demo_url:str=Field(default='',max_length=1000)
    provider:str|None=None
    model:str|None=None
    language:str="English"

    @field_validator("repo_url","demo_url")
    @classmethod
    def _project_http_only(cls, value): return _safe_http_url(value)

class ResumeDraftPayload(BaseModel):
    form:dict[str,Any]
    projects:list[dict[str,Any]]=Field(default_factory=list,max_length=30)
    updated_at:str|None=Field(default=None,max_length=80)

class GoalUpdate(BaseModel):
    target_role:str=Field(min_length=1,max_length=120)
    experience:str=Field(default="",max_length=120)
    goal:str=Field(default="",max_length=1000)

class ProfileUpdate(BaseModel):
    name:str=Field(min_length=1,max_length=120)
    target_role:str=Field(max_length=120)
    goal:str=Field(default="",max_length=1000)

class SettingsUpdate(BaseModel):
    ai_provider:str=Field(default="puter",pattern="^puter$",max_length=40)
    ai_model:str=Field(default="openai/gpt-oss-20b",max_length=120)
    language:str=Field(default="English",max_length=40)
    notifications:bool=True
    appearance:str=Field(default="dark",pattern="^(dark|light)$")
    privacy:bool=True

class AskAI(BaseModel):
    question:str=Field(min_length=2,max_length=5000)
    context:str="general"
    language:str="English"
    provider:str|None=None
    model:str|None=None
    provider_model:str|None=None
    role:str=""
    goal:str=""

class AssessmentSubmit(BaseModel):
    assessment_id:str=Field(min_length=1,max_length=120)
    attempt_id:str|None=Field(default=None,min_length=1,max_length=120)
    answers:dict[str,str]

class AssessmentGenerate(BaseModel):
    role:str=Field(min_length=1,max_length=120)
    provider:str|None=None
    model:str|None=None
    language:str="English"
    count:int=Field(default=8,ge=3,le=15)
    competency:str=Field(default="",max_length=120)
    blind_transfer:bool=False

class AssessmentQuestionAsk(BaseModel):
    role:str=Field(min_length=1,max_length=120)
    competency:str=""
    provider:str|None=None
    model:str|None=None
    language:str="English"

class UpgradeSubmit(BaseModel):
    project_id:str="demo-project"
    upgrade_id:str

class ResourceSummary(BaseModel):
    resource_id:str
    language:str="English"
    provider:str|None=None
    model:str|None=None

class DefenseSubmit(BaseModel):
    project_id:str=Field(default="demo-project",max_length=120)
    question:str=Field(min_length=1,max_length=2000)
    answer:str=Field(min_length=1,max_length=6000)
    provider:str|None=None
    model:str|None=None
    language:str="English"

class GitHubAnalyzeRequest(BaseModel):
    url:str=Field(min_length=10,max_length=500)
    provider:str|None=None
    model:str|None=None
    language:str="English"


class LearningLinkCreate(BaseModel):
    field:str=Field(min_length=1,max_length=120)
    language:str="English"
    title:str=Field(min_length=1,max_length=200)
    url:str=Field(min_length=5,max_length=1000)
    kind:str=Field(default="Course",max_length=60)
    pdf_url:str=Field(default="",max_length=1000)
    description:str=Field(default="",max_length=2000)

    @field_validator("url","pdf_url")
    @classmethod
    def _http_only(cls,v): return _safe_http_url(v)

class InterviewStart(BaseModel):
    role:str="Software Developer"
    interview_type:str="Technical"
    level:str="Intermediate"
    language:str="English"
    provider:str|None=None
    model:str|None=None
    company:str=""
    focus:str=""
    mode:str="Live Interview"
    difficulty:str="Intermediate"
    english_training:bool=False
    english_level:str=Field(default="Intermediate",max_length=40)
    time_limit_minutes:int=Field(default=10,ge=0,le=180)
    question_number:int=Field(default=1,ge=1,le=20)
    total_questions:int=Field(default=5,ge=1,le=20)
    previous_question:str=Field(default="",max_length=2000)
    previous_answer:str=Field(default="",max_length=12000)
    previous_questions:list[str]=Field(default_factory=list,max_length=20)

    @field_validator("previous_questions")
    @classmethod
    def _validate_previous_questions(cls, values):
        if any(not isinstance(item, str) or len(item) > 2000 for item in values):
            raise ValueError("Each previous interview question must be text with at most 2000 characters.")
        return [item.strip() for item in values]

class InterviewAnswer(BaseModel):
    session_id:str=Field(min_length=1,max_length=120)
    question:str=Field(min_length=1,max_length=2000)
    answer:str=Field(min_length=1,max_length=12000)
    language:str="English"
    provider:str|None=None
    model:str|None=None
    role:str=Field(default="",max_length=120)
    competency:str=Field(default="",max_length=120)
    interview_type:str=Field(default="Technical",max_length=80)
    difficulty:str=Field(default="Intermediate",max_length=40)
    mode:str=Field(default="Mock interview",max_length=80)
    english_training:bool=False
    english_level:str=Field(default="Intermediate",max_length=40)


class EvidenceClaimCreate(BaseModel):
    claim:str=Field(min_length=3,max_length=500)
    competency:str=Field(min_length=1,max_length=120)
    target_role:str=''
    evidence_title:str=Field(default="Self-declared claim",min_length=3,max_length=200)
    evidence_description:str=Field(default="",max_length=5000)

    @field_validator("evidence_title", mode="before")
    @classmethod
    def _normalise_evidence_title(cls, value):
        # The UI sends an empty string when this optional field is left blank.
        # Normalize it before min_length validation so valid claims are recorded.
        if value is None or (isinstance(value, str) and not value.strip()):
            return "Self-declared claim"
        return value.strip() if isinstance(value, str) else value
    evidence_type:str='Project artifact'
    evidence_url:str=Field(default='',max_length=1000)
    existing_evidence_id:str=Field(default='',max_length=120)

    @field_validator("evidence_url")
    @classmethod
    def _http_only(cls,v): return _safe_http_url(v)
    ai_consent:bool=False


class AIReviewPayload(BaseModel):
    result:str=Field(min_length=1,max_length=12000)
    provider:str="puter"


class ContactMessage(BaseModel):
    name:str=Field(default="Anonymous user",min_length=1,max_length=120)
    email:str|None=Field(default=None,max_length=320)
    subject:str=Field(min_length=3,max_length=200)
    message:str=Field(min_length=10,max_length=6000)
    rating:int|None=Field(default=None,ge=1,le=5)
    category:str|None=Field(default=None,max_length=120)
