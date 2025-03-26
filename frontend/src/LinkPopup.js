import React from 'react';

const LinkPopup = ({ link, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20%',
      left: '30%',
      width: '40%',
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      <h3>Link Information</h3>
      <p>
        Loading information from: <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
      </p>
      {/* You can fetch and display additional details here */}
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default LinkPopup;
