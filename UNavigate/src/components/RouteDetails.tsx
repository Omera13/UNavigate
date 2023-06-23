import React from 'react';

interface RouteDetailsProps {
  duration: number | null;
  instructions: { instruction: string }[] | null;
  destName: string | null;
}

const RouteDetails: React.FC<RouteDetailsProps> = ({ duration, instructions, destName }) => {
  return (
    <div style={{ color: 'black', position: 'absolute', top: '7em', right: 0, margin: '4em', padding: '1em', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '0.5em' }}>
      <h3>Route to {destName}</h3>
      {duration && <p>Estimated travel time: {duration} minutes</p>}
      {instructions && (
        <ol>
          {instructions.map(({ instruction }, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default RouteDetails;
