from fastapi import FastAPI, Response
import requests
from whoosh.fields import Schema, TEXT, ID, STORED
from whoosh import index
from whoosh.qparser import QueryParser, OrGroup
import os

app = FastAPI()

MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA'

BUILDINGS_SCHEMA = Schema(
        place_name=TEXT(stored=True),
        place_he_name=TEXT(stored=True),
        place_building=TEXT(stored=True),
        center=STORED)
if not os.path.exists("./Server/BuildingsIndexDir"):
    os.mkdir("./Server/BuildingsIndexDir")
BUILDINGS_IDX = index.create_in("./Server/BuildingsIndexDir", BUILDINGS_SCHEMA)

def create_buildings():
    buildings = requests.get(f'https://api.mapbox.com/datasets/v1/unavigate/cliebrq8v1xck2no5fwlyphfa/features?access_token={MY_TOKEN}').json()
    writer = BUILDINGS_IDX.writer()
    for feature in buildings['features']:
        writer.add_document(
            place_name=feature['properties']['name'],
            place_he_name=feature['properties']['name_he'],
            place_building=feature['properties'].get('building', None),
            center=feature['geometry']['coordinates'])
    writer.commit()

# COFFEE_SHOPS = requests.get(f'https://api.mapbox.com/datasets/v1/unavigate/clikg7dyp002m2oo54epszo5s/features?access_token={MY_TOKEN}').json()

# DRINKING_WATER = requests.get(f'https://api.mapbox.com/datasets/v1/unavigate/clj1hkgew0wpc2nobjcsdpp2f/features?access_token={MY_TOKEN}').json()

# BEVERAGES = requests.get(f'https://api.mapbox.com/datasets/v1/unavigate/clj1jm99q0x3l2hobezuu6whb/features?access_token={MY_TOKEN}').json()

# MICROWAVES = requests.get('https://api.mapbox.com/datasets/v1/unavigate/clj1oov9211es2bl4rqmvdvzl/features?access_token={MY_TOKEN}').json()

# @app.get('/all_water')
# async def get_all_water(response: Response):
#     response.headers['Access-Control-Allow-Origin'] = '*'
#     return DRINKING_WATER

@app.get('/matches')
async def get_matches(query: str, response: Response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    if len(query) < 1:
        return []
    parser = QueryParser("place_name", schema=BUILDINGS_SCHEMA, group=OrGroup)
    starts_with_query = parser.parse(f"{query}* OR place_he_name:{query}* OR place_building:{query}*")
    buildings_query_2_letter = parser.parse(f"place_building:{query[:2]}*")
    buildings_query_1_letter = parser.parse(f"place_building:{query[:1]}*")
    fuzzy_query = parser.parse(f"{query}~3 OR place_he_name:{query}~3 OR place_building:{query}~3")
    combined_query = starts_with_query | fuzzy_query | buildings_query_2_letter | buildings_query_1_letter
    with BUILDINGS_IDX.searcher() as searcher:
        results = searcher.search(combined_query)
        filtered_data = [
            {
                "place_name": hit['place_name'],
                "place_he_name": hit['place_he_name'],
                "place_building": hit.get('place_building', None),
                "center": hit['center'],
            }
            for hit in results]
        return filtered_data


if __name__ == "__main__":
    import uvicorn
    create_buildings()
    uvicorn.run(app, host="localhost", port=3080)