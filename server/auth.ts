import { Express, Request, Response } from "express";
import session from "express-session";
import { storage } from "./storage";

// Extend the SessionData interface
declare module 'express-session' {
  interface SessionData {
    user: AuthUser;
  }
}

// Simple user interface for authentication
interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  email?: string;
}

// Declare session user type
declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated: () => boolean;
    }
  }
}

// Create a hard-coded set of users for login
const users = [
  {
    id: 9999,
    username: "admin",
    password: "admin123",
    fullName: "Administrator",
    email: "admin@example.com",
    role: "admin"
  },
  {
    id: 1,
    username: "user",
    password: "password123",
    fullName: "Test User",
    email: "test@example.com",
    role: "manager"
  }
];

export async function setupAuth(app: Express) {
  // Session setup
  const sessionSettings: session.SessionOptions = {
    secret: "spice-inventory-secret-key-1234",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));

  // Custom authentication middleware
  app.use((req, res, next) => {
    // Attach user data to the request if session contains user info
    if (req.session && req.session.user) {
      req.user = req.session.user;
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  // Login endpoint
  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`Login attempt - username: ${username}`);
      
      // Find user by username
      const user = users.find(u => u.username === username);
      
      // Verify password
      if (user && user.password === password) {
        console.log(`Authentication successful for user: ${username}`);
        
        // Create a sanitized user object without password
        const sanitizedUser: AuthUser = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        };
        
        // Store user in session
        req.session.user = sanitizedUser;
        
        return res.status(200).json(sanitizedUser);
      }
      
      // Authentication failed
      console.log('Authentication failed');
      return res.status(401).json({ message: "Invalid username or password" });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Change password endpoint
  app.post("/api/change-password", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    const user = users.find(u => u.username === req.user.username);
    
    if (!user || user.password !== currentPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    res.status(200).json({ message: "Password updated successfully" });
  });
  
  // Forgot password endpoint
  app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // For security, always return the same response even if email doesn't exist
      return res.status(200).json({ 
        message: "If your email is in our system, you will receive a password reset link" 
      });
    }
    
    // Generate a temporary password
    const tempPassword = `temp-${Math.floor(Math.random() * 10000)}`;
    user.password = tempPassword;
    
    console.log(`SYSTEM: Temporary password for ${user.username}: ${tempPassword}`);
    
    res.status(200).json({ 
      message: "If your email is in our system, you will receive a password reset link",
      // IMPORTANT: In production, NEVER return the actual password in the response!
      // This is only for demonstration purposes
      tempPassword: tempPassword
    });
  });
}