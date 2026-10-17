import base64,re
from urllib.parse import urlparse,quote
import httpx

def parse_repo_url(value:str):
 raw=(value or '').strip()
 if not raw: raise ValueError('Enter a GitHub repository URL.')
 if not raw.startswith(('http://','https://')): raw='https://github.com/'+raw.lstrip('/')
 p=urlparse(raw)
 if p.scheme!='https' or p.netloc.lower() not in {'github.com','www.github.com'} or p.username or p.password or p.port:
  raise ValueError('Only HTTPS GitHub repository URLs are allowed.')
 if p.query or p.fragment: raise ValueError('Use a repository URL without query parameters or fragments.')
 parts=[x for x in p.path.split('/') if x]
 if len(parts) not in {2,3} or (len(parts)==3 and parts[2] != ''): raise ValueError('Use a repository URL like https://github.com/owner/repo.')
 owner, repo = parts[0], re.sub(r'\.git$','',parts[1])
 if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?',owner): raise ValueError('The GitHub owner name is invalid.')
 if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',repo) or repo in {'.','..'}: raise ValueError('The GitHub repository name is invalid.')
 return owner,repo
async def github_request(path:str,token:str=''):
 headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
 if token:headers['Authorization']=f'Bearer {token}'
 async with httpx.AsyncClient(timeout=15,follow_redirects=False) as c:
  r=await c.get(f'https://api.github.com{path}',headers=headers)
  if r.is_redirect:raise ValueError('GitHub redirect rejected for SSRF protection.')
  r.raise_for_status();return r.json()
def _names(items):return [x.get('path') or x.get('name','') for x in items if isinstance(x,dict) and (x.get('path') or x.get('name'))]
def _claim(claim,evidence,confidence='medium',limitation=''):return {'claim':claim,'evidence':evidence,'confidence':confidence,'limitation':limitation}
async def analyze_public_repo(url:str,token:str=''):
 owner,repo=parse_repo_url(url);meta=await github_request(f'/repos/{owner}/{repo}',token)
 # This endpoint is explicitly a public-repository analyzer. A server-wide token must never
 # turn a user-supplied URL into an indirect private-repository inspection capability.
 if isinstance(meta,dict) and meta.get('private') is True:
  raise ValueError('Only public GitHub repositories can be analyzed. Private repository access is not supported.')
 branch=meta.get('default_branch') or 'main';tree=await github_request(f'/repos/{owner}/{repo}/git/trees/{quote(branch,safe="")}?recursive=1',token)
 entries=tree.get('tree',[]) if isinstance(tree,dict) else []
 truncated=bool(tree.get('truncated')) if isinstance(tree,dict) else False
 if len(entries)>5000: entries=entries[:5000]; truncated=True
 paths=[x.get('path','') for x in entries if x.get('type')=='blob'];dirs=[x.get('path','') for x in entries if x.get('type')=='tree']
 languages=await github_request(f'/repos/{owner}/{repo}/languages',token)
 commits=await github_request(f'/repos/{owner}/{repo}/commits?per_page=12',token)
 prs=await github_request(f'/repos/{owner}/{repo}/pulls?state=all&per_page=10',token)
 readme_text=''
 try:
  readme=await github_request(f'/repos/{owner}/{repo}/readme',token)
  if readme.get('content'):readme_text=base64.b64decode(readme['content']).decode('utf-8','ignore')[:8000]
 except Exception:pass
 low={p.lower() for p in paths};signals=[]
 if any(p.endswith('readme.md') for p in low):signals.append('README')
 if any('/test' in p or '/tests' in p or p.startswith('test') or 'pytest' in p or 'jest' in p or 'vitest' in p for p in low):signals.append('Tests')
 if any(p.endswith('dockerfile') or 'docker-compose' in p or p.endswith('compose.yml') for p in low):signals.append('Docker')
 if any(p.startswith('.github/workflows/') for p in low):signals.append('CI/CD')
 if any(p.endswith(x) for p in low for x in ('package.json','pyproject.toml','requirements.txt','go.mod','pom.xml','cargo.toml')):signals.append('Dependency manifests')
 if any('/docs/' in p or p.startswith('docs/') for p in low):signals.append('Documentation')
 if any('terraform' in p or p.endswith('.tf') for p in low):signals.append('Infrastructure as code')
 if any('security' in p or 'dependabot' in p for p in low):signals.append('Security configuration')
 root=[p for p in paths if '/' not in p][:80]
 facts={'visibility':'private' if meta.get('private') else 'public','repository':f'{owner}/{repo}','url':f'https://github.com/{owner}/{repo}','description':meta.get('description') or 'No description','default_branch':branch,'stars':meta.get('stargazers_count',0),'forks':meta.get('forks_count',0),'open_issues':meta.get('open_issues_count',0),'updated_at':meta.get('updated_at'),'created_at':meta.get('created_at'),'languages':list(languages.keys())[:12],'root_files':root,'file_count':len(paths),'directory_count':len(dirs),'inspection_truncated':truncated,'signals':signals,'recent_commit_count_sample':len(commits) if isinstance(commits,list) else 0,'pull_request_sample_count':len(prs) if isinstance(prs,list) else 0,'has_tests':'Tests' in signals,'has_ci':'CI/CD' in signals,'has_docker':'Docker' in signals,'has_readme':'README' in signals,'has_docs':'Documentation' in signals,'has_security_config':'Security configuration' in signals,'readme_excerpt':readme_text[:6000]}
 claims=[_claim('Repository structure contains observable engineering artifacts.',[f"{facts['file_count']} files and {facts['directory_count']} directories were returned by the repository tree.",f"Languages: {', '.join(facts['languages']) or 'none detected'}",f"Signals: {', '.join(signals) or 'none detected'}"],'high','Repository artifacts do not prove the individual author wrote the code or has mastery.'),_claim('Testing evidence is visible.' if facts['has_tests'] else 'Testing evidence was not found in the inspected tree.', ['Test directories/configurations were detected.'] if facts['has_tests'] else ['No recognized test directory/configuration was found in the inspected tree.'],'medium','Repository inspection cannot prove test quality without executing tests.'),_claim('CI/CD evidence is visible.' if facts['has_ci'] else 'CI/CD evidence was not found in the inspected tree.', ['GitHub Actions workflow files were detected.'] if facts['has_ci'] else ['No GitHub Actions workflow files were detected.'],'medium','Other CI systems may exist outside the inspected repository or via external infrastructure.')]
 suggestions=[]
 if not facts['has_tests']:suggestions.append({'title':'Add failure-path tests','why':'No recognizable test artifacts were found in the inspected tree.','competency':'Testing','proof':'Add unit/integration tests and record a reproducible run.'})
 if not facts['has_ci']:suggestions.append({'title':'Add a CI quality gate','why':'No GitHub Actions workflow was detected.','competency':'Delivery','proof':'Run type checks, lint and tests on pull requests.'})
 if not facts['has_docs']:suggestions.append({'title':'Document architecture','why':'No docs directory was detected.','competency':'Communication','proof':'Add architecture, setup, testing and decision records.'})
 if not facts['has_security_config']:suggestions.append({'title':'Document security controls','why':'No obvious security configuration signal was detected.','competency':'Security','proof':'Add dependency scanning, secret handling and threat-model notes appropriate to the project.'})
 if not suggestions:suggestions.append({'title':'Deepen transfer evidence','why':'Multiple engineering signals are visible.','competency':'Transfer','proof':'Defend one design change under a new constraint and verify the changed behavior.'})
 return {'facts':facts,'claims':claims,'suggestions':suggestions,'observed':facts,'inferred':claims,'recommended':suggestions}
