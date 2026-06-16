# 🚀 PingMe - Full Stack Social Media Application

PingMe is a modern full-stack social media platform inspired by Instagram and Messenger. Users can create posts, follow others, chat in real-time, receive notifications, and manage their profiles.

---

## 🌐 Live Demo

### Frontend
https://ping-me-eosin-phi.vercel.app

### Backend API
https://pingme-api-new.onrender.com

---

# 📸 Features

## 🔐 Authentication

- User Registration
- User Login
- JWT Authentication
- Protected Routes
- Secure API Access

---

## 👤 User Profile

- View Profile
- Edit Profile
- Upload Profile Picture
- Search Users
- Follow Users
- Unfollow Users
- View Followers
- View Following

---

## 📝 Posts

- Create Posts
- Upload Images
- Like & Unlike Posts
- Comment on Posts
- Real-time Post Updates

---

## 💬 Real-Time Chat

- One-to-One Messaging
- Real-Time Messages using Socket.io
- Online / Offline Status
- Typing Indicator
- Message Seen Status
- Send Images
- Delete Message For Me
- Delete Message For Everyone

---

## 🔔 Notifications

- Follow Notifications
- Like Notifications
- Comment Notifications
- Real-Time Notification Updates

---

## 🎨 User Experience

- Dark Mode
- Responsive Design
- Mobile Friendly UI
- Smooth Navigation

---

# 🛠️ Tech Stack

## Frontend

- React.js
- React Router DOM
- Axios
- Socket.io Client
- CSS3
- React Hot Toast
- Emoji Picker

---

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Bcrypt.js
- Multer
- Socket.io

---

## 🗂️ Project Structure

```

PingMe/
│
├── client/                 # React Frontend
│
├── server/
│   ├── controllers/        # API Logic
│   ├── models/             # MongoDB Schemas
│   ├── routes/             # API Routes
│   ├── middleware/         # Authentication Middleware
│   ├── config/             # Database & Upload Config
│
└── README.md

```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/manikanta75698/PingMe.git
```

---

## 2. Install Frontend Dependencies

```bash
cd client
npm install
```

---

## 3. Install Backend Dependencies

```bash
cd server
npm install
```

---

## 4. Environment Variables

Create `.env` inside server:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
```

---

## 5. Start Development Servers

### Frontend

```bash
npm run dev
```

### Backend

```bash
npm start
```

---

# 🔐 API Routes

## Authentication

POST /api/auth/register

POST /api/auth/login

---

## Users

GET /api/users/search

PUT /api/users/follow/:id

PUT /api/users/unfollow/:id

GET /api/users/:id

---

## Posts

POST /api/posts

GET /api/posts

PUT /api/posts/like/:id

POST /api/posts/comment/:id

---

## Messages

GET /api/messages

POST /api/messages

PUT /api/messages/seen

---

# 🚀 Deployment

Frontend deployed on Vercel.

Backend deployed on Render.

Database hosted on MongoDB Atlas.

---

# 🔮 Future Improvements

- Video Posts/Reels
- Group Chat
- Voice & Video Calling
- Saved Posts
- Private Accounts
- Follow Requests
- Push Notifications

---

# 👨‍💻 Developer

Built with ❤️ by Kasir.
