
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(price / 100);
}

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .replace(/\bdamaed\b|\bdameged\b|\bdamged\b/g, "damaged")
    .replace(/\bloggedn\b|\blogin\b/g, "logged in")
    .replace(/\bim\b/g, "i am")
    .replace(/\s+/g, " ")
    .trim();
}

function isComplaint(message: string) {
  const text = normalizeMessage(message);

  return /\b(complaint|complain|damaged|damage|defective|broken|refund|wrong item|missing item|not received|not delivered|bad experience|unhappy with|report a problem|poor quality)\b/i.test(
    text
  );
}

function isOrderQuestion(message: string) {
  const text = normalizeMessage(message);

  return /\b(order|delivery|shipment|tracking|track my|paid for|payment status|logged in|signed in)\b/i.test(
    text
  );
}

function isProductQuestion(message: string) {
  return /\b(product|products|lip|lips|lipcare|lip care|soft|pink lips|scrub|balm|gloss|cream|mask|routine|ingredients|shade|price|recommend|recommendation|available|in stock)\b/i.test(
    normalizeMessage(message)
  );
}

function cleanReply(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
        .filter(
          (item: unknown): item is ChatMessage =>
            typeof item === "object" &&
            item !== null &&
            "role" in item &&
            "content" in item &&
            ((item as ChatMessage).role === "user" ||
              (item as ChatMessage).role === "assistant") &&
            typeof (item as ChatMessage).content === "string"
        )
        .slice(-8)
        .map((item: ChatMessage) => ({
          role: item.role,
          content: item.content.slice(0, 1000),
        }))
      : [];

    if (!message) {
      return NextResponse.json(
        { message: "Please enter a message." },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { message: "Please keep your message under 2,000 characters." },
        { status: 400 }
      );
    }

    const normalized = normalizeMessage(message);

    const previousUserMessages = history
      .filter((item) => item.role === "user")
      .map((item) => normalizeMessage(item.content));

    const previousAssistantMessages = history
      .filter((item) => item.role === "assistant")
      .map((item) => item.content.toLowerCase());

    const recentOrderContext = previousUserMessages
      .slice(-2)
      .some((item) => isOrderQuestion(item));

    const recentComplaintContext = previousAssistantMessages
      .slice(-2)
      .some((item) => item.includes("support ticket"));

    const complaintNow = isComplaint(normalized);

    // Only create a ticket when the current message reports a problem.
    // Follow-up messages won't create another ticket automatically.
    if (complaintNow) {
      const cookieStore = await cookies();
      const token = cookieStore.get("session")?.value;
      const session = token ? await verifySession(token) : null;

      let customerName: string | null = null;
      let customerEmail: string | null = null;
      let userId: string | null = null;

      if (session?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, name: true, email: true },
        });

        if (user) {
          userId = user.id;
          customerName = user.name;
          customerEmail = user.email;
        }
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          customerName,
          customerEmail,
          subject: message.replace(/\s+/g, " ").slice(0, 100),
          message,
          priority:
            /\b(refund|damaged|damage|broken|wrong item|missing item)\b/i.test(
              normalized
            )
              ? "HIGH"
              : "NORMAL",
        },
        select: { id: true, status: true },
      });

      return NextResponse.json({
        reply: `I'm sorry your product arrived damaged. 💗 I've created a support ticket with reference ${ticket.id}. Please keep the product and its packaging, and if possible, take a photo of the damage for our team. Our team will need to review your case before confirming a replacement or refund.`,
        ticketId: ticket.id,
        status: ticket.status,
      });
    }

    // A follow-up to a complaint should receive a contextual answer.
    if (
      recentComplaintContext &&
      /\b(but|already|currently|right|what now|next|logged in|signed in)\b/i.test(
        normalized
      )
    ) {
      return NextResponse.json({
        reply:
          "Yes, being logged in is fine. 💗 Your damaged-product complaint has already been recorded under the ticket reference shared above. You don't need to submit it again. Please keep your ticket reference and any photos of the damage for our support team.",
      });
    }

    // Fetch the current session for secure order lookup.
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    const session = token ? await verifySession(token) : null;

    const currentOrderQuestion = isOrderQuestion(normalized);
    const isOrderFollowUp =
      recentOrderContext &&
      /\b(but|already|currently|right|logged in|signed in|what about|which one|that order)\b/i.test(
        normalized
      );

    if (currentOrderQuestion || isOrderFollowUp) {
      if (!session?.userId) {
        return NextResponse.json({
          reply:
            "I can help check your orders, but I can't see an active sign-in session. Please open your Molippy account and sign in there, then try again. If you believe you're already signed in, refresh the page and send your message again. 💗",
        });
      }

      const orders = await prisma.order.findMany({
        where: { userId: session.userId },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (orders.length === 0) {
        return NextResponse.json({
          reply:
            "I couldn't find any orders linked to the account you're signed into. Please check whether you used another account at checkout, or contact our support team for help. 💗",
        });
      }

      const orderSummary = orders
        .map((order) => {
          const items = order.items
            .map((item) => `${item.product.name} × ${item.quantity}`)
            .join(", ");

          const statusExplanation: Record<string, string> = {
            PENDING:
              "Pending — the order is awaiting its next processing step. This status alone does not confirm dispatch.",
            PAID:
              "Paid — payment is recorded. This status alone does not confirm dispatch.",
            PROCESSING: "Processing — the order is being prepared.",
            SHIPPED: "Shipped — the order is marked as dispatched.",
            DELIVERED: "Delivered — the order is marked as delivered.",
            CANCELLED: "Cancelled — the order is marked as cancelled.",
          };

          return [
            `Order reference: ${order.id}`,
            `Status: ${statusExplanation[order.status] || order.status}`,
            `Total: ${formatPrice(order.total)}`,
            `Date: ${order.createdAt.toLocaleDateString("en-NG")}`,
            `Items: ${items || "No items listed"}`,
          ].join("\n");
        })
        .join("\n\n");

      return NextResponse.json({
        reply: `I've checked the orders linked to your signed-in account. Here are your latest orders:\n\n${orderSummary}\n\nIf you need help with a specific order, share its reference with our support team. 💗`,
      });
    }

    // Load actual products from the database.
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        name: true,
        description: true,
        price: true,
        stock: true,
        shade: true,
        flavor: true,
        ingredients: true,
        category: { select: { name: true } },
      },
      take: 30,
      orderBy: { name: "asc" },
    });

    const productContext = products
      .map((product) =>
        [
          `Name: ${product.name}`,
          `Category: ${product.category.name}`,
          `Price: ${formatPrice(product.price)}`,
          `Availability: ${product.stock > 0 ? "In stock" : "Out of stock"}`,
          product.description
            ? `Description: ${product.description}`
            : "",
          product.shade ? `Shade: ${product.shade}` : "",
          product.flavor ? `Flavor: ${product.flavor}` : "",
          product.ingredients ? `Ingredients: ${product.ingredients}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      )
      .join("\n\n---\n\n");

    // For product questions, answer with verified catalogue data directly.
    // This avoids AI inventing product names, prices, or ingredients.
    if (isProductQuestion(normalized)) {
      if (products.length === 0) {
        return NextResponse.json({
          reply:
            "I can't see any active products in our catalogue right now. Please check our Shop page or contact Molippy Support for help. 💗",
        });
      }

      const relevantProducts = products.filter((product) => {
        const searchable = [
          product.name,
          product.category.name,
          product.description || "",
          product.shade || "",
          product.flavor || "",
        ]
          .join(" ")
          .toLowerCase();

        const asksPink =
          /\bpink\b/i.test(normalized) &&
          /\bpink\b/i.test(searchable);

        const asksScrub = /\bscrub|exfoliat/i.test(normalized);
        const asksBalm = /\bbalm\b/i.test(normalized);
        const asksGloss = /\bgloss\b/i.test(normalized);
        const asksCream = /\bcream\b/i.test(normalized);
        const asksMask = /\bmask\b/i.test(normalized);
        const asksIngredients = /\bingredient/i.test(normalized);

        if (
          asksScrub ||
          asksBalm ||
          asksGloss ||
          asksCream ||
          asksMask ||
          asksIngredients ||
          asksPink
        ) {
          return (
            (asksScrub && /scrub/i.test(searchable)) ||
            (asksBalm && /balm/i.test(searchable)) ||
            (asksGloss && /gloss/i.test(searchable)) ||
            (asksCream && /cream/i.test(searchable)) ||
            (asksMask && /mask/i.test(searchable)) ||
            (asksIngredients &&
              product.ingredients !== null &&
              product.ingredients !== "") ||
            (asksPink && /\bpink\b/i.test(searchable))
          );
        }

        return true;
      });

      const list = (relevantProducts.length ? relevantProducts : products)
        .slice(0, 8)
        .map((product) => {
          const details = [
            `${product.name} — ${formatPrice(product.price)}`,
            product.stock > 0 ? "In stock" : "Currently out of stock",
            product.description || "",
            product.shade ? `Shade: ${product.shade}` : "",
            product.flavor ? `Flavor: ${product.flavor}` : "",
            product.ingredients ? `Ingredients: ${product.ingredients}` : "",
          ].filter(Boolean);

          return `• ${details.join("\n  ")}`;
        })
        .join("\n\n");

      const routineNote =
        /\b(soft|pink lips|routine|routine|recommend|recommendation)\b/i.test(
          normalized
        )
          ? "\n\nFor a simple routine, use only products according to their label directions. Avoid harsh or frequent exfoliation, and don't rely on a product to change your natural lip colour. I can only confirm benefits and ingredients that are listed in our catalogue."
          : "";

      return NextResponse.json({
        reply: `Here are the matching products currently listed in Molippy's catalogue:\n\n${list}${routineNote}\n\nWould you like help choosing between these options? 💗`,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");
      return NextResponse.json(
        { message: "Customer support is temporarily unavailable." },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      ...history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: `
You are Molippy Support, the friendly customer-care assistant for Molippy Products.

Use warm, natural, concise language. Use plain text only, without Markdown asterisks or headings. An occasional 💗 is fine.

The product catalogue below is the only source of truth for product names, prices, stock, shades, flavours, ingredients, and descriptions. Never invent or guess any product information. For product recommendations, use the website's catalogue and never claim a product will permanently turn someone's lips pink or cure a medical condition.

For questions about orders, payments, delivery, refunds, or complaints, do not invent account details or claim an action has happened unless the website has confirmed it. The website handles secure order lookups and support-ticket creation separately.

Never request passwords, API keys, or full payment-card details. If you do not know an answer, say so and recommend contacting Molippy Support.

PUBLIC PRODUCT CATALOGUE:
${productContext || "No active products are currently listed."}
        `.trim(),
        maxOutputTokens: 500,
      },
    });

    const reply = cleanReply(response.text || "");

    if (!reply) {
      throw new Error("Gemini returned an empty response.");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Molippy support error:", error);

    return NextResponse.json(
      {
        message:
          "Sorry, Molippy Support is temporarily unavailable. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
