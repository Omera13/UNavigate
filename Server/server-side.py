from fastapi import FastAPI, Response
import requests
from whoosh.fields import Schema, TEXT, ID, STORED
from whoosh import index
from whoosh.qparser import QueryParser, OrGroup
import os

app = FastAPI()

MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA'

# Create the schema for the index
BUILDINGS_SCHEMA = Schema(
        place_name=TEXT(stored=True),
        place_he_name=TEXT(stored=True),
        place_building=TEXT(stored=True),
        center=STORED)
# Create the index dir if it doesn't exist
if not os.path.exists("./BuildingsIndexDir"):
    os.mkdir("./BuildingsIndexDir")
# Create the index
BUILDINGS_IDX = index.create_in("./BuildingsIndexDir", BUILDINGS_SCHEMA)

# Create the database for the using our custom map data from mapbox
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

# Search within the database for results mathces the query and return them
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

# Get the directions from the mapbox api
@app.get('/directions')
async def get_directions(origin_latitude: str, origin_longitude: str, dest_latitude: str, dest_longitude: str, search_value, language, response: Response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response = requests.get(f'https://api.mapbox.com/directions/v5/mapbox/walking/{origin_longitude},{origin_latitude};{dest_longitude},{dest_latitude}?steps=true&geometries=geojson&access_token={MY_TOKEN}&language={language}').json()
    return response

# Run the server
if __name__ == "__main__":
    import uvicorn
    create_buildings()
    uvicorn.run(app, host="localhost", port=3080)