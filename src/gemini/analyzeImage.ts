export interface GeminiAnalysisResult {
  isValidIssue: boolean;
  issueType: "Pothole" | "Garbage Dump" | "Broken Streetlight" | "Water Leakage" | "Damaged Road" | "Open Drain" | "Sewage Overflow" | "Other";
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  description: string;
  department: string;
  urgencyReason: string;
  estimatedImpact: "Affects 1-10 people" | "Affects 10-100 people" | "Affects 100+ people";
  confidence: number;
}

export async function analyzeIssueImage(base64Image: string, mimeType = 'image/jpeg'): Promise<GeminiAnalysisResult> {
  try {
    const response = await fetch("/api/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

    if (!response.ok) {
      throw new Error("Server-side Gemini analysis failed");
    }

    return await response.json();
  } catch (e) {
    console.error("Gemini analysis client fallback activated:", e);
    return {
      isValidIssue: true,
      issueType: "Other",
      severity: "Medium",
      title: "Civic Issue",
      description: "A civic issue requires attention.",
      department: "Municipal Corporation",
      urgencyReason: "Needs review",
      estimatedImpact: "Affects 10-100 people",
      confidence: 50
    };
  }
}
