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
  style={{backgroundColor: 'white',textItems:'center','--background': 'white', color: 'black'}}
></IonSearchbar>

<div style={{display: 'flex'}}>
  <IonList style={{
      backgroundColor: '#0f2d96',
      minWidth: '70px',
      '--background': '#0f2d96',
      display: 'flex',
      flexDirection: 'column',
      width: "7.5vw",
      height: "100vh"}}>
    <IonButton onClick={() => setShowCoffee(!showCoffee)}
    className={showCoffee ? 'clicked' : ''}
    style={{
    backgroundColor: '#0f2d96',
    '--background': '#0f2d96',
    fontSize:"0.7em",
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    height: '10vh',
    alignItems: 'center',
    justifyContent: 'center',
    ...(showCoffee ? { '--background': '#0c2271','color':'#b9b9b9'  } : {})}}>
      <div>
        <img src={coffeeIcon} style={{ marginBottom: '10px' }}/>
        <div>Coffee</div>
      </div>
    </IonButton>
    <IonButton onClick={() => setShowWater(!showWater) } style={{
        backgroundColor: '#0f2d96',
        '--background': '#0f2d96',
        fontSize:"0.7em",
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '10vh',
        alignItems: 'center',
        justifyContent: 'center' ,
        ...(showWater ? { '--background': '#0c2271', 'color':'#b9b9b9' } : {})}}>
      <div>
        <img src={waterIcon} style={{ marginBottom: '10px' }}/>
        <div>Drinking Water</div>
      </div>
    </IonButton>
    <IonButton onClick={() => setShowBeverages(!showBeverages)} style={{
        backgroundColor: '#0f2d96',
        fontSize:"0.7em",
        '--background': '#0f2d96',
        color: 'white', display: 'flex',
        flexDirection: 'column',
        height: '10vh',
        alignItems: 'center',
        justifyContent: 'center' ,
        ...(showBeverages ? { '--background': '#0c2271', 'color':'#b9b9b9' } : {})}}>
      <div>
        <img src={beveragesIcon} style={{ marginBottom: '10px' }}/>
        <div>Beverages</div>
      </div>
    </IonButton>
    <IonButton onClick={() => setShowMicrowaves(!showMicrowaves)} style={{
        backgroundColor: '#0f2d96',
        '--background': '#0f2d96',
        fontSize:"0.7em",
        color: 'white', display: 'flex',
        flexDirection: 'column',
        height: '10vh',
        alignItems: 'center',
        justifyContent: 'center' ,
        ...(showMicrowaves ? { '--background': '#0c2271', 'color':'#b9b9b9' } : {})}}>
      <div>
        <img src={microwavesIcon} style={{ marginBottom: '10px' }}/>
        <div>Microwaves</div>
      </div>
    </IonButton>
      <IonButton style={{position: 'flex', '--background':'#0059D9', 'color':'white'}}
          onClick={() => setShowLabel(!showLabel)}>{showLabel ? "EN" : "HE"}</IonButton>
</IonList>

  {searchValue && (
    <IonList style={{backgroundColor: '#0f2d96', '--background': 'rgba(15, 45, 150, 0.5)', width: "100%", height: "15%"}}>
      {suggestions.map((suggestion, index) => (
        <IonItem
          style={{color: 'white', '--background': 'rgba(15, 45, 150,0.5)'}}
          key={index}
          onClick={() => handleSelect(suggestion)}
        >
          {suggestion.place_name}
        </IonItem>
      ))}
    </IonList>
  )}
</div>
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

    </ReactMapGL>
    </>
  );
}

export default MapComponent;
