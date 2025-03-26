import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import FormComponent from './FormComponent';
import './ChatWindow.css';

const renderFormattedText = (text) => {
  // Replace **text** or __text__ with <strong>text</strong>
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
};

const WelcomeMessage = () => {
  return (
    <div className="welcome-message">
      <div className="welcome-icon">👋</div>
      <h2>Good Afternoon, Sam!</h2>
      <p>I'm here to help you with your healthcare questions and needs.</p>
      <p>You can ask me about:</p>
      <ul>
        <li>Your medical bills and insurance</li>
        <li>Appointment scheduling</li>
        <li>Medical records access</li>
        <li>General healthcare information</li>
      </ul>
    </div>
  );
};

const ChatWindow = forwardRef(({ messages, onLinkClick, onFormSubmit, onActionButtonClick }, ref) => {
    const messagesEndRef = useRef(null);
    const [activeForm, setActiveForm] = useState(null);

    useImperativeHandle(ref, () => ({
        resetForm: () => {
          setActiveForm(null);
        }
      }));

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const renderMessageContent = (message) => {

    const hasForm = message.sender === 'bot' && message.form && !activeForm;

    // Check if this message has an action button
    const hasActionButton = message.action_button && 
                           message.action_button.text && 
                           message.action_button.action;
    
    return (
      <div>
        <div className="message-content">
          {renderFormattedText(message.text)}
        </div>

        {hasForm && (
          <button 
            className="form-toggle-button"
            onClick={() => setActiveForm({ formData: message.form, messageIndex: messages.indexOf(message) })}
          >
            Open Form
          </button>
        )}
        
        {hasActionButton && (
          <div className="action-button-container">
            <button 
              className="action-button"
              onClick={() => onActionButtonClick(message.action_button.action)}
            >
              {message.action_button.text}
            </button>
          </div>
        )}
      </div>
    );
  };
  // Function to detect and make links clickable
  const renderMessageText = (text) => {
    // Simple URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    
    // Split the text by URLs and map each part
    const parts = text.split(urlPattern);
    const matches = text.match(urlPattern) || [];
    
    return parts.map((part, index) => {
      // If this part matches a URL, render it as a link
      if (matches.includes(part)) {
        return (
          <span 
            key={index} 
            className="message-link"
            onClick={() => onLinkClick(part)}
          >
            {part}
          </span>
        );
      }
      // Otherwise, render as regular text
      return <span key={index}>{part}</span>;
    });
  };

  const handleFormSubmit = (formValues) => {
    onFormSubmit(formValues, activeForm.context);
    setActiveForm(null);
  };

  const handleFormCancel = () => {
    setActiveForm(null);
  };

  // Check the last bot message for a form
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'bot' && lastMessage.form) {
        setActiveForm({
          formData: lastMessage.form,
          messageIndex: messages.length - 1
        });
      }
    }
  }, [messages]);

  return (
    <div className="chat-window">
      {messages.length === 0 ? (
        <WelcomeMessage />
      ) : (
        messages.map((message, index) => (
          <div key={index} className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
            {renderMessageContent(message)}
          </div>
        ))
      )}
      
      {activeForm && (
        <FormComponent
          formData={activeForm.formData}
          onSubmit={(formData) => {
            onFormSubmit(formData, messages[activeForm.messageIndex].text);
            setActiveForm(null);
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});

export default ChatWindow;