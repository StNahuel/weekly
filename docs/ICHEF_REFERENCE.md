# iChef reference (from the official recipe portal)

How the iChef is used in the manufacturer's public recipes at [recetas.ichef.com.uy](https://recetas.ichef.com.uy/recetas). This is the yardstick for every iChef step in `data/ichef-variants.json` and `data/step-fixes.json`. The settings come from 154 portal recipes chosen because they resemble dishes in our book. Each is cited by portal id, and the recipe is at `https://recetas.ichef.com.uy/receta/<id>`.

## Device and accessories

[ichef.com.uy/producto/robot-ichef](https://ichef.com.uy/producto/robot-ichef/) gives these specs:
- 2.2 L jar.
- Blades at 100–10,700 rpm, kneading at 40 rpm.
- Heating with an integrated sensor and a scale.
- Steamer ("vaporera"), whisk attachment ("accesorio batidor"), spatula and blade guard.

Accessories the portal recipes use:
- **Canasta de cocción** (cooking basket), in 77 recipes. It goes **inside the jar** to cook rice, lentils, chickpeas and eggs in plenty of water, to drain pasta, and as a strainer. Set **on top of the lid** (in place of the measuring cup), it acts as a splash guard.
- **Vaporera** (steamer), in 21 recipes. It sits on the lid (without the measuring cup) and has a lower part, a middle tray and a transparent lid. It steams potatoes, broccoli, fish, salmon (in foil) and chicken **while the jar below holds water, a sauce or rice**. Its flat tray also works as a splash guard.
- **Accesorio batidor** (whisk), in 12 recipes. It is for mash and for browning cubed chicken without shredding it (wok chicken, id 10871).
- **Tapa con / sin taza medidora**: "con" (with the measuring cup) for chopping, blending and short cooks; "sin" (without it) for long cooks, so steam escapes.

## Settings vocabulary

Speeds go 0.3–10 with a direction: **Avance** (forward) or **Reversa** (reverse). Reverse is available.

| Use | Setting in portal recipes |
|---|---|
| Stir pieces gently while cooking | **0.3 Reversa** (most common), 0.5 Reversa, 1.0 Reversa |
| General cooking / heating water | 1.0 Avance |
| Chop onion, garlic, carrot, pepper | "Procesar" **5.0, 5–10 s**, lid with measuring cup; scrape down |
| Grate cucumber / herbs | 5.0 for 5 s; yogurt dressing then 3.0 for 20 s (id 1669) |
| Sauces with garlic, ginger, soy | 6.0–7.5 for 10–20 s (ids 4186, 4189, 1785) |
| Smoothies / fruit juices | 8.0–9.0 for 40–45 s, cold; strain with the basket if needed (ids 2906, 255, 4140) |
| Hot cream soups | wait **< 90 °C**, then ramp gradually up to 8.5 (id 57) |

Temperatures used: 37–160 °C.
- **100 °C** to boil and simmer.
- **95 °C** for slow sauces, pasta and eggs.
- **120 °C** to sauté ("sofreír") with oil. Examples: sofrito at 120 °C, vel. 3, 5 min (id 4319); onion and pepper at 120 °C, 1.0 Rev, 7.5 min (id 1484); caramelized onion at 120 °C, 1.0 Rev, 35 min (id 1491).
- **160 °C** to brown chicken or zucchini pieces, at 0.3 Rev for 3–10 min (ids 10871, 11176).
- **"Cocinar al vapor"** is a steaming mode with vel. 1.0–2.0 (ids 190, 1433, 2923, 4189).

## Patterns that match our dishes

- **Brown rice** (id 1193): 950 g water per 200 g rice in the jar, rice **in the cooking basket**, lid without the measuring cup and the steamer tray on top as a splash guard. **100 °C, 2.0 Avance, 35 min.**
- **White or basmati rice** (ids 1366, 4189): 1000 g water + a little oil, rice in the basket, **100 °C, 3.0 Avance, 18 min**. While it cooks, fish can steam in the vaporera above. After the rice comes out, steam another 8 min if needed (id 4189).
- **Pasta** (id 1178): 1500 g water at 100 °C, 1.0, 8 min, lid with the measuring cup. Add the pasta, lid without the cup and the basket on top, then **95 °C, 0.3 Reversa, per the package time**. Drain with the basket.
- **Steamed potatoes** (id 190): 750 g water in the jar, vaporera on top, potatoes in 1–2 cm slices or cubes, **al vapor, 1.0, 20 min**.
- **Potatoes plus sauce at once** (id 2923): blend the sauce below (6.0, 30 s). Then potatoes in the lower vaporera, al vapor 1.0 Rev, 10 min. Then fish on the middle tray for another 15 min.
- **Steamed broccoli** (id 1433): 800 g water, vaporera, al vapor 1.0, 18 min. **Steamed fish in foil** (ids 1315, 4186): 700–1000 g water, vaporera.
- **Lentils** (id 1511): 850 g water, lentils in the basket, 100 °C, 2.5 Avance, 40 min. **Chickpeas** (id 1192), soaked: 1 h in the basket.
- **Hard-boiled eggs** (id 2610): 700 g water, eggs in the basket, lid without the cup, **100 °C, 1.0, 18 min**.
- **Scrambled eggs** (id 8500): sauté mushrooms at 100 °C, 0.3 Rev, 4 min. Add the eggs, then **95 °C, 1.5 Reversa, ~9 min** for 5 eggs.
- **Tomato sauce** (ids 4319, 36): chop 5.0 for 6–10 s, sauté with oil (100–120 °C, 1.0 Rev or 3.0, 5–7 min), add tomato, then 95–120 °C, 0.3–1.0, 12–25 min with the basket as splash guard.
- **Bolognese** (id 36): ground meat at 95 °C, 0.3 Rev, then sauce at 95 °C, 0.3 Rev, 12 min.
- **Garlic shrimp** (id 11642): garlic oil at 100 °C, 0.5, 8 min, then **shrimp at 110 °C, 0.3 Rev, 5 min**. Curry shrimp (id 664): 95 °C, 0.3 Rev, 5 min.
- **Wok-style chicken** (id 10871): preheat the oil at 120 °C, onion at 120 °C, 0.3 Rev, then **chicken with cornstarch and the whisk at 160 °C, 0.3 Rev, 10 min**, sauce at 120 °C, 0.5, peppers at 120 °C, 0.5 Rev, 3 min. Real crispy searing still belongs in the air fryer or the wok. The iChef browns gently.
- **Green tea** (id 7050): 250 g water at 80 °C, 1.0, 4 min, then steep 2–3 min.
- **Meatball mix** (id 157): chop aromatics at 5.0 for 5 s, then meat and binders at 6.0 for 15 s. The meatballs are cooked outside the jar.

## Safety conventions in the portal

- Long hot cooks use the lid **without** the measuring cup and the basket or steamer tray on top against splashes.
- Hot blending only after the mix drops below 90 °C, ramping the speed gradually.
- Water for the vaporera is always at least 700 g.
- Stay within the 2.2 L jar and the MAX mark. With 3–4 portions, cook in batches.
