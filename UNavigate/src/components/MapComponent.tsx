import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { GeolocateControl, NavigationControl, Source, Layer} from 'react-map-gl';
import FlyToInterpolator  from 'react-map-gl';
import { IonSearchbar, IonPopover, IonList, IonLabel, IonItem, IonListHeader, IonButton, IonIcon } from '@ionic/react';
import axios from 'axios';
import { lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteDetails from './RouteDetails';
import './GeocoderStyles.css';
import coffeeIcon from './../filter-icons/cafe.svg';
import waterIcon from './../filter-icons/drinking-water.svg';
import beveragesIcon from './../filter-icons/Beverages.svg';
import microwavesIcon from './../filter-icons/Microwave.svg';

const MY_TOKEN = 'pk.eyJ1IjoidW5hdmlnYXRlIiwiYSI6ImNsaWJoc2l1ODBkbHEzZW11emw0cGZucTAifQ.otIbJBL8CWmaA9dGYNkZHA';

const baseURL = 'http://localhost:3080';

interface UserLocation {latitude: number; longitude: number;}

interface DestCoordinates {dest_latitude: number; dest_longitude: number;}

interface Step {instruction: string;coordinates: [number, number];}

interface Result {place_name: string; place_he_name: string; place_building: string; center: [number, number];}

// Initial state of the map
function MapComponent() {
  const [viewport, setViewport] = useState({
    longitude: 34.836179,
    latitude: 32.176097,
    maxBounds: [
      [34.83025, 32.17354],
      [34.84216, 32.17950]
    ],
    zoom: 16,
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null); // Origin coordinates
  const [destCoordinates, setDestCoordinates] = useState<DestCoordinates | null>(null); // Destination coordinates
  const [route, setRoute] = useState<any>(null); // Route from origin to destination
  const [duration, setDuration] = useState<number | null>(null); // Route duration in minutes
  const [instructions, setInstructions] = useState<Step[] | null>(null); // Route instructions
  const [destName, setDestName] = useState<string | null>(null); // Destination name
  const [searchValue, setSearchValue] = useState<string | null>(null);  // Destination searched value
  const [searchValueOrigin, setSearchValueOrigin] = useState<string | null>(null); // Origin searcheded value
  const [originName, setOriginName] = useState<string | null>(null); // Origin name
  const [suggestionsOrigin, setSuggestionsOrigin] = useState<Result[]>([]); // Origin dropdown list suggestions
  const [suggestions, setSuggestions] = useState<Result[]>([]); // Destination dropdown list suggestions
  const [showCoffee, setShowCoffee] = useState(false); // Flag to show coffee layer
  const [showWater, setShowWater] = useState(false); // Flag to show water layer
  const [showBeverages, setShowBeverages] = useState(false); // Flag to show beverages layer
  const [showMicrowaves, setShowMicrowaves] = useState(false); // Flag to show microwaves layer
  const [showLabel, setShowLabel] = useState(false); // Flag to show building labels in Hebrew or English
  const [language, setLanguage] = useState('en'); // Set default language to English

  const geolocateControlStyle= {right: 10, top: 10}; // Geolocate control position

  const mapRef = useRef<any>(null); // Map reference

  const geolocateControlRef = useRef<any>(null); // Geolocate control reference

  // Geocoder function, returns matched suggestions for the dropdown list
  const localGeocoder = async function (query: string, type: 'origin' | 'destination') {
    const formattedData = await axios.get(`${baseURL}/matches?query=${query}`);
    if (type === 'origin'){
      setSuggestionsOrigin(formattedData.data);
    }
    else {
      setSuggestions(formattedData.data);
    }
  };

  // Handle selected suggestion from destination dropdown list
  const handleSelect = async (result: Result) => {
    setDestName(result.place_name);
    const [long, lat] = result.center;
    setDestCoordinates({dest_latitude: lat, dest_longitude: long});
    setSuggestions([]);
    setSearchValue(result.place_name);
  };

  // Handle selected suggestion from origin dropdown list
  const handleSelect2 = async (result: Result) => {
    setOriginName(result.place_name);
    const [long, lat] = result.center;
    setUserLocation({latitude: lat, longitude: long});
    setSuggestionsOrigin([]);
    setSearchValueOrigin(result.place_name);
  };

  // Toggle language between English and Hebrew
  const changeLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en');
  };

  // Renders the suggestions for the dropdown list based on the entered value and the specific field
  // Calls the handleSelect or handleSelect2 function when a suggestion is clicked
  const renderSuggestions = (suggestions : Result[], handleClick : (result: Result) => void, type: 'Origin' | 'Destination') => (
    <IonList style={{ backgroundColor: '#0f2d96', '--background': 'rgba(15, 45, 150, 0.5)', width: '100%', height: '15%' }}>
      <IonListHeader style={{color: 'rgba(15, 45, 150, 1)', backgroundColor: 'white'}}>
        <IonLabel style={{'font-weight': '800'}}>{type}</IonLabel>
      </IonListHeader>
      {suggestions.map((suggestion, index) => (
        <IonItem
          style={{ color: 'white', '--background': 'rgba(15, 45, 150,0.5)' }}
          key={index}
          onClick={() => handleClick(suggestion)}
        >
          {suggestion.place_name}
        </IonItem>
      ))}
    </IonList>
  );

  // handle a change in the destination search bar
  useEffect(() => {
    if (searchValue !== null)
      localGeocoder(searchValue, 'destination');
    if (route && searchValue === '')
      setRoute(null);
      setInstructions(null);
      setDuration(null);
  }, [searchValue]);

  // handle a change in the origin search bar
  useEffect(() => {
    if (searchValueOrigin !== null)
      localGeocoder(searchValueOrigin, 'origin');
  }, [searchValueOrigin]);

  // handle a show coffee layer change
  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('coffee')) {
            map1.setLayoutProperty('coffee', 'visibility', showCoffee ? 'visible' : 'none');
        }
    }
  }, [showCoffee]);

  // handle a show microwaves layer change
  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('microwave')) {
            map1.setLayoutProperty('microwave', 'visibility', showMicrowaves ? 'visible' : 'none');
        }
    }
  }, [showMicrowaves]);

  // handle a show water layer change
  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('drinking-water')) {
            map1.setLayoutProperty('drinking-water', 'visibility', showWater ? 'visible' : 'none');
        }
    }
  }, [showWater]);

  // handle a show beverages layer change
  useEffect(() => {
    if (mapRef.current) {
        const map1 = mapRef.current;
        if (map1.getLayer('beverages')) {
            map1.setLayoutProperty('beverages', 'visibility', showBeverages ? 'visible' : 'none');
        }
    }
  }, [showBeverages]);

  // handle a show building labels change
  useEffect(() => {
    if (mapRef.current) {
      const map1 = mapRef.current;
      if (map1.getLayer('building-labels')) {
        map1.setLayoutProperty('building-labels', 'text-field', showLabel ? ['get', 'name_he'] : ['get', 'name']);
      }
    }
  }, [showLabel]);

  // handle a change in the route
  useEffect(() => {
    if (route && userLocation) {
      setViewport(prevState => ({
        ...prevState,
        zoom: 18,
        transitionDuration: 2000,
        transitionInterpolator: FlyToInterpolator,
        }));
    }
  }, [route]);

  // handle a change in user location, destination coordinates and language
  useEffect(() => {
    if (userLocation && destCoordinates) {
      const { latitude, longitude } = userLocation;
      const { dest_latitude, dest_longitude } = destCoordinates;
      const fetchRoute = async () => {
        const response = await axios.get(`${baseURL}/directions?origin_latitude=${latitude}&origin_longitude=${longitude}&dest_latitude=${dest_latitude}&dest_longitude=${dest_longitude}&search_value=${searchValue}&language=${language}`);
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
  }, [userLocation, destCoordinates, language]);

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
      maxBounds={[[0, 0], [0, 0]]}
    >
      <IonSearchbar
        placeholder= "Enter origin (Click the location icon for live location)"
        onIonInput={(e: any) => {setSearchValueOrigin(e.detail.value)}}
        value={searchValueOrigin}
        onIonClear={() => { setSuggestionsOrigin([]); setSearchValueOrigin(null); setOriginName(null); setUserLocation(null); }}
        style={{backgroundColor: 'white',textItems:'center','--background': 'white', color: 'black'}}
      ></IonSearchbar>
      <IonSearchbar
        placeholder="Enter destination"
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
                onClick={() => {
                      setShowLabel(!showLabel);
                      changeLanguage();
                  }}
                  >
                  {showLabel ? "EN" : "HE"}
            </IonButton>
        </IonList>
        {(searchValueOrigin && searchValueOrigin !== originName && searchValueOrigin !== 'My Location') && (renderSuggestions(suggestionsOrigin, handleSelect2, 'Origin'))}
        {(searchValue && searchValue !== destName) && (renderSuggestions(suggestions, handleSelect, 'Destination'))}
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
          setViewport(prevState => ({
            ...prevState,
            latitude,
            longitude,
            zoom: 17,
          }));
        }}
        onTrackUserLocationStart={(pos : any) => {
          setSearchValueOrigin('My Location');
        }}
        onTrackUserLocationEnd={(pos : any) => {
          setSearchValueOrigin(null);
        }}
        onOutOfMaxBounds={() => {
          alert("Seems like you're out of campus!");
          geolocateControlRef.current.trigger();
        }}
      />
      <IonButton onClick={changeLanguage}>Change Language</IonButton>
      <NavigationControl position="bottom-right"/>
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route"
            type="line"
            source="route"
            layout={{ "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#7353ff", "line-width": 8 }}
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
