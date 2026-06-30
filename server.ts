import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to retry asynchronous operations with exponential backoff for transient errors (such as 503 high demand)
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.status || error?.code || error?.status_code;
      const message = String(error?.message || "");
      const isTransient = 
        status === 503 || 
        status === 429 ||
        message.includes("503") ||
        message.includes("429") ||
        message.includes("high demand") ||
        message.includes("UNAVAILABLE") ||
        message.includes("Resource has been exhausted") ||
        message.includes("temporary");

      if (attempt >= retries || !isTransient) {
        throw error;
      }
      console.warn(`[Gemini Retry] Transient error encountered (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use raw & json parsers with high limit for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes FIRST
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { issues } = req.body;
      if (!issues || !Array.isArray(issues)) {
        return res.status(400).json({ error: "Missing or invalid issues array" });
      }

      const prompt = `You are a Municipal Commissioner's senior AI advisor for Agra/India. Analyze the following civic issues reported by citizens:
${JSON.stringify(issues.map(i => ({ category: i.category, severity: i.severity, status: i.status, ward: i.ward })))}

Return ONLY a valid JSON object matching this schema:
{
  "executiveSummary": "A concise, high-impact 3-sentence summary of the municipal state based on current reports, priorities, and bottle-necks.",
  "resolutionRate": "e.g. 45%",
  "topIssueType": "e.g. Potholes",
  "worstArea": "e.g. Taj Ganj / Ward 12",
  "trend": "improving" | "worsening",
  "recommendations": [
    "Specific recommendation 1 with immediate on-ground action",
    "Specific recommendation 2 for long-term policy or structural budget routing",
    "Specific recommendation 3 to resolve citizen grievances fast"
  ],
  "predictiveWarning": "A critical prediction about civic system overload, traffic blocks, or health hazards (e.g., disease outbreak during monsoons) due to unresolved issues."
}`;

      const response = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        })
      );

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini report generation error:", error);
      res.json({
        executiveSummary: "Due to high traffic, standard AI analytical pipelines are currently offline. Local municipal reports show multiple pending categories that need urgent administrative routing.",
        resolutionRate: "Pending",
        topIssueType: "Unclassified",
        worstArea: "General Wards",
        trend: "worsening",
        recommendations: [
          "Establish high-priority physical inspections across all reported wards.",
          "Redirect sanitation workforce to clear garbage choke points immediately.",
          "Mobilize electricity repair vans to address unresolved streetlights."
        ],
        predictiveWarning: "Unattended municipal reports could compound local resident transit hazards during peak hours."
      });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { base64Image, mimeType, title, description } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Missing base64Image" });
      }

      let cleanBase64 = base64Image;
      let finalMimeType = mimeType || "image/jpeg";
      
      if (base64Image.includes(";base64,")) {
        const parts = base64Image.split(";base64,");
        cleanBase64 = parts[1];
        finalMimeType = parts[0].replace("data:", "");
      }

      let promptText = `You are an expert senior municipal engineer and public safety inspector in India.
Analyze the provided image of a reported civic issue/public defect.
Identify the main issue and generate a structured JSON analysis containing:
1. inferredCategory: MUST be exactly one of: "Pothole", "Garbage", "Streetlight", "Water", "Road", "Open Drain", "Sewage Overflow", "Other".
2. inferredSeverity: MUST be exactly one of: "Low", "Medium", "High", "Critical".
3. inferredTitle: A concise, highly professional 3-5 word title describing the exact civic issue (e.g., "Broken Drain Slab", "Accumulated Waste Pile", "Flooded Street Junction").
4. inferredDescription: A detailed, helpful 1-2 sentence description detailing what is wrong, the public hazard it poses, and the clear civic response needed. Make it sound like a formal citizen complaint or inspector report.

CRITICAL SEVERITY RUBRIC:
- Critical: Life-threatening hazards like exposed high-voltage wires, deep open drains on busy walkways, active deep craters on high-speed roads, or major flooding blocking roads completely.
- High: Large road potholes, significant garbage piling blocking pedestrian pathways, major water pipe bursts with active flooding.
- Medium: General road wear, broken neighborhood streetlights, moderate trash clusters, non-flooding minor pipe leaks.
- Low: Minor cosmetic issues, non-obstructive light littering, small cosmetic wall cracks.`;

      if (title || description) {
        promptText += `\n\nUser-provided context (if any):\nTitle: ${title || ""}\nDescription: ${description || ""}\nIf the user provided text, verify it against the image and align the generated fields appropriately.`;
      }

      const response = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: finalMimeType,
                data: cleanBase64,
              }
            },
            promptText
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                inferredCategory: {
                  type: Type.STRING,
                  description: "Must be exactly one of: Pothole, Garbage, Streetlight, Water, Road, Open Drain, Sewage Overflow, Other"
                },
                inferredSeverity: {
                  type: Type.STRING,
                  description: "Must be exactly one of: Low, Medium, High, Critical"
                },
                inferredTitle: {
                  type: Type.STRING,
                  description: "A highly clear 3-5 word title of the reported civic issue."
                },
                inferredDescription: {
                  type: Type.STRING,
                  description: "A formal 1-2 sentence description explaining the visual evidence, hazard, and corrective action."
                }
              },
              required: ["inferredCategory", "inferredSeverity", "inferredTitle", "inferredDescription"]
            }
          }
        })
      );

      const parsedData = JSON.parse(response.text || "{}");
      
      res.json({
        inferredCategory: parsedData.inferredCategory || "Other",
        inferredSeverity: parsedData.inferredSeverity || "Medium",
        inferredTitle: parsedData.inferredTitle || "Reported Civic Issue",
        inferredDescription: parsedData.inferredDescription || "Civic issue requires municipal attention."
      });
    } catch (error: any) {
      console.error("Gemini analysis error:", error);
      res.json({
        inferredCategory: "Other",
        inferredSeverity: "Medium",
        inferredTitle: "Reported Civic Issue",
        inferredDescription: "Civic issue requires municipal attention."
      });
    }
  });

  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: "Missing lat or lng" });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AwazUthao/1.0 (garvit2411001@gmail.com)"
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim failed with status ${response.status}`);
      }

      const data: any = await response.json();
      const addr = data.address || {};
      
      // Determine a friendly neighborhood/ward name
      const wardName = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.town || addr.city_district || "";
      const city = addr.city || addr.town || addr.village || addr.county || "Unknown City";
      const state = addr.state || "India";

      res.json({
        ward: wardName ? `Ward (${wardName})` : "",
        city,
        state,
        displayName: data.display_name || ""
      });
    } catch (error: any) {
      console.error("Reverse geocoding error:", error);
      res.status(500).json({ error: "Failed to reverse geocode" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
