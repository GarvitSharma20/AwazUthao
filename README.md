# AwazUthao - PWA Mobile Civic Reporting Applet

AwazUthao (Aapki Awaaz, Aapka Shehar) is a fully functional, mobile-first PWA for civic reporting, tracking, and local government management.

## DEPLOY STEPS:
1. Fill in Firebase config values in `src/firebase/config.js` or `.env` / configure Firebase Database
2. Set `VITE_GEMINI_API_KEY` or `GEMINI_API_KEY` in AI Studio secrets (for server proxy)
3. Go to Firebase Console → Firestore → Rules → paste open rules → Publish
4. Go to Firebase Console → Storage → Rules → paste open rules → Publish
5. Go to Firebase Console → Authentication → Add authorized domain (your .run.app URL after deploy)
6. Click "Publish" in Google AI Studio → get your public URL
7. Add that URL to Firebase authorized domains
8. Open URL on Android Chrome → tap menu → "Add to Home Screen"

Complete App Flow

Overview

CITIZEN                    AUTHORITY OFFICER              THEKEDAR
    │                            │                            │
    │  Reports issue             │                            │
    │  with photo                │                            │
    │         │                  │                            │
    │    GEMINI AI               │                            │
    │    analyzes photo          │                            │
    │    auto-fills all          │                            │
    │    details                 │                            │
    │         │                  │                            │
    │  Gets Grievance ID         │                            │
    │  + SLA deadline            │                            │
    │         │                  │                            │
    │         └──────────────────►                            │
    │                     Issue appears in                    │
    │                     officer's city                      │
    │                     + dept queue                        │
    │                            │                            │
    │                     Officer reviews                     │
    │                     AI analysis +                       │
    │                     selects dept                        │
    │                            │                            │
    │                     Sees thekedar list                  │
    │                     (same dept + city)                  │
    │                            │                            │
    │                     Assigns thekedar                    │
    │                     + creates work order                │
    │                            │                            │
    │                            └────────────────────────────►
    │                                                  Issue assigned
    │                                                  to thekedar
    │                                                         │
    │                                                  Thekedar goes
    │                                                  to location
    │                                                         │
    │                                                  Uploads proof
    │                                                  photos + note
    │                                                         │
    │                                                  Submits work
    │                            │◄────────────────────────────
    │                     Officer reviews                     │
    │                     before/after photos                 │
    │                            │                            │
    │                     Approves OR                         │
    │                     Rejects with reason                 │
    │                            │                            │
    │◄───────────────────────────┘                            │
    │  Gets notification                                      │
    │  Sees official response                                 │
    │  + resolution photos                                    │
    │  Rates 1-5 stars                                        │
    │                                                         │
PUBLIC DASHBOARD (no login)
    └── Department grades visible to everyone
    └── Media, politicians, citizens see performance
    └── Social + political pressure for accountability
