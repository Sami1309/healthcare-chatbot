# Healthcare Chat App Demo

This is a demo for a healthcare chat application that implements a rudimentary RAG system and generates dynamic UI within the chat window.

## Features

### Dynamic Link generation

Can create links to relevant sites based on context

<img width="848" alt="Screenshot 2025-03-26 at 12 44 18 AM" src="https://github.com/user-attachments/assets/b52c9c77-2676-46a6-a54f-551a4dfe3eff" />

### Chat suggestions

Offers chat suggestions based on chat context and history

### Dynamic form generation

Generates forms based on desired user input.

<img width="860" alt="Screenshot 2025-03-26 at 12 44 47 AM" src="https://github.com/user-attachments/assets/361137e6-ce18-43cb-a595-54568dab934c" />

## Setup

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
2. Install dependencies
    npm install

3. Start the development server
    npm start


### Backend

1. Navigate to the backend directory
    cd backend
2. (Optional) Create and activate a virtual environment
    python -m venv venv
    source venv/bin/activate
3. Install depencies
    pip install -r requirements.txt
4. Set your OpenAI key in the .env file
    OPENAI_API_KEY=your_openai_api_key_here
5. Start the Flask Server
    flask run
    
