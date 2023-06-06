import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', margin: '20px' }}>
      <input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        placeholder="Search..."
        style={{
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid grey',
          width: '50%',
        }}
      />
      <button type="submit" style={{ marginLeft: '10px', padding: '10px' }}>Search</button>
    </form>
  );
};

export default SearchBar;
