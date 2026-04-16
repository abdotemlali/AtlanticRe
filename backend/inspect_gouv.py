import sqlite3, json

conn = sqlite3.connect('atlanticre.db')
cur = conn.cursor()

cur.execute('SELECT * FROM ext_gouvernance LIMIT 8')
rows = cur.fetchall()
desc = [d[0] for d in cur.description]

print('COLUMNS:', desc)
print()
for r in rows:
    print(dict(zip(desc, r)))

print()
cur.execute('SELECT COUNT(*) FROM ext_gouvernance')
print('Total rows:', cur.fetchone()[0])

cur.execute('SELECT DISTINCT pays FROM ext_gouvernance ORDER BY pays')
pays = [r[0] for r in cur.fetchall()]
print('Countries:', len(pays))

cur.execute('SELECT DISTINCT annee FROM ext_gouvernance ORDER BY annee')
years = [r[0] for r in cur.fetchall()]
print('Years:', years)

# Stats per column
print()
for col in desc:
    if col not in ('pays', 'region', 'annee'):
        cur.execute(f'SELECT MIN({col}), MAX({col}), AVG({col}) FROM ext_gouvernance WHERE {col} IS NOT NULL')
        mn, mx, av = cur.fetchone()
        cur.execute(f'SELECT COUNT(*) FROM ext_gouvernance WHERE {col} IS NOT NULL')
        cnt = cur.fetchone()[0]
        print(f'{col}: min={mn:.3f if mn else "N/A"}, max={mx:.3f if mx else "N/A"}, avg={av:.3f if av else "N/A"}, populated={cnt}')

conn.close()
