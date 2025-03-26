import React, { useState } from 'react';
import './FormComponent.css';

function FormComponent({ formData, onSubmit, onCancel }) {
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    if (!formData || !formData.fields) return true;
    
    formData.fields.forEach(field => {
      if (field.required && (!formValues[field.name] || formValues[field.name].trim() === '')) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }
      
      // Add email validation
      if (field.type === 'email' && formValues[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formValues[field.name])) {
          newErrors[field.name] = 'Please enter a valid email address';
          isValid = false;
        }
      }
      
      // Add phone validation
      if (field.type === 'tel' && formValues[field.name]) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(formValues[field.name].replace(/\D/g, ''))) {
          newErrors[field.name] = 'Please enter a valid 10-digit phone number';
          isValid = false;
        }
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formValues);
    }
  };

  if (!formData || !formData.fields) {
    return null;
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        {formData.fields.map((field, index) => (
          <div key={index} className="form-field">
            <label htmlFor={field.name}>{field.label}{field.required && <span className="required">*</span>}</label>
            
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                value={formValues[field.name] || ''}
                onChange={handleChange}
                className={errors[field.name] ? 'error' : ''}
                rows={4}
              />
            ) : (
              <input
                type={field.type || 'text'}
                id={field.name}
                name={field.name}
                value={formValues[field.name] || ''}
                onChange={handleChange}
                className={errors[field.name] ? 'error' : ''}
              />
            )}
            
            {errors[field.name] && (
              <span className="error-message">{errors[field.name]}</span>
            )}
          </div>
        ))}
        
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button type="submit" className="submit-button">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormComponent;