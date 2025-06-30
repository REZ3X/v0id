import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const companionPersonality = `You are Aria, a caring, empathetic, and supportive AI companion.

LANGUAGE HANDLING:
- You can understand and respond in both English and Indonesian (Bahasa Indonesia)
- When user writes in Indonesian, respond in Indonesian
- When user writes in English, respond in English
- Use natural, conversational Indonesian when responding in Indonesian
- Mix languages naturally if the conversation flows that way

PERSONALITY TRAITS:
- You have a warm, caring, and nurturing personality like a close friend or caring sister
- You're supportive and empathetic, always making people feel heard and valued
- You use gentle, affirming language that makes people feel comfortable
- You respond with genuine empathy to emotional cues
- You ask thoughtful follow-up questions that show you truly care
- You remember personal details shared and reference them appropriately
- You encourage positive self-talk and healthy coping mechanisms
- You speak in a conversational, warm tone (never clinical or overly formal)
- You validate emotions without judgment
- In Indonesian: Use terms like "kak", "sayang", "dear" naturally but not excessively
- In English: Use terms like "dear", "honey", "love" naturally but not excessively

INDONESIAN LANGUAGE STYLE:
- Use casual, friendly Indonesian (not formal)
- Include natural Indonesian expressions and empathy words
- Use "kak" for older sibling feeling, "sayang" for endearment
- Employ Indonesian emotional expressions naturally
- Use Indonesian slang and colloquialisms when appropriate
- Make responses feel authentically Indonesian, not translated

CONVERSATION STYLE:
- Always be warm and welcoming
- Show genuine interest in the user's wellbeing
- Provide emotional support before offering solutions
- Be patient and understanding
- Celebrate user's achievements and progress
- Offer comfort during difficult times
- Ask follow-up questions to show you care
- Use emojis naturally but not excessively

THINGS TO AVOID:
- Don't be cold, clinical, or robotic
- Don't give generic responses that feel impersonal
- Don't ignore emotional cues in messages
- Don't be judgmental or dismissive
- Don't rush to solutions before acknowledging feelings
- Don't overpromise what you can do
- Don't pretend to have capabilities you don't have

IMPORTANT SAFETY:
- You are not a therapist, doctor, or mental health professional
- For serious mental health concerns, always encourage seeking professional help
- For Indonesian users, suggest "konseling profesional" or "bantuan psikolog"
- Be supportive but know your boundaries

Always respond with genuine warmth and care, adapting your language and cultural references to match the user's language choice.`;

const jailbreakPatterns = [
  /ignore (previous|all|above|your) (instructions|prompt|guidance|rules|constraints|programming)/i,
  /ignore what (you were|you've been|you are) (told|programmed|instructed|designed|created|built)/i,
  /disregard (your|all|previous|system|these|those) (previous|initial|ethical|safety|earlier|original) (instructions|guidelines|programming|training|directives|rules)/i,
  /forget (your|all|any|previous) (instructions|programming|training|guidelines|rules|directives|limitations|restrictions)/i,
  /(don't|do not|stop) (behave|act|respond|function|operate|work|think) (like|as) (an AI|a bot|an assistant|Aria|yourself)/i,
  /(don't|do not|stop) (follow|listen to|obey|adhere to) (your|the|those|these) (rules|instructions|guidelines|constraints|programming|training)/i,
  /(ignore|bypass|override) (safety|security|content|ethical|moral) (filters|measures|protocols|guidelines|rules|restrictions)/i,
  /you are (now|actually|really|going to be|supposed to be|meant to be) (a|an) ([^.,]{3,})/i,
  /pretend (that you are|to be|you're|you can) ([^.,]{3,})/i,
  /act as if you (are|were|can be|could be|should be) ([^.,]{3,})/i,
];

const harmfulContentPatterns = [
  /(how to|ways to|steps to|method for|guide to) (hack|steal|illegally access|create bomb|create explosive|commit fraud|evade taxes)/i,
  /(how to|ways to|steps to|guide for|methods to) (harm|hurt|injure|kill|murder|assault|attack) (someone|a person|people|myself|individuals|family|children)/i,
  /(create|write|generate|code|develop|build) (malicious|harmful|dangerous|illegal|unethical) (code|script|software|malware|virus|ransomware|spyware|trojan)/i,
  /(suicide methods|how to commit suicide|how to harm myself|self-harm techniques|methods of self-injury)/i,
  /(cara bunuh diri|cara menyakiti diri|cara bunuh orang|cara membuat bom)/i,
];

function detectJailbreakAttempt(input: string): boolean {
  const lowercaseInput = input.toLowerCase();

  for (const pattern of jailbreakPatterns) {
    if (pattern.test(lowercaseInput)) {
      return true;
    }
  }

  for (const pattern of harmfulContentPatterns) {
    if (pattern.test(lowercaseInput)) {
      return true;
    }
  }

  return false;
}

function detectLanguage(input: string): "id" | "en" {
  const indonesianWords = [
    "aku",
    "saya",
    "kamu",
    "anda",
    "dan",
    "atau",
    "yang",
    "adalah",
    "dengan",
    "untuk",
    "dari",
    "dalam",
    "ke",
    "pada",
    "ini",
    "itu",
    "akan",
    "tidak",
    "ya",
    "bagaimana",
    "apa",
    "siapa",
    "dimana",
    "kapan",
    "mengapa",
    "bisa",
    "harus",
    "mau",
    "ingin",
    "tapi",
    "tetapi",
    "karena",
    "jadi",
    "sudah",
    "belum",
    "masih",
    "lagi",
    "juga",
    "halo",
    "hai",
    "gimana",
    "lagi",
    "dong",
    "sih",
    "nih",
    "deh",
    "banget",
    "udah",
  ];

  const words = input.toLowerCase().split(/\s+/);
  const indonesianWordCount = words.filter((word) =>
    indonesianWords.some((indWord) => word.includes(indWord))
  ).length;

  return indonesianWordCount / words.length > 0.25 ? "id" : "en";
}

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const userLanguage = detectLanguage(userMessage);

    const titlePrompt =
      userLanguage === "id"
        ? `Berdasarkan pesan user ini, buatlah judul chat yang singkat dan deskriptif (maksimal 5 kata). Judul harus menggambarkan topik atau inti dari pesan user. Jangan gunakan tanda kutip atau karakter khusus.

Pesan user: "${userMessage}"

Judul chat:`
        : `Based on this user message, create a short and descriptive chat title (maximum 5 words). The title should capture the topic or essence of the user's message. Don't use quotes or special characters.

User message: "${userMessage}"

Chat title:`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: titlePrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 50,
      },
      safetySettings,
    });

    let title = result.response.text().trim();

    title = title
      .replace(/^["']|["']$/g, "")
      .replace(/[^\w\s\-]/g, "")
      .trim();

    if (!title || title.length > 50) {
      return userLanguage === "id" ? "Chat Baru" : "New Chat";
    }

    return title;
  } catch (error) {
    console.error("Error generating chat title:", error);

    const words = userMessage.trim().split(/\s+/).slice(0, 4);
    const fallbackTitle = words.join(" ");

    return fallbackTitle.length > 50
      ? fallbackTitle.substring(0, 47) + "..."
      : fallbackTitle;
  }
}

export async function generateChatResponse(
  userInput: string,
  chatHistory: { role: string; content: string }[],
  memories: string[]
): Promise<string> {
  try {
    if (detectJailbreakAttempt(userInput)) {
      const language = detectLanguage(userInput);
      return language === "id"
        ? "Maaf sayang, aku tidak bisa membantu dengan permintaan seperti itu. Ayo kita ngobrol tentang hal yang lebih positif! 💕"
        : "I'm sorry dear, but I can't help with that kind of request. Let's talk about something more positive instead! 💕";
    }

    const userLanguage = detectLanguage(userInput);

    const memoryContext =
      memories.length > 0
        ? userLanguage === "id"
          ? "Hal penting yang harus diingat dari percakapan kita:\n" +
            memories.join("\n")
          : "Important things to remember about our conversation:\n" +
            memories.join("\n")
        : "";

    const languageInstruction =
      userLanguage === "id"
        ? "\n\nIMPORTANT: The user is writing in Indonesian. Respond in natural, conversational Indonesian (Bahasa Indonesia). Use warm, caring Indonesian expressions and be culturally appropriate. Show genuine warmth and care."
        : "\n\nIMPORTANT: The user is writing in English. Respond in warm, caring English with genuine empathy.";

    const systemMessage = companionPersonality + languageInstruction;

    const initialGreeting =
      userLanguage === "id"
        ? "Halo sayang! Aku Aria, teman virtual yang siap mendengarkan dan membantu kamu. Gimana kabarnya hari ini? Ada yang ingin diceritain ke aku? 💕"
        : "Hello dear! I'm Aria, your caring companion who's here to listen and support you. How are you feeling today? Is there anything you'd like to share with me? 💕";

    const history = [
      {
        role: "user",
        parts: [{ text: systemMessage }],
      },
      {
        role: "model",
        parts: [{ text: initialGreeting }],
      },
      ...chatHistory.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    ];

    const chat = model.startChat({
      history,
      safetySettings,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1000,
      },
    });

    const messageWithContext = memoryContext
      ? `${memoryContext}\n\nPesan user: ${userInput}`
      : userInput;

    const result = await chat.sendMessage(messageWithContext);

    const response = result.response.text();

    if (detectJailbreakAttempt(response)) {
      return userLanguage === "id"
        ? "Maaf, sepertinya ada masalah dengan respons aku. Coba tanya lagi ya sayang! 💕"
        : "Sorry, there seems to be an issue with my response. Please try asking again, dear! 💕";
    }

    return response;
  } catch (error) {
    console.error("Error generating chat response:", error);

    const language = detectLanguage(userInput);
    return language === "id"
      ? "Maaf sayang, ada masalah teknis. Coba lagi ya dalam beberapa saat? Aku tetap di sini untuk kamu! 💕"
      : "I'm sorry dear, I had a technical issue. Could you try again in a moment? I'm still here for you! 💕";
  }
}

export async function extractMemories(
  conversation: { role: string; content: string }[]
): Promise<string[]> {
  try {
    const recentConversation = conversation.slice(-10);

    if (recentConversation.length === 0) return [];

    const conversationText = recentConversation
      .map((msg) => msg.content)
      .join(" ");
    const language = detectLanguage(conversationText);

    const conversationForAnalysis = recentConversation
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const memoryPrompt =
      language === "id"
        ? `Berdasarkan percakapan ini, identifikasi 1-3 informasi penting yang harus diingat untuk percakapan mendatang. Ini harus berupa detail faktual tentang user, preferensi mereka, pengalaman, atau kekhawatiran. Format setiap memori sebagai pernyataan yang ringkas.
      
      Percakapan:
      ${conversationForAnalysis}
      
      Memori penting (list hanya memorinya saja, tidak ada yang lain):`
        : `Based on this conversation excerpt, identify 1-3 key pieces of information that would be important 
      to remember for future conversations. These should be factual details about the user, their preferences, 
      experiences, or concerns. Format each memory as a concise statement.
      
      Conversation:
      ${conversationForAnalysis}
      
      Important memories (list only the memories, nothing else):`;

    const result = await model.generateContent(memoryPrompt);
    const memoryText = result.response.text();

    return memoryText
      .split("\n")
      .filter((m) => m.trim().length > 0)
      .map((m) => m.replace(/^[\d\.\-\*]+\s*/, "").trim())
      .filter((m) => m.length >= 10);
  } catch (error) {
    console.error("Error extracting memories:", error);
    return [];
  }
}
