#!/usr/bin/env python3
"""Sanity validation for personal PWA JSON seed bundle."""
from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
foods=json.loads((r/'data/foods.json').read_text(encoding='utf-8'))
soups=json.loads((r/'data/soups.json').read_text(encoding='utf-8'))
profile=json.loads((r/'data/defaults.json').read_text(encoding='utf-8'))
ing={x['id'] for x in foods['ingredients']}
assert len(ing)==len(foods['ingredients']),'duplicate master ingredient'
recipe_ids={x['id'] for x in soups['recipes']}
assert len(recipe_ids)==len(soups['recipes'])==9,'expected 9 soups'
assert len(foods['proteins'])==10
assert len(foods['sides'])==20
assert len(foods['breakfasts'])==6
assert len(foods['snacks'])==6
assert profile['interface']['macrosCollapsedDefault'] is True
assert profile['interface']['activityChoices']==['strength','boxing','rest','busy','sick']
assert profile['interface']['socialDinnerMode'].startswith('Independent')
for kind in ['proteins','sides','breakfasts','snacks']:
    ids=[x['id'] for x in foods[kind]]
    assert len(ids)==len(set(ids)),f'duplicate {kind}'
    for item in foods[kind]:
        for x in item.get('ingredients',[]):
            assert x['ingredientId'] in ing,(kind,item['id'],x['ingredientId'])
            assert x['grams']>0
        if item.get('kind')=='soup_ref':
            assert item['soupId'] in recipe_ids
for f in foods['favoriteCombos']:
    assert f['proteinId'] in {x['id'] for x in foods['proteins']}
    assert f['sideId'] in {x['id'] for x in foods['sides']}
f=next(x for x in foods['favoriteCombos'] if x['id']=='fav_salmon_leek_peas')
assert f['proteinId']=='salmon' and f['sideId']=='soup_verde'
salmon=next(x for x in foods['proteins'] if x['id']=='salmon')
assert salmon['ingredients']==[{'ingredientId':'salmon','grams':220}]
assert next(x for x in foods['ingredients'] if x['id']=='salmon')['weightBasis']=='raw'
for rec in soups['recipes']:
    assert rec['baseServings']==3 and rec['minServings']==1 and rec['maxServings']==4
    assert rec['broth']['waterAndConcentrateMustBeMeasuredSeparately']
    assert rec['broth']['boneBrothIsReadyToUse']
    all_rec_ing={x['id'] for x in rec['ingredients']}
    assert all_rec_ing<=ing,(rec['id'],all_rec_ing-ing)
    assert len(rec['steps'])>3
    appeared=set()
    for st in rec['steps']:
        assert isinstance(st['additions'],list)
        assert st['controls']['heatOff'] or st['controls']['temperatureCRange'] or st['controls']['speed']
        for ad in st['additions']:
            if ad['kind']=='ingredient':
                assert ad['ingredientId'] in ing
                assert ad['gramsForBaseServings']>0
                appeared.add(ad['ingredientId'])
            elif ad['kind']=='computed_broth':
                appeared.add('broth')
            elif ad['kind']=='coconut':
                assert rec['coconut']['fixed']
                appeared.add('coconut')
            elif ad['kind']=='selected_thai_legume':
                assert rec['id']=='thai'
                assert set(ad['variantIngredientIds'].values())<=ing
            else:raise AssertionError('Unexpected step add kind '+ad['kind'])
    assert 'broth' in appeared,rec['id']
    assert not rec['coconut']['fixed'] or 'coconut' in appeared,rec['id']
    if rec['id']=='calabaza':
        assert 'turmeric' not in all_rec_ing
        assert 'cumin' in all_rec_ing
    if rec['id']!='thai':
        assert all(x.get('condition') is None for x in rec['steps'])
fixed={r['id'] for r in soups['recipes'] if r['coconut']['fixed']}
assert fixed=={'thai','calabaza','boniato'},fixed
thai=next(x for x in soups['recipes'] if x['id']=='thai')
assert thai['options']['thaiLegume']['default']=='none'
assert sum(bool(x.get('condition')) for x in thai['steps'])==1
print('OK: valid seed links, 9 recipes, 4 scales supported, fixed coconut on 3 soups, conditional Thai legume, turmeric-free Calabaza, favorite raw salmon + leek/pea soup')
