import React, { useState, useRef } from 'react';
import ChatWindow from './ChatWindow';
import ChatForm from './ChatForm';
import LinkPopup from './LinkPopup';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [popupLink, setPopupLink] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]); // Add state for suggestions
  const chatWindowRef = useRef(null);


  // Send the user's message to the backend and update messages
  const handleSend = async (text) => {
    const userMessage = { sender: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setSuggestions([]); // Clear suggestions when sending new message


    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          chat_history: messages 
        })
      });
      
      const data = await response.json();
      
      if (data.message) {
        const botMessage = { 
          sender: 'bot', 
          text: data.message,
          form: data.form, // Include form data if present
          action_button: data.action_button // Include action button if present
        };
        setMessages((prev) => [...prev, botMessage]);
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } else if (data.error) {
        setMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${data.error}` }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionButtonClick = (action) => {
    // This is a stub - in a real app, this would navigate to different parts of the portal
    alert(`You would be redirected to: ${action}`);
    
    // Add a confirmation message to the chat
    setMessages((prev) => [
      ...prev, 
      { 
        sender: 'bot', 
        text: `I'm redirecting you to the ${action} section. Please wait...` 
      }
    ]);
  };

  // Handle form submission
  const handleFormSubmit = async (formData, context) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/submit_form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: formData,
          context: context
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages((prev) => [
          ...prev, 
          { 
            sender: 'bot', 
            text: 'Thank you for submitting the form. Your information has been saved.' 
          }
        ]);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev, 
        { 
          sender: 'bot', 
          text: `Sorry, there was an error submitting the form: ${error.message}` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkClick = (link) => {
    setPopupLink(link);
  };

  const closePopup = () => {
    setPopupLink(null);
  };

  // Reset chat function
  const resetChat = () => {
    setMessages([]);
    setIsLoading(false);
    setSuggestions([]); // Clear suggestions when resetting chat

    // Close any open popups
    setPopupLink(null);
    // Reset the form in ChatWindow
    if (chatWindowRef.current) {
      chatWindowRef.current.resetForm();
    }
  };

  return (
    <div className="app-container">
      <div className="chat-container">
      <header className="app-header">
        <div className="title-section">
          <h1>Healthcare Assistant</h1>
          <p className="app-subtitle">Ask questions about your healthcare and billing</p>
        </div>
        <button 
          className="reset-button" 
          onClick={resetChat}
          title="Reset Chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3019 3 18.1885 4.77814 19.7545 7.42909" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M21 3V9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>
        <div className="chat-content">
          <ChatWindow 
            ref={chatWindowRef}
            messages={messages} 
            onLinkClick={handleLinkClick} 
            onFormSubmit={handleFormSubmit} 
            onActionButtonClick={handleActionButtonClick} 
          />
          {/* Display suggestion buttons if available */}
          {suggestions.length > 0 && (
            <div className="suggestion-container">
              {suggestions.map((suggestion, index) => (
                <button 
                  key={index} 
                  className="suggestion-button"
                  onClick={() => handleSend(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <ChatForm onSend={handleSend} disabled={isLoading} />
          {isLoading && (
            <div className="loading-indicator">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          )}
        </div>
      </div>
      {popupLink && <LinkPopup link={popupLink} onClose={closePopup} />}
    </div>
  );
}

export default App;