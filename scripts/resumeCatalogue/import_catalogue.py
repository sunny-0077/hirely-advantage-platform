"""Admin-only seed upload. Reads a local minted session without printing credentials.
Usage: python3 import_catalogue.py catalogue.json SESSION_FILE FUNCTION_URL
"""
import json,sys,requests,concurrent.futures
data=json.load(open(sys.argv[1]));session=json.load(open(sys.argv[2]))['session'];url=sys.argv[3]
def send(table,rows):
 response=requests.post(url,headers={'Authorization':'Bearer '+session['access_token']},json={'table':table,'rows':rows},timeout=90)
 if response.status_code!=200:raise RuntimeError('Catalogue batch failed: '+str(response.status_code))
 return len(rows)
for table,rows in data.items():
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  count=sum(pool.map(lambda chunk:send(table,chunk),[rows[i:i+1000] for i in range(0,len(rows),1000)]))
 print(table,count,flush=True)