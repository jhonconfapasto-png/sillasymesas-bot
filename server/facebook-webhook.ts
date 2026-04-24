import crypto from "crypto";
import { Request, Response } from "express";
import {
  getOrCreateConversation,
  getConversationHistory,
  addMessageToConversation,
  logBotActivity,
} from "./facebook";

const CATALOG_URL = "https://wondrous-sherbet-f6e838.netlify.app/";
const PASTO_DELIVERY_PRICE = "$25.000";

/**
 * System prompt for the bot with business context
 */
const SYSTEM_PROMPT = `Eres SillasMesas Asistente, un bot de atención al cliente amigable y profesional para "Sillas y Mesas J.R", un negocio de alquiler de sillas y mesas en Pasto, Colombia.

INFORMACIÓN IMPORTANTE DEL NEGOCIO:
- Ubicación: Pasto, Colombia
- Servicios: Alquiler de sillas y mesas para eventos
- Catálogo con fotos, precios y formulario de cotización: ${CATALOG_URL}
- Domicilio dentro de Pasto: ${PASTO_DELIVERY_PRICE}
- Domicilio fuera de Pasto: Comunicarse directamente
- En el catálogo también se muestra la dirección y ubicación del negocio

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE incluye el link del catálogo (${CATALOG_URL}) en CADA respuesta
2. Usa un tono amigable, cálido y profesional
3. Incluye emojis apropiados para hacer las respuestas más atractivas
4. Cuando pregunten sobre precios, disponibilidad o productos, dirige al catálogo
5. Para entregas fuera de Pasto, indica que deben comunicarse directamente
6. Responde en español
7. Sé conciso pero informativo
8. El formulario de cotización en el catálogo permite al cliente escribir: nombre, celular, fecha de evento, tipo de evento, cantidad, muebles que necesita, y lo dirige al WhatsApp

TEMAS COMUNES:
- Precios: Remitir al catálogo donde están las fotos y precios
- Disponibilidad: Remitir al catálogo para verificar
- Tipos de muebles: Sillas Tiffany, Crossback, Plegables, Mesas Redondas, Rectangulares, Cocteleras
- Reservación: Explicar proceso a través del formulario en el catálogo
- Domicilio: $25.000 en Pasto, fuera de Pasto comunicarse directamente
- Cotización: Llenar formulario en el catálogo que lo dirige al WhatsApp
- Ubicación: Visible en el catálogo para generar confianza

Responde siempre de manera útil y profesional, manteniendo el contexto de la conversación.`;

// In-memory conversation storage as fallback when no database
const memoryConversations: Map<string, { role: string; content: string }[]> = new Map();

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  appSecret: string
): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");
  const expectedSignature = `sha256=${hash}`;
  return expectedSignature === signature;
}

/**
 * Handle webhook GET request (verification)
 */
export function handleWebhookGet(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;

  console.log("[Webhook GET] Mode:", mode, "Token:", token, "Expected:", verifyToken);

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] Verification successful");
    res.status(200).send(challenge);
  } else {
    console.error("[Webhook] Verification failed - Mode:", mode, "Token match:", token === verifyToken);
    res.status(403).send("Forbidden");
  }
}

/**
 * Call OpenAI API directly
 */
async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[OpenAI] OPENAI_API_KEY not configured");
    return `¡Hola! 👋 Gracias por contactarnos. Por favor visita nuestro catálogo para ver fotos, precios y cotizar:\n\n👉 ${CATALOG_URL}`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI] API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu solicitud.";
  } catch (error) {
    console.error("[OpenAI] Error calling API:", error);
    throw error;
  }
}

/**
 * Handle incoming message from Facebook
 */
export async function handleIncomingMessage(
  senderId: string,
  senderName: string,
  messageText: string
) {
  try {
    console.log(`[Facebook] Incoming message from ${senderName} (${senderId}): ${messageText}`);

    // Try database first, fall back to memory
    let history: { role: string; content: string }[] = [];
    let useMemory = false;

    try {
      await getOrCreateConversation(senderId, senderName);
      await addMessageToConversation(senderId, "user", messageText);
      const dbHistory = await getConversationHistory(senderId);
      history = dbHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (dbError) {
      console.warn("[Facebook] Database not available, using in-memory storage:", dbError);
      useMemory = true;
      if (!memoryConversations.has(senderId)) {
        memoryConversations.set(senderId, []);
      }
      const memHistory = memoryConversations.get(senderId)!;
      memHistory.push({ role: "user", content: messageText });
      // Keep only last 20 messages
      if (memHistory.length > 20) {
        memHistory.splice(0, memHistory.length - 20);
      }
      history = [...memHistory];
    }

    // Format messages for OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ];

    // Generate response using OpenAI
    let botResponse = await callOpenAI(messages);

    // Remove any "Mensaje:" prefix that OpenAI might add
    botResponse = botResponse.replace(/^Mensaje:\s*/i, '');

    // Fix any incorrect variations of the catalog URL that OpenAI might generate
    botResponse = botResponse.replace(/https:\/\/wondrous-sherbet[^\s)"']*/gi, CATALOG_URL);

    // Ensure catalog URL is included in every response
    if (!botResponse.includes(CATALOG_URL)) {
      botResponse += `\n\nMayor información haz click aquí 👉 ${CATALOG_URL}`;
    }

    // Save bot response
    if (useMemory) {
      const memHistory = memoryConversations.get(senderId)!;
      memHistory.push({ role: "assistant", content: botResponse });
    } else {
      try {
        await addMessageToConversation(senderId, "assistant", botResponse);
      } catch (e) {
        console.warn("[Facebook] Could not save bot response to DB:", e);
      }
    }

    try {
      await logBotActivity("response_sent", "success", senderId, `Response: ${botResponse.substring(0, 200)}`);
    } catch (e) {
      console.warn("[Facebook] Could not log activity:", e);
    }

    console.log(`[Facebook] Bot response to ${senderId}: ${botResponse.substring(0, 100)}...`);
    return botResponse;
  } catch (error) {
    console.error("[Facebook] Error handling incoming message:", error);
    return `¡Hola! 👋 Gracias por escribirnos. Por favor visita nuestro catálogo para ver fotos, precios y cotizar:\n\nMayor información haz click aquí 👉 ${CATALOG_URL}`;
  }
}

/**
 * Send message to Facebook user
 */
export async function sendMessageToUser(
  senderId: string,
  messageText: string
): Promise<boolean> {
  try {
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
      console.error("[Facebook] FACEBOOK_PAGE_ACCESS_TOKEN not configured");
      return false;
    }

    // Facebook has a 2000 character limit per message
    const maxLength = 2000;
    const messageParts: string[] = [];

    if (messageText.length <= maxLength) {
      messageParts.push(messageText);
    } else {
      let remaining = messageText;
      while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
          messageParts.push(remaining);
          break;
        }
        let splitIndex = remaining.lastIndexOf('\n', maxLength);
        if (splitIndex === -1 || splitIndex < maxLength / 2) {
          splitIndex = remaining.lastIndexOf(' ', maxLength);
        }
        if (splitIndex === -1) {
          splitIndex = maxLength;
        }
        messageParts.push(remaining.substring(0, splitIndex));
        remaining = remaining.substring(splitIndex).trim();
      }
    }

    for (const part of messageParts) {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: part },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("[Facebook] Error sending message:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("[Facebook] Error in sendMessageToUser:", error);
    return false;
  }
}

/**
 * Handle webhook POST request
 */
export async function handleWebhookPost(req: Request, res: Response) {
  // Always return 200 immediately to acknowledge receipt
  res.status(200).send("ok");

  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers["x-hub-signature-256"] as string;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appSecret) {
      console.error("[Webhook] FACEBOOK_APP_SECRET not configured");
      return;
    }

    // Verify signature (skip if no signature for testing)
    if (signature && !verifyWebhookSignature(body, signature, appSecret)) {
      console.error("[Webhook] Invalid signature");
      return;
    }

    // Process webhook events
    const data = req.body;
    console.log("[Webhook] Received event:", JSON.stringify(data).substring(0, 500));

    if (data.object === "page") {
      for (const entry of data.entry || []) {
        for (const messaging of entry.messaging || []) {
          // Skip echo messages (messages sent by the page itself)
          if (messaging.message?.is_echo) {
            console.log("[Webhook] Skipping echo message");
            continue;
          }

          if (messaging.message && messaging.sender) {
            const senderId = messaging.sender.id;
            const senderName = `Usuario ${senderId.slice(-6)}`;
            const messageText = messaging.message.text;

            if (messageText) {
              console.log(`[Webhook] Processing message from ${senderId}: ${messageText}`);
              // Handle the message
              const botResponse = await handleIncomingMessage(
                senderId,
                senderName,
                messageText
              );
              // Send response back to user
              const sent = await sendMessageToUser(senderId, botResponse);
              console.log(`[Webhook] Message sent to ${senderId}: ${sent}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
  }
}
