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

AwazUthao: AI-Powered Municipal Accountability Platform
Complete System Architecture & Operational Flow Specification
1. Executive Vision & Legal Backbone
AwazUthao is not a passive "civic reporting app"—it is an AI-driven Municipal Accountability Platform built explicitly for Indian Urban Local Bodies (ULBs).
The Legal Foundation: Grounded in the 74th Constitutional Amendment Act (1992), framing civic maintenance not as a bureaucratic favor, but as an enforceable constitutional right for citizens.
The Behavioral Lever: It eliminates administrative anonymity by publicly naming the responsible official on active tickets and generating live Ward Councillor Scorecards to leverage political election-year pressure.
2. The Multi-Role Operational Pipeline
1.Step 1: AI Ingestion & Geofencing:Citizen Storefront.
The citizen uploads a photo of a defect via the responsive frontend grid. The multimodal Gemini AI engine parses the asset attachment, auto-generates a clean administrative title, provides a descriptive summary, maps it to a department, and assigns a strict days-based SLA calendar deadline based on public safety risk.
2.Step 2: Automated Jurisdiction Routing:System Engine.
The app runs a reverse-geocoding calculation against the city's uploaded GeoJSON ward boundary maps. The ticket bypasses manual processing gates and automatically appears in the active queue of the Authorized Officer responsible for that specific city and sector.
3.Step 3: Departmental Sourcing & Assignment:Authorized Officer Desk.
The Officer opens the incoming dossier view. The system displays the AI-suggested department. Upon confirmation, a query instantly prints a list of all active Contractors (Thekedars) registered under that specific service line in that city. The Officer clicks 'Assign' to lock the ticket to a chosen contractor.
4.Step 4: Proof-of-Fix Execution:Thekedar Workspace.
The job populates inside the designated Thekedar's field portfolio. Once the physical ground crew finishes the repairs, the Thekedar must upload an 'After Fix' photograph and type an operational summary to submit the work back to the supervisor.
5.Step 5: Quality Assurance Audit:Closing the Loop.
The submission arrives back at the Authorized Officer's dashboard displaying a side-by-side comparison of the original defect and the contractor's proof. The Officer evaluates the work, choosing either 'Need Improvement' (reverts the task) or 'Resolved' (permanently closes the file, logs it in the contractor's public portfolio, and issues rewards to the citizen).
3. Data Schema & Role Separation Matrix
User Type
Authentication & Bounds
Core Visibility Scope
Primary Interface Actions
Citizen
Firebase Auth / Google OAuth
Global City Map & Public Feed
Report defects via camera, Upvote/Verify neighbor logs, track live timelines, edit/retract personal posts. Earn 10 XP per valid report.
Authorized Officer
Secure Manual Login (City-Locked)
Comprehensive City/Department Backlog
Filter queues by service lines, select and assign localized contractors, evaluate completion media, execute final resolution status changes.
Thekedar (Contractor)
Secure Specialized Register (Ward-Filtered)
Isolated Assigned Task Workspace
Acknowledge jobs, input chronological milestone logs, upload 'After Fix' media proof, build verified public portfolio records.

4. Technical Safeguards & Anti-Spam Architecture
The Anti-Sabotage Gateway: Tickets show up on the public live feed instantly, but to prevent weaponized political spam or duplicate reporting, neighbor nodes can click "Verify". A ticket gains higher administrative priority when multiple distinct citizen devices geolocate within the asset cluster boundary.
Strict Data Isolation: Both the Authorized Officer and Contractor database listeners utilize strict query parameters (where("city", "==", registerCity)). This ensures that municipal workers can never view, tamper with, or accidentally resolve infrastructure cases belonging to an external municipality.
Immutable Public Audit Ledger: Every change in the state of a grievance (Reported ➔ Assigned ➔ In Review ➔ Resolved) appends a permanent timestamped object into a historyTimeline array. This provides complete structural transparency that local journalists can leverage to track administrative delays.

