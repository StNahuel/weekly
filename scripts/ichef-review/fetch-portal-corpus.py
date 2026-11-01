import json, sys, time, urllib.parse, urllib.request
OUT = sys.argv[1]
TERMS = ["arroz integral", "arroz blanco", "arroz con pollo", "papas al vapor", "papas", "boniato", "pure de papas",
 "salsa de tomate", "salsa pomodoro", "boloñesa", "ragu", "albondigas", "fideos", "pasta", "brocoli al vapor",
 "verduras al vapor", "pollo al vapor", "salmon", "pescado al vapor", "merluza", "camarones", "huevos revueltos",
 "huevo duro", "huevos", "tzatziki", "lentejas", "garbanzos", "hummus", "licuado", "smoothie", "jugo", "limonada",
 "te verde", "infusion", "sopa crema de calabaza", "sopa", "salteado", "wok", "salsa de soja", "curry",
 "zucchini", "zanahoria", "pollo", "carne", "salsa", "aderezo", "edamame", "kale", "cebolla caramelizada", "sofrito"]
SEARCH = "https://recetas.ichef.com.uy/api/recipes?"
DETAIL = "https://www.ichef.uy:8443/ICHEF-WAR/api/recetas/"
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "*/*"}), timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))
seen = {}
for term in TERMS:
    q = urllib.parse.urlencode({"page": 1, "perPage": 6, "language": "es", "filters": json.dumps({"search": term, "includeVariants": True, "excludePortionVariants": True})})
    try:
        res = get(SEARCH + q).get("data") or []
    except Exception as e:
        print("search fail", term, e); continue
    for item in res[:4]:
        rid = item["idReceta"]
        if rid in seen: seen[rid]["terms"].append(term); continue
        time.sleep(0.4)
        try:
            d = get(DETAIL + str(rid))
        except Exception as e:
            print("detail fail", rid, e); continue
        t = next((x for x in d.get("traducciones", []) if x.get("codLenguaje") == "es"), (d.get("traducciones") or [{}])[0])
        seen[rid] = {"id": rid, "title": t.get("titulo") or d.get("titulo"), "portions": t.get("porciones"), "terms": [term],
            "accessories": t.get("accesorios"), "notes": t.get("notasChef"),
            "steps": [((p.get("titulo") or "") + " " + (p.get("parrafo") or "")).replace("ï¿½C", "°C").replace("ï¿½", "°").strip() for p in t.get("preparacion") or []]}
    time.sleep(0.4)
json.dump(list(seen.values()), open(OUT, "w"), ensure_ascii=False, indent=1)
print("recipes", len(seen))
