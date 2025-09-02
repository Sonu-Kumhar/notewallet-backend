# NoteWallet Backend

This repository contains the **backend API** for NoteWallet – a secure note management application.  
It provides user authentication (with OTP verification) and CRUD operations for notes.  

---

## 🚀 Features
- User authentication with OTP verification (email-based).
- JWT-based session handling.
- CRUD operations for notes (create, read, update, delete).
- Middleware for authentication and error handling.
- MongoDB as the database.

---

## 🛠️ Tech Stack
- **Node.js** – runtime environment
- **Express.js** – web framework
- **MongoDB & Mongoose** – database and ODM
- **Nodemailer** (if you used it) – for sending OTP emails
- **JWT (jsonwebtoken)** – authentication
- **dotenv** – environment variable management

---

## 📂 Project Structure
backend/
│── middleware/ # Custom middleware (auth, error handling)
│── models/ # Mongoose models (User, Note, etc.)
│── server.js # Main entry point
│── package.json # Dependencies & scripts
│── .gitignore # Ignored files


## ⚡ Getting Started

1️⃣ Clone the repository
git clone https://github.com/Sonu-Kumhar/notewallet-backend.git
cd NoteWallet-backend
2️⃣ Install dependencies
bash
Copy code
npm install
3️⃣ Setup environment variables
Create a .env file in the root with the following values:

env
Copy code
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>
EMAIL_USER=<your-email>
EMAIL_PASS=<your-email-password>
4️⃣ Run the development server
bash
Copy code
npm run dev
For production:

bash
Copy code
npm start

📌 API Endpoints
Auth Routes

POST /register – Register a new user

POST /login – Request OTP login

POST /login/verify-otp – Verify OTP and issue token

Note Routes (protected)

GET /notes – Fetch all notes of a user

POST /notes – Create a new note

PUT /notes/:id – Update an existing note

DELETE /notes/:id – Delete a note

🔗 Frontend Repository

The frontend of this project is available here: https://github.com/Sonu-Kumhar/notewallet-frontend

✨ Author

Developed by Sonu Kumhar as part of an Internshala Assignment Project.

Do you want me to also make a **combined root README** (for the whole project with links to frontend + backend), or will you submit them separately?

