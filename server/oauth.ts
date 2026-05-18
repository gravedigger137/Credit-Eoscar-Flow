import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { getPublicAppUrl } from "./config";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

async function findOrCreateOAuthUser(profile: {
  provider: string;
  providerId: string;
  email?: string;
  fullName?: string;
  avatar?: string;
}) {
  const allUsers = await storage.getUsers();

  const existing = allUsers.find(
    (u: any) =>
      (u.oauthProvider === profile.provider && u.oauthProviderId === profile.providerId) ||
      (profile.email && u.email === profile.email)
  );

  if (existing) {
    return existing;
  }

  const isFirstUser = allUsers.length === 0;
  const username = `${profile.provider}_${profile.providerId}`.slice(0, 50);
  const randomPw = await bcrypt.hash(Math.random().toString(36), 12);

  const user = await storage.createUser({
    username,
    password: randomPw,
    fullName: profile.fullName || `${profile.provider} User`,
    email: profile.email || "",
    role: isFirstUser ? "admin" : "staff",
    oauthProvider: profile.provider,
    oauthProviderId: profile.providerId,
  });

  return user;
}

export function setupOAuth() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${getPublicAppUrl()}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await findOrCreateOAuthUser({
              provider: "google",
              providerId: profile.id,
              email: profile.emails?.[0]?.value,
              fullName: profile.displayName,
            });
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${getPublicAppUrl()}/api/auth/facebook/callback`,
          profileFields: ["id", "displayName", "emails"],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateOAuthUser({
              provider: "facebook",
              providerId: profile.id,
              email: profile.emails?.[0]?.value,
              fullName: profile.displayName,
            });
            done(null, user);
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${getPublicAppUrl()}/api/auth/github/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateOAuthUser({
              provider: "github",
              providerId: profile.id,
              email: profile.emails?.[0]?.value,
              fullName: profile.displayName || profile.username,
            });
            done(null, user);
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }
}

export function registerOAuthRoutes(app: any) {
  app.use(passport.initialize());
  app.use(passport.session());

  if (process.env.GOOGLE_CLIENT_ID) {
    app.get("/api/v1/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get(
      "/api/v1/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login?error=google_failed" }),
      (req: any, res: any) => {
        req.session.userId = req.user.id;
        req.session.save(() => res.redirect("/dashboard"));
      }
    );
  }

  if (process.env.FACEBOOK_APP_ID) {
    app.get("/api/v1/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
    app.get(
      "/api/v1/auth/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/login?error=facebook_failed" }),
      (req: any, res: any) => {
        req.session.userId = req.user.id;
        req.session.save(() => res.redirect("/dashboard"));
      }
    );
  }

  if (process.env.GITHUB_CLIENT_ID) {
    app.get("/api/v1/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
    app.get(
      "/api/v1/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/login?error=github_failed" }),
      (req: any, res: any) => {
        req.session.userId = req.user.id;
        req.session.save(() => res.redirect("/dashboard"));
      }
    );
  }

  app.get("/api/v1/auth/providers", (_req: any, res: any) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
      facebook: !!process.env.FACEBOOK_APP_ID,
      github: !!process.env.GITHUB_CLIENT_ID,
      twitter: !!process.env.TWITTER_API_KEY,
      linkedin: !!process.env.LINKEDIN_CLIENT_ID,
      apple: !!process.env.APPLE_CLIENT_ID,
    });
  });
}
