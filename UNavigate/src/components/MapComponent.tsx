import React, { useState, useEffect } from 'react';
import ReactMapGL, { GeolocateControl, NavigationControl, Source, Layer } from 'react-map-gl';
import { IonSearchbar } from '@ionic/react';
import axios from 'axios';
import { lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteDetails from './RouteDetails';
import SearchBar from './SearchBar';

const MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA'

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface Step {
  instruction: string;
  coordinates: [number, number];
}

function MapComponent() {
  let [viewport, setViewport] = useState({
    longitude: 34.83774,
    latitude: 32.17615,
    zoom: 16
  });

  let [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  let [destination, setDestination] = useState<string | null>(null);
  let [route, setRoute] = useState<any>(null);
  let [duration, setDuration] = useState<number | null>(null);
  let [instructions, setInstructions] = useState<Step[] | null>(null);

  const geolocateControlStyle= {
    right: 10,
    top: 10
  };

  useEffect(() => {
    if (userLocation && destination) {
      const { latitude, longitude } = userLocation;
      const fetchRoute = async () => {
        let destinationCoordinates = [34.835518, 32.177265];
        if (destination === 'Psychology' || destination === "Economics") {
          destinationCoordinates = [34.835513, 32.175152];
        }
        else if (destination === 'משפטים' || destination === 'Law') {
          destinationCoordinates = [34.834865, 32.175237];
        }
        // const geoResponse = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${destination}.json?access_token=${MY_TOKEN}`);
        // if (geoResponse.data.features.length === 0) {
        //   console.error('No coordinates found for this location');
        //   return;
        // }
        // const destinationCoordinates = geoResponse.data.features[0].center;
        const response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/walking/${longitude},${latitude};${destinationCoordinates[0]},${destinationCoordinates[1]}?steps=true&geometries=geojson&access_token=${MY_TOKEN}`);
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
  }, [userLocation]);

  return (
    <>
    <SearchBar onSearch={setDestination}></SearchBar>
    <ReactMapGL
      {...viewport}
      style={{width: '100%', height: '100%'}}
      mapboxAccessToken={MY_TOKEN}
      mapStyle="mapbox://styles/unavigate/clibi878i02we01premvo8o3d"
      onMove={evt => setViewport(evt.viewState)}
    >
      {/* <IonSearchbar onIonChange={e => setDestination(e.target.value || '')}></IonSearchbar> */}
      {/* <IonSearchbar><input type="text" onChange={e => setDestination(e.target.value || '')} /></IonSearchbar> */}
      <NavigationControl/>
      <GeolocateControl
        style={geolocateControlStyle}
        positionOptions={{enableHighAccuracy: true}}
        trackUserLocation={true}
        showUserLocation={true}
        showUserHeading={true}
        onGeolocate={pos => {
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
