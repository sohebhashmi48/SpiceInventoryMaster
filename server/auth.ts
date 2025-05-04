import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      fullName: string;
      role: string;
      email?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "spice-inventory-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Only used for regular users, not admin
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          const userToAuth = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          };
          return done(null, userToAuth);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const userWithProperEmail = {
          ...user,
          email: user.email || undefined
        };
        done(null, userWithProperEmail);
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error);
    }
  });

  // Fixed admin credentials - store in a secure way
  let ADMIN_USERNAME = "admin";
  let ADMIN_PASSWORD = await hashPassword("admin123"); // Default password
  let ADMIN_EMAIL = "admin@example.com"; // Default email for password recovery

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (username !== ADMIN_USERNAME) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePasswords(password, ADMIN_PASSWORD);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = {
        id: 1,
        username: ADMIN_USERNAME,
        fullName: "Administrator",
        email: ADMIN_EMAIL,
        role: "admin"
      };

      await new Promise((resolve, reject) => {
        req.login(user, (err) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      res.status(200).json(user);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  // Change password endpoint
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isValidPassword = await comparePasswords(currentPassword, ADMIN_PASSWORD);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    ADMIN_PASSWORD = await hashPassword(newPassword);
    res.status(200).json({ message: "Password updated successfully" });
  });
  
  // Update admin settings
  app.post("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { username, email } = req.body;
    
    if (username) ADMIN_USERNAME = username;
    if (email) ADMIN_EMAIL = email;
    
    const updatedUser = {
      ...req.user,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL
    };
    
    res.status(200).json(updatedUser);
  });
  
  // Forgot password - request reset
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    if (email !== ADMIN_EMAIL) {
      // For security, always return success even if email doesn't match
      return res.status(200).json({ 
        message: "If your email is in our system, you will receive a password reset link" 
      });
    }
    
    // In a real app, you would generate a token and send an email
    // For this demo, we'll just reset to a simple password
    const tempPassword = `temp-${Math.floor(Math.random() * 10000)}`; 
    ADMIN_PASSWORD = await hashPassword(tempPassword);
    
    // Log the temp password for demo purposes
    console.log(`SYSTEM: Temporary password for admin: ${tempPassword}`);
    
    res.status(200).json({ 
      message: "If your email is in our system, you will receive a password reset link",
      // IMPORTANT: In production, NEVER return the actual password in the response!
      // This is only for demonstration purposes
      tempPassword: tempPassword
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
