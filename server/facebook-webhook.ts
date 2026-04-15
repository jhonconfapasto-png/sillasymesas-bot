import crypto from "crypto";
import { Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
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
- Catálogo: ${CATALOG_URL}
- Domicilio dentro de Pasto: ${PASTO_DELIVERY_PRICE}
- Domicilio fuera de Pasto: Comunicarse directamente

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE incluye el link del catálogo (${CATALOG_URL}) en CADA respuesta
2. Usa un tono amigable, cálido y profesional
3. Incluye emojis apropiados para hacer las respuestas más atractivas
4. Cuando pregunten sobre precios, disponibilidad o productos, dirige al catálogo
5. Para entregas fuera de Pasto, indica que deben comunicarse directamente
6. Responde en español
7. Sé conciso pero informativo

TEMAS COMUNES:
- Precios: Remitir al catálogo
- Disponibilidad: Remitir al catálogo para verificar
- Tipos de muebles: Sillas Tiffany, Crossback, Plegables, Mesas Redondas, Rectangulares, Cocteleras
- Reservación: Explicar proceso a través del catálogo
- Domicilio: $25.000 en Pasto, fuera de Pasto comunicarse directamente
- Cotización: Llenar formulario en el catálogo

Responde siempre de manera útil y profesional, manteniendo el contexto de la conversación.`;

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  appSecret: string
): boolean {
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
 * Handle incoming message from Facebook
 */
export async function handleIncomingMessage(
  senderId: string,
  senderName: string,
  messageText: string
) {
  try {
    // Log incoming message
    await logBotActivity(
      "message_received",
      "success",
      senderId,
      `Message: ${messageText}`
    );

    // Get or create conversation
    await getOrCreateConversation(senderId, senderName);

    // Add user message to history
    await addMessageToConversation(senderId, "user", messageText);

    // Get conversation history
    const history = await getConversationHistory(senderId);

    // Format messages for OpenAI
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Generate response using OpenAI (uses gpt-4.1-mini by default)
    const response = await invokeLLM({
      messages,
    });

    const content = response.choices[0]?.message?.content;
    let botResponse =
      typeof content === "string"
        ? content
        : "Lo siento, no pude procesar tu solicitud.";

    // Ensure catalog URL is included in every response
    if (!botResponse.includes(CATALOG_URL)) {
      botResponse += `\n\nMayor información haz click aquí 👉 ${CATALOG_URL}`;
    }

    // Add bot response to history
    await addMessageToConversation(senderId, "assistant", botResponse);

    // Log successful response
    await logBotActivity(
      "response_sent",
      "success",
      senderId,
      `Response: ${botResponse}`
    );

    return botResponse;
  } catch (error) {
    console.error("[Facebook] Error handling incoming message:", error);

    await logBotActivity(
      "message_processing_error",
      "error",
      senderId,
      error instanceof Error ? error.message : "Unknown error"
    );

    return `Lo siento, estoy experimentando dificultades técnicas. Por favor, intenta de nuevo más tarde. 🙏\n\nMayor información haz click aquí 👉 ${CATALOG_URL}`;
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
      throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not configured");
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: messageText },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[Facebook] Error sending message:", error);
      await logBotActivity(
        "message_send_failed",
        "error",
        senderId,
        error
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Facebook] Error in sendMessageToUser:", error);
    await logBotActivity(
      "message_send_error",
      "error",
      senderId,
      error instanceof Error ? error.message : "Unknown error"
    );
    return false;
  }
}

/**
 * Handle webhook POST request
 */
export async function handleWebhookPost(req: Request, res: Response) {
  const body = JSON.stringify(req.body);
  const signature = req.headers["x-hub-signature-256"] as string;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appSecret) {
    console.error("[Webhook] FACEBOOK_APP_SECRET not configured");
    res.status(500).send("Server error");
    return;
  }

  // Verify signature
  if (!verifyWebhookSignature(body, signature, appSecret)) {
    console.error("[Webhook] Invalid signature");
    res.status(403).send("Forbidden");
    return;
  }

  // Process webhook events
  const data = req.body;

  if (data.object === "page") {
    for (const entry of data.entry || []) {
      for (const messaging of entry.messaging || []) {
        if (messaging.message && messaging.sender) {
          const senderId = messaging.sender.id;
          const senderName =
            messaging.sender.name || `Usuario ${senderId.slice(0, 8)}`;
          const messageText = messaging.message.text;

          if (messageText) {
            // Handle the message
            const botResponse = await handleIncomingMessage(
              senderId,
              senderName,
              messageText
            );

            // Send response back to user
            await sendMessageToUser(senderId, botResponse);
          }
        }
      }
    }
  }

  // Always return 200 to acknowledge receipt
  res.status(200).send("ok");
}
