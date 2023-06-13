import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { GeolocateControl, NavigationControl, Source, Layer} from 'react-map-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { IonSearchbar } from '@ionic/react';
import axios from 'axios';
import { lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteDetails from './RouteDetails';
import SearchBar from './SearchBar';
import mapboxgl from 'mapbox-gl';
import './GeocoderStyles.css';

const MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA'

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface DestCoordinates {
  dest_latitude: number;
  dest_longtitude: number;
}

interface Step {
  instruction: string;
  coordinates: [number, number];
}

// Define your Result type (modify this according to your actual result structure)
interface Result {
  place_name: string;
  place_he_name: string;
  center: [number, number];
}

// Define the structure of Feature returned from your API (modify this according to actual API response)
interface Feature {
  properties: {
    name: string;
    name_he: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

// Define the structure of the API response (modify this according to actual API response)
interface ApiResponse {
  features: Feature[];
}

function MapComponent() {
  let [viewport, setViewport] = useState({
    longitude: 34.83774,
    latitude: 32.17615,
    zoom: 17
  });

  let [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  let [destination, setDestination] = useState<string | null>(null);
  let [destCoordinates, setDestCoordinates] = useState<DestCoordinates | null>(null);
  let [route, setRoute] = useState<any>(null);
  let [duration, setDuration] = useState<number | null>(null);
  let [instructions, setInstructions] = useState<Step[] | null>(null);

  const geolocateControlStyle= {
    right: 10,
    top: 10
  };

  const mapRef = useRef<any>(null);


  const externalGeocoder1 = async function(query : string) {
    const url = `https://api.mapbox.com/datasets/v1/unavigate/cliebrq8v1xck2no5fwlyphfa/features?access_token=pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA`;
    const response = await axios.get(url);
    const formattedData = response.data.features.filter((feature: Feature) => feature.properties.name === query || feature.properties.name_he === query)
      .map((feature: Feature) => {
      return {
        place_name: feature.properties.name,
        place_he_name: feature.properties.name_he,
        center: feature.geometry.coordinates
      };
    });
    console.log(formattedData);
    return formattedData;
  };

  useEffect(() => {
    if (userLocation && destCoordinates) {
      const { latitude, longitude } = userLocation;
      const { dest_latitude, dest_longtitude } = destCoordinates;
      const fetchRoute = async () => {
        const response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/walking/${longitude},${latitude};${dest_longtitude},${dest_latitude}?steps=true&geometries=geojson&access_token=${MY_TOKEN}`);
        const { coordinates } = response.data.routes[0].geometry;
        const geojson = lineString(coordinates);
        setRoute(geojson);
        const routeDuration = Math.round(response.data.routes[0].duration / 60);
        setDuration(routeDuration);
        const routeSteps = response.data.routes[0].legs[0].steps.map((step: any) => {
          const { instruction } = step.maneuver;
          const { coordinates } = step.geometry;
          return { instruction, coordinates };
        });
        setInstructions(routeSteps);
      };
      
      fetchRoute();
    }
  }, [userLocation, destination, destCoordinates]);

  return (
    <>
    <ReactMapGL
      {...viewport}
      ref={mapRef}
      style={{width: '100%', height: '100%'}}
      mapboxAccessToken={MY_TOKEN}
      mapStyle="mapbox://styles/unavigate/clibi878i02we01premvo8o3d"
      onMove={(evt : any) => setViewport(evt.viewState)}
      onLoad={() => {
        const geocoder = new MapboxGeocoder({
          accessToken: MY_TOKEN,
          mapboxgl: mapboxgl,
          marker: false,
          externalGeocoder: externalGeocoder1,
          placeholder: 'Search for a destination'
        });
        const map = mapRef.current.getMap();
        map.addControl(geocoder, 'top-left');
        
        geocoder.on('result', function(e) {
          const [long, lat] = e.result.center;
          setDestCoordinates({dest_latitude: lat, dest_longtitude: long});
        });
    
        mapRef.current = map; 
      }}
    >
      <NavigationControl/>
      <GeolocateControl
        style={geolocateControlStyle}
        positionOptions={{enableHighAccuracy: true}}
        trackUserLocation={true}
        showUserLocation={true}
        showUserHeading={true}
        onGeolocate={(pos : any) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({latitude, longitude});
        }}
      />
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route"
            type="line"
            source="route"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#888", "line-width": 8 }}
          />
        </Source>
      )}
      <RouteDetails duration={duration} instructions={instructions} />
    </ReactMapGL>
    </>
  );
}

export default MapComponent;
