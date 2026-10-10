import json
from pathlib import Path
B=Path(__file__).resolve().parent
merged={}
groups={}
def add(name,rows):
    groups[name]=len(rows)
    for r in rows:
        key=r['key']
        assert key not in merged,key
        note=r.get('notes',r['evidence'])
        if ' | ' in note:note=note.split(' | ',1)[1]
        note=note.split(' Quote:',1)[0]
        merged[key]=note
add('root',json.loads((B/'root-analysis.json').read_text(encoding='utf-8'))['videos'])
add('foundational',json.loads((B/'foundational-compact-evidence.json').read_text(encoding='utf-8')))
add('midperiod',json.loads((B.parent/'midperiod-evidence-list.json').read_text(encoding='utf-8')))
add('modern',json.loads((B.parent/'modern-analysis.json').read_text(encoding='utf-8'))['inventory'])
(B/'merged-evidence.json').write_text(json.dumps(merged,indent=2,ensure_ascii=False),encoding='utf-8')
(B/'reading-coverage.json').write_text(json.dumps({'full_reads_by_agent':groups,'full_read_count':len(merged),'sampled_count':0,'keys':sorted(merged)},indent=2),encoding='utf-8')
print(groups, 'unique full reads:',len(merged))
