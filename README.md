# SyncUp

SyncUp — a Real-Time Chat Application! 💬

I’ve built a fully responsive, secure, and feature-rich chat application that works seamlessly across mobile, tablet, and desktop devices. This project was an amazing journey to bring together backend scalability and frontend interactivity using MERN stack + Socket.io.

## ⚙️ Tech Stack Used
- **Frontend**: React.js, Tailwind CSS, Lucide React, Emoji Mart
- **Backend**: Node.js, Express.js, MongoDB, Socket.io
- **Security & Utilities**: JWT Authentication, bcryptjs, helmet, dotenv, express-rate-limit, multer (for file uploads)
- **Cloud Storage**: Cloudinary (for image and file uploads in production)
- **Real-Time Communication**: Socket.io + Redis adapter for scalable event handling

## 💡 Key Features
- ✅ User Authentication — Secure login, signup, and logout with JWT
- ✅ Real-Time Messaging — One-to-one and group chat powered by Socket.io
- ✅ Online / Offline Status — See live user presence updates
- ✅ Typing Indicators — Know when someone is typing in real time
- ✅ Message Notifications — Get instant alerts when new messages arrive
- ✅ Profile Management — Users can edit their own profile with photo and info
- ✅ Message Control — Send, delete, and manage messages easily
- ✅ Group Chat — Create groups (min 2, max 5 members)
- ✅ Group Admin Controls — Admin can edit group details, delete chats, and manage members
- ✅ File Sharing — Send documents, PDFs, and photos seamlessly
- ✅ Toster Alerts — Instant toast notifications for login, signup, and logout events
- ✅ Responsive Design — Beautiful and smooth UI for phone, tablet, and desktop

## 🚀 Setup Instructions

### Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# CORS Origins (comma-separated)
CLIENT_ORIGIN=https://your-frontend-domain.com

# Cloudinary Configuration (Required for production)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Local Upload Directory (fallback if Cloudinary not configured)
UPLOAD_DIR=uploads
```

### Cloudinary Setup

1. Sign up for a free account at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the Cloudinary Dashboard
3. Add these credentials to your `.env` file
4. The app will automatically use Cloudinary for file uploads when credentials are provided
5. If Cloudinary credentials are not provided, the app will fall back to local file storage (not recommended for production)

## 🎯 Learning Highlights
Building this app helped me explore:

- Real-time bi-directional communication with Socket.io
- Scalable backend design using Node.js, Express, and MongoDB
- Secure authentication and file upload handling
- Cloud storage integration with Cloudinary for production deployments
- Frontend responsiveness and interactivity using React + Tailwind CSS
- Efficient state and event management across users
