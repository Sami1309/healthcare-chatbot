from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
import json
import datetime
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow requests from your React app

# Initialize OpenAI client with API key from environment variables
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Path to patient data directory
PATIENT_DATA_DIR = Path("./patient_data")

# Load patient index
def load_patient_index():
    try:
        with open(PATIENT_DATA_DIR / "index.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.route("/api/check_relevance", methods=["POST"])
def check_relevance():
    data = request.get_json()
    user_message = data.get("message", "")
    patient_index = load_patient_index()
    
    # If no patient data, return empty result
    if not patient_index:
        return jsonify({"relevant_file": None})
    
    try:
        # Create a prompt to check which patient file is relevant
        index_content = "\n".join(patient_index)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a healthcare data retrieval system. Your task is to determine if the user's question is relevant to any of the patient files listed below. If relevant, return ONLY the filename. If not relevant to any specific file, return 'None'."},
                {"role": "user", "content": f"Patient files:\n{index_content}\n\nUser question: {user_message}\n\nRelevant file (just the filename or 'None'):"}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        relevant_file = response.choices[0].message.content.strip()
        print("relevant file is", relevant_file)
        # Clean up response in case the model adds explanations
        if relevant_file.lower() == "none" or "none" in relevant_file.lower():
            relevant_file = None
        elif "/" in relevant_file or "\\" in relevant_file:
            # Extract just the filename if path is returned
            relevant_file = os.path.basename(relevant_file)
            
        return jsonify({"relevant_file": relevant_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    print("Starting chat")
    data = request.get_json()
    user_message = data.get("message", "")
    chat_history = data.get("chat_history", [])
    
    # First check if the message is relevant to any patient file
    patient_index = load_patient_index()
    context_content = ""
    relevant_file = None
    
    if patient_index:
        try:
            # Create a prompt to check which patient file is relevant
            index_content = "\n".join(patient_index)
            relevance_response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a healthcare data retrieval system. Your task is to determine if the user's question is relevant to any of the patient files listed below. If relevant, return ONLY the filename. If not relevant to any specific file, return 'None'."},
                    {"role": "user", "content": f"Patient files:\n{index_content}\n\nUser question: {user_message}\n\nRelevant file (just the filename or 'None'):"}
                ],
                max_tokens=50,
                temperature=0.1
            )
            
            relevant_file = relevance_response.choices[0].message.content.strip()
            # Clean up response in case the model adds explanations
            if relevant_file.lower() == "none" or "none" in relevant_file.lower():
                relevant_file = None
            elif "/" in relevant_file or "\\" in relevant_file:
                # Extract just the filename if path is returned
                relevant_file = os.path.basename(relevant_file)
                
            # Load context from file if relevant
            if relevant_file:
                try:
                    with open(PATIENT_DATA_DIR / relevant_file, "r") as f:
                        context_content = f.read()
                except FileNotFoundError:
                    pass
        except Exception as e:
            print(f"Error checking relevance: {str(e)}")
    
    try:
        # Prepare messages for the API call
        messages = [
            {"role": "system", "content": "You are a helpful healthcare assistant. Provide accurate and helpful information about healthcare topics. Use **bold text** for important information. When citing information collected from the patient's files, write them naturally, do not just copy the data down. Be sure to be empathetic, understanding, and considerate to all the user's concerns. Be concise and clear. If you need to collect information from the user (like address information, payment, etc), include '[FORM_REQUIRED]' at the beginning of your response followed by a JSON specification of the form fields you need in this format: {\"fields\": [{\"name\": \"field_name\", \"label\": \"Field Label\", \"type\": \"text|email|tel|textarea\", \"required\": true|false}]}. Then continue with your normal response text. When describing a form or a button, specify that it is below, not above. Make sure the form fields are specific (i.e. for addresses, have a field for street, city, zip, etc) If the user is asking about accessing another part of the healthcare portal (like bill payment, appointments, medical records, etc.), include '[ACTION_BUTTON]' in your response followed by a JSON object in this format: {\"text\": \"Button Text\", \"action\": \"action_name\"}. Additionally, after your main response, include '[SUGGESTIONS]' followed by 1 to 2 follow-up questions the user might want to ask next, each on its own line. These should be complete questions that are relevant to the current topic and conversation. They should be as short as possible"}
        ]
        
        # Add context if available
        if context_content:
            messages.append({"role": "system", "content": f"Here is relevant patient information to consider when answering:\n{context_content}"})
        
        # Add chat history
        for msg in chat_history:
            role = "assistant" if msg.get("sender") == "bot" else "user"
            messages.append({"role": role, "content": msg.get("text", "")})
        
        # Add current user message if not already in history
        if not chat_history or chat_history[-1].get("sender") != "user" or chat_history[-1].get("text") != user_message:
            messages.append({"role": "user", "content": user_message})
        
        # Use the ChatCompletion API with GPT-4o
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500  # Increased to accommodate form specifications
        )
        bot_message = response.choices[0].message.content.strip()

        # Check if response contains form specification
        form_data = None
        action_button = None
        suggestions = []
        if bot_message.startswith('[FORM_REQUIRED]'):
            # Extract form specification
            try:
                # Remove the [FORM_REQUIRED] prefix
                cleaned_message = bot_message.replace('[FORM_REQUIRED]', '').strip()
                
                # Find the JSON object (it might contain nested braces)
                form_start = cleaned_message.find('{')
                
                # Track opening and closing braces to handle nested JSON
                open_braces = 0
                form_end = form_start
                
                for i in range(form_start, len(cleaned_message)):
                    if cleaned_message[i] == '{':
                        open_braces += 1
                    elif cleaned_message[i] == '}':
                        open_braces -= 1
                        if open_braces == 0:
                            form_end = i + 1
                            break
                
                # Extract the JSON string and parse it
                form_json = cleaned_message[form_start:form_end]
                form_data = json.loads(form_json)
                
                # Remove the form specification from the message
                bot_message = cleaned_message[form_end:].strip()
            except (ValueError, json.JSONDecodeError) as e:
                print(f"Error parsing form data: {str(e)}")
        
        # Include information about which file was used (for debugging or UI purposes)

        if '[SUGGESTIONS]' in bot_message:
            parts = bot_message.split('[SUGGESTIONS]')
            bot_message = parts[0].strip()
            
            if len(parts) > 1:
                suggestion_text = parts[1].strip()
                suggestions = [s.strip() for s in suggestion_text.split('\n') if s.strip()]
                # Limit to 3 suggestions
                suggestions = suggestions[:3]
        
        
        if '[ACTION_BUTTON]' in bot_message:
            try:
                # Split by action button marker
                parts = bot_message.split('[ACTION_BUTTON]')
                pre_action_text = parts[0].strip()
                
                # Find the JSON object
                action_start = parts[1].find('{')
                
                # Track braces to handle nested JSON
                open_braces = 0
                action_end = action_start
                
                for i in range(action_start, len(parts[1])):
                    if parts[1][i] == '{':
                        open_braces += 1
                    elif parts[1][i] == '}':
                        open_braces -= 1
                        if open_braces == 0:
                            action_end = i + 1
                            break
                
                # Extract and parse JSON
                action_json = parts[1][action_start:action_end]
                action_button = json.loads(action_json)
                
                # Combine text before and after action button
                if len(parts[1]) > action_end:
                    post_action_text = parts[1][action_end:].strip()
                    bot_message = pre_action_text + ' ' + post_action_text
                else:
                    bot_message = pre_action_text
            except (ValueError, json.JSONDecodeError) as e:
                print(f"Error parsing action button: {str(e)}")
        
        print("form data:")
        print(form_data)
        return jsonify({
            "message": bot_message,
            "context_used": relevant_file,
            "form": form_data,
            "action_button": action_button,
            "suggestions": suggestions
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Add a new endpoint to handle form submissions
@app.route("/api/submit_form", methods=["POST"])
def submit_form():
    data = request.get_json()
    form_data = data.get("form_data", {})
    user_context = data.get("context", "")
    
    # Create timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create filename
    filename = f"form_submission_{timestamp}.txt"
    
    # Write to file
    try:
        with open(PATIENT_DATA_DIR / filename, "w") as f:
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"Context: {user_context}\n")
            f.write("Form Data:\n")
            for field, value in form_data.items():
                f.write(f"{field}: {value}\n")
        
        # Also add this file to the index
        patient_index = load_patient_index()
        patient_index.append(filename)
        with open(PATIENT_DATA_DIR / "index.json", "w") as f:
            json.dump(patient_index, f)
            
        return jsonify({"success": True, "message": "Form data saved successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)