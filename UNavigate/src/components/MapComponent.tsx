import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { GeolocateControl, NavigationControl, Source, Layer} from 'react-map-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { IonSearchbar, IonPopover, IonList, IonItem, IonListHeader, IonButton, IonIcon } from '@ionic/react';
import axios from 'axios';
import { lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteDetails from './RouteDetails';
import SearchBar from './SearchBar';
import mapboxgl from 'mapbox-gl';
import './GeocoderStyles.css';
import coffeeIcon from './../filter-icons/cafe.svg';
import waterIcon from './../filter-icons/drinking-water.svg';
import beveragesIcon from './../filter-icons/Beverages.svg';
import microwavesIcon from './../filter-icons/Microwave.svg';

const MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA'

const baseURL = 'http://localhost:3080';

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

interface Result {
  place_name: string;
  place_he_name: string;
  place_building: string;
  center: [number, number];
}

function MapComponent() {
  const [viewport, setViewport] = useState({
    longitude: 34.836179,
    latitude: 32.176097,
    maxBounds: [
      [34.83178, 32.17490],
      [34.84116, 32.17832]
      // [34.8345, 32.1750],
      // [34.8380, 32.1770],
      // [34.8345, 32.1770],
      // [34.8380, 32.1750]
    ],
    // zoom: 17,
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [destCoordinates, setDestCoordinates] = useState<DestCoordinates | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<Step[] | null>(null);
  const [destName, setDestName] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Result[]>([]);
  const [showCoffee, setShowCoffee] = useState(false);
  const [showWater, setShowWater] = useState(false);
  const [showBeverages, setShowBeverages] = useState(false);
  const [showMicrowaves, setShowMicrowaves] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  const geolocateControlStyle= {
    right: 10,
    top: 10
  };

  const mapRef = useRef<any>(null);

  //Need to be fixed- auto relocate to user location
  const geolocateControlRef = React.useCallback((ref:any) => {
    if (ref) {
      ref.trigger();
    }
  }, []);

  const localGeocoder = async function (query: string) {
    const formattedData = await axios.get(`${baseURL}/matches?query=${query}`);
    setSuggestions(formattedData.data);
  };

  const handleSelect = async (result: Result) => {
    setDestName(result.place_name);
    const [long, lat] = result.center;
    setDestCoordinates({dest_latitude: lat, dest_longtitude: long});
    setSuggestions([]);
  };

  useEffect(() => {
    if (searchValue !== null)
      localGeocoder(searchValue);
    if (route && searchValue === '')
      setRoute(null);
      setInstructions(null);
      setDuration(null);
  }, [searchValue]);

  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('coffee')) { 
            map1.setLayoutProperty('coffee', 'visibility', showCoffee ? 'visible' : 'none');
        }
    }
  }, [showCoffee]);

  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('microwave')) { 
            map1.setLayoutProperty('microwave', 'visibility', showMicrowaves ? 'visible' : 'none');
        }
    }
  }, [showMicrowaves]);

  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('drinking-water')) {
            map1.setLayoutProperty('drinking-water', 'visibility', showWater ? 'visible' : 'none');
        }
    }
  }, [showWater]);

  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('beverages')) {
            map1.setLayoutProperty('beverages', 'visibility', showBeverages ? 'visible' : 'none');
        }
    }
  }, [showBeverages]);

  useEffect(() => {
    if (mapRef.current) {
      const map1 = mapRef.current;
      if (map1.getLayer('building-labels')) {
        map1.setLayoutProperty('building-labels', 'text-field', showLabel ? ['get', 'name_he'] : ['get', 'name']);
      }
    }
  }, [showLabel]);

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
  }, [userLocation, destCoordinates]);

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
        const map = mapRef.current.getMap();
        mapRef.current = map;
      }}
    >
      <IonSearchbar
        placeholder="Search for a destination"
        onIonInput={(e: any) => {setSearchValue(e.detail.value)}}
        value={searchValue}
        onIonClear={() => { setSuggestions([]); setSearchValue(null); setDestName(null); setDestCoordinates(null); setRoute(null); setDuration(null); setInstructions(null); }}
        style={{backgroundColor: 'white', '--background': 'white', color: 'black'}}
      ></IonSearchbar>
      <IonList style={{backgroundColor: '#0f2d96', '--background': '#0f2d96'}}>
        <IonListHeader style={{backgroundColor: '#0f2d96', '--background': '#0f2d96'}}>
          <IonButton onClick={() => setShowCoffee(!showCoffee)} style={{ color: 'white' }}><img src={coffeeIcon} style={{ marginRight: '10px' }}/>Coffee</IonButton>
          <IonButton onClick={() => setShowWater(!showWater)} style={{ color: 'white' }}><img src={waterIcon} style={{ marginRight: '10px' }}/>Drinking Water</IonButton>
          <IonButton onClick={() => setShowBeverages(!showBeverages)} style={{ color: 'white' }}><img src={beveragesIcon} style={{ marginRight: '10px' }}/>Beverages</IonButton>
          <IonButton onClick={() => setShowMicrowaves(!showMicrowaves)} style={{ color: 'white' }}><img src={microwavesIcon} style={{ marginRight: '10px' }}/>Microwaves</IonButton>
        </IonListHeader>
        {suggestions.map((suggestion, index) => (
          <IonItem
            style={{'--background': 'rgba(15, 45, 150, 0.5)', backgroundColor: 'rgba(15, 45, 150, 0.5)'}}
            key={index}
            onClick={() => handleSelect(suggestion)}
          >
            {suggestion.place_name}
          </IonItem>
        ))}
      </IonList>
      <GeolocateControl
        ref={geolocateControlRef}
        position="bottom-right"
        style={geolocateControlStyle}
        positionOptions={{enableHighAccuracy: true}}
        trackUserLocation={true}
        showUserLocation={true}
        showUserHeading={true}
        showAccuracyCircle={true}
        onGeolocate={(pos : any) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({latitude, longitude});
        }}
        onOutOfMaxBounds={() => {
          alert("Seems like you're out of campus!");
        }}
      />
      <NavigationControl position="bottom-right"/>
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
      ) }
      {route && (
        <RouteDetails duration={duration} instructions={instructions} destName={destName}/>) }
      <IonButton style={{position: 'absolute', bottom: '25px', left: '0', width: '2.5%',
          height: '4%', marginLeft: '10px', '--background':'white', 'color':'black'}} 
          onClick={() => setShowLabel(!showLabel)}>{showLabel ? "EN" : "HE"}</IonButton>
    </ReactMapGL>
    </>
  );
}

export default MapComponent;
