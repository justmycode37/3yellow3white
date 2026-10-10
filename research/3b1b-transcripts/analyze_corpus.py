import csv, json, re, statistics
from pathlib import Path

BASE=Path(__file__).resolve().parent
COMMIT='0bce59666e3b16b449d414da253beb11257b5da6'
PATTERNS={
 'explicit_pause':r'\bpaus(?:e|ing)\b',
 'imagine':r'\bimagin(?:e|ing)\b',
 'notice':r'\bnotic(?:e|ing)\b',
 'think_of':r'\bthink of\b',
 'zoom':r'\bzoom\w*\b',
 'color_word':r'\b(?:blue|yellow|green|red|pink|purple|orange|teal)\b',
 'question_mark':r'\?',
 'you_your':r'\b(?:you|your)\b',
}
rows=[]
for p in sorted(BASE.glob('*/**/english/sentence_timings.json')):
    data=json.loads(p.read_text(encoding='utf-8'))
    key=p.relative_to(BASE).as_posix().removesuffix('/english/sentence_timings.json')
    text=' '.join(x[0] for x in data)
    urlfile=p.parent.parent/'video_url.txt'
    url=urlfile.read_text(encoding='utf-8').strip() if urlfile.exists() else ''
    excluded=('/shorts/' in key or '/ldm-' in key or re.search(r'/(qa[34]|some.*|harvey-mudd-speech|manim-demo|lockdown-math-announcement|fourier-series-montage|eulers-formula-poem|ego-and-math|how-they-fool-ya)$',key))
    row={'video':key,'subset':('empty' if not data else ('main_explainers' if not excluded else 'other_formats')),'words':len(re.findall(r"\b[\w]+(?:['’][\w]+)*\b",text)), 'sentences':len(data), 'first_caption_s':data[0][1] if data else 0,'last_caption_s':max(x[2] for x in data) if data else 0,'video_url':url,'caption_url':f'https://github.com/3b1b/captions/blob/{COMMIT}/{key}/english/sentence_timings.json'}
    for name,pat in PATTERNS.items():row[name]=len(re.findall(pat,text,re.I))
    rows.append(row)
    pretty='\n'.join(f'[{int(s)//60:02d}:{int(s)%60:02d}–{int(e)//60:02d}:{int(e)%60:02d}] {t}' for t,s,e in data)
    (p.parent/'readable.txt').write_text(pretty,encoding='utf-8')
with (BASE/'corpus-inventory.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
result={}
for subset in ['all','main_explainers','other_formats']:
    selected=rows if subset=='all' else [r for r in rows if r['subset']==subset]
    result[subset]={'videos':len(selected),'words':sum(r['words'] for r in selected),'caption_span_hours':round(sum(r['last_caption_s']-r['first_caption_s'] for r in selected)/3600,2),'median_last_caption_minutes':round(statistics.median(r['last_caption_s'] for r in selected)/60,2),'lexical_markers':{k:{'videos_with_match':sum(r[k]>0 for r in selected),'total_matches':sum(r[k] for r in selected)} for k in PATTERNS}}
(BASE/'corpus-statistics.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
