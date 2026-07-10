#!/usr/bin/env python3
import sqlite3, json, sys, os
base=os.path.dirname(os.path.dirname(__file__))
db=os.path.join(base, 'smartcity_complaints.db')
mapfile=os.path.join(base, 'src', 'main', 'resources', 'ml-category-mapping.json')
if not os.path.exists(db):
    print('DB not found at', db); sys.exit(1)
if not os.path.exists(mapfile):
    print('Mapping file not found at', mapfile); sys.exit(1)
with open(mapfile,'r',encoding='utf-8') as f:
    mapping=json.load(f)
conn=sqlite3.connect(db)
cur=conn.cursor()
cur.execute("SELECT id, category, ranked_categories FROM complaints WHERE ranked_categories IS NOT NULL")
rows=cur.fetchall()
updates=0
for id, cat, ranked in rows:
    try:
        ranked_list=json.loads(ranked)
        if not ranked_list:
            continue
        top=ranked_list[0].get('category')
    except Exception:
        continue
    mapped=mapping.get(top)
    if mapped and (cat or '').strip() != mapped:
        print(f"Updating id={id} '{cat}' -> '{mapped}'")
        cur.execute("UPDATE complaints SET category=? WHERE id=?", (mapped, id))
        updates+=1
conn.commit()
print('Total updates:', updates)
conn.close()
