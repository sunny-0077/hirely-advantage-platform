"""Validate a generated catalogue before importing it: python3 validate_catalogue.py catalogue.json."""
import json,sys
from collections import Counter
d=json.load(open(sys.argv[1]))
assert len(d['resume_industries'])==35
assert len(d['resume_career_levels'])==26
assert len(d['resume_occupations'])>=1000
assert len(d['resume_job_titles'])>10000
titles={t['title'] for t in d['resume_job_titles']}
for title in ['Senior HR Manager','HR Executive','Talent Acquisition Specialist','Senior Recruiter','Data Analyst','Senior Data Scientist','Machine Learning Engineer','Software Engineer','Principal Software Engineer','IT Administrator','Cybersecurity Analyst','Financial Analyst','Chartered Accountant','Risk Advisory Consultant','Business Analyst','Senior Management Consultant','Digital Content Lead','SEO Specialist','Customer Insights Manager','Senior Account Executive','Director of Sales','Customer Support Team Lead','Store Manager','Product Line Manager','Operations Director']:
 assert title in titles,title
assert len({t['normalized_title'] for t in d['resume_job_titles']})==len(d['resume_job_titles'])
assert len({(t['title_id'],t['normalized_alias']) for t in d['resume_title_aliases']})==len(d['resume_title_aliases'])
assignments=Counter((a['occupation_id'],a['level_id']) for a in d['resume_template_assignments'])
for level in d['resume_occupation_levels']:assert assignments[(level['occupation_id'],level['level_id'])]>=2
for level in d['resume_occupation_levels']:
 if level['occupation_id'].startswith('onet-29-'):assert level['level_id']!='founder-ceo'
orders={b['id']:b['definition']['order'] for b in d['resume_role_blueprints']}
assert orders['clinical'][1]=='certifications'
assert 'publications' in orders['research']
assert orders['technical'][1]=='skills'
assert orders['creative'][1]=='projects'
print('Catalogue checks passed:',len(titles),'titles; multiple templates for',len(assignments),'occupation/level combinations.')