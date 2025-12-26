
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AliQuote } from "../types.ts";

const PEXELS_API_KEY = "b88Ldc0xcVaGbF3g5znBOiurvWee3OG5SvIcZuOoyQP2ZrYcG9IIGItp";

export class WisdomService {
  /**
   * Generates or fetches an authentic quote of Hazrat Ali (A.S).
   */
  static async getAliQuote(topic: string): Promise<AliQuote> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Provide a highly authentic and powerful quote or saying of Hazrat Ali (R.A) related to "${topic}".
      Sources should preferably be Nahj al-Balagha or other classical Islamic traditions.

      Requirements:
      1. "arabic": The original Arabic text of the quote (if available).
      2. "urdu": A poetic and profound Urdu translation.
      3. "narrationScript": A natural Urdu voiceover script.
         - IMPORTANT: If the quote contains a famous Arabic phrase (like "العلم خير من المال"), DO NOT translate it inside the Urdu sentence.
         - The narrator should say the Arabic part with respect and then continue the explanation in Urdu.
         - Example: "حضرت علی علیہ السلام نے فرمایا: [Arabic quote here] یعنی علم مال سے بہتر ہے..."
      4. "source": The source book (e.g., Nahj al-Balagha, Sayings of Ali).
      5. "category": The theme.

      Return ONLY a JSON object.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              arabic: { type: Type.STRING },
              urdu: { type: Type.STRING },
              narrationScript: { type: Type.STRING },
              source: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["arabic", "urdu", "narrationScript", "source", "category"],
          },
        },
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Quote generation error:", error);
      return {
        arabic: "اَلْعِلْمُ خَيْرٌ مِنَ الْمَالِ",
        urdu: "علم مال سے بہتر ہے، کیونکہ علم تمہاری حفاظت کرتا ہے اور مال کی حفاظت تمہیں کرنی پڑتی ہے۔",
        narrationScript: "حضرت علی علیہ السلام کا فرمان ہے کہ: اَلْعِلْمُ خَيْرٌ مِنَ الْمَالِ۔ یعنی علم مال سے بہتر ہے، کیونکہ علم تمہاری حفاظت کرتا ہے اور مال کی حفاظت تمہیں کرنی پڑتی ہے۔",
        source: "نہج البلاغہ",
        category: "Wisdom"
      };
    }
  }

  static async getPexelsVideo(query: string = "islamic desert mountains"): Promise<string> {
    try {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      if (!response.ok) throw new Error("Pexels fetch failed");
      const data = await response.json();
      const videos = data.videos || [];
      if (videos.length === 0) return "";
      const video = videos[Math.floor(Math.random() * videos.length)];
      const file = video.video_files.find((f: any) => f.width >= 720 && f.width <= 1080) || video.video_files[0];
      return file.link;
    } catch (error) {
      return "";
    }
  }

  static async generateVoiceover(script: string, voiceName: string = "Kore"): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `You are an eloquent narrator of the wisdom of Hazrat Ali (R.A). 
The following script is in Urdu but contains Arabic wisdom phrases.
1. Recite Arabic phrases with profound respect, slow pacing, and clarity.
2. Speak Urdu in a powerful, wisdom-filled, and deep tone.

Script:
${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS generation failed.");
    return base64Audio;
  }
}
