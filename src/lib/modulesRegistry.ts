export interface NicheModule {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string;
  defaultRules: ConditionRule[];
  defaultTemplate: string;
}

export interface ConditionRule {
  id: string;
  name: string;
  whenKeyword: string;
  andCondition?: string;
  thenAction: string;
  elseAction?: string;
}

export const NICHE_MODULES_REGISTRY: NicheModule[] = [
  {
    id: "MOD_REALESTATE",
    name: "Real Estate & Property Matchmaker",
    industry: "Real Estate",
    description: "Property preference matchmaker, site visit calendar booking, and instant alert to sales reps.",
    icon: "Building",
    defaultRules: [
      {
        id: "r-re-1",
        name: "Property Price Inquiry",
        whenKeyword: "price, cost, rate, 2bhk, 3bhk, villa",
        andCondition: "Time is between 09:00 AM - 08:00 PM",
        thenAction: "Dispatch Pricing PDF + Prompt for Site Visit booking",
        elseAction: "Send Night Greeting + Log Callback Request for 9 AM",
      },
      {
        id: "r-re-2",
        name: "Site Visit Booking",
        whenKeyword: "site visit, visit, see property, tour",
        thenAction: "Display WhatsApp interactive calendar picker (Saturday / Sunday slots)",
      },
    ],
    defaultTemplate: "Welcome to Skyline Residences! Are you exploring 2BHK luxury apartments or 3BHK villas?",
  },
  {
    id: "MOD_ECOMMERCE",
    name: "Retail, Medical Store & E-Commerce",
    industry: "Retail & Commerce",
    description: "Mini WhatsApp product catalog, cart order intake, and dynamic UPI QR / payment links.",
    icon: "ShoppingBag",
    defaultRules: [
      {
        id: "r-ec-1",
        name: "Product Catalog Request",
        whenKeyword: "menu, catalog, products, items, buy",
        thenAction: "Display WhatsApp List Menu of categories and daily special offers",
      },
      {
        id: "r-ec-2",
        name: "Order Status Check",
        whenKeyword: "order status, where is my order, track",
        thenAction: "Query SQLite Orders table using customer phone number and reply status",
      },
    ],
    defaultTemplate: "Welcome to Metro Retail Store! Reply 'CATALOG' to view today's fresh deals.",
  },
  {
    id: "MOD_HEALTHCARE",
    name: "Healthcare, Doctor & Appointments",
    industry: "Healthcare",
    description: "Doctor slot booking, prescription photo uploader, and 2-hour automated reminders.",
    icon: "Stethoscope",
    defaultRules: [
      {
        id: "r-hc-1",
        name: "Doctor Consultation Booking",
        whenKeyword: "appointment, book doctor, consultation, doctor",
        thenAction: "Display Specialist List (Cardiology, Dermatology, General Physician)",
      },
      {
        id: "r-hc-2",
        name: "Emergency Triage Safety Guard",
        whenKeyword: "emergency, severe pain, bleeding, chest pain",
        thenAction: "ALERT: Instruct patient to dial 112 / visit ER immediately. Trigger staff alert.",
      },
    ],
    defaultTemplate: "Welcome to Apollo Wellness Center. How can our clinic care team assist you today?",
  },
  {
    id: "MOD_SUPPORT",
    name: "Helpdesk, Support & CSAT Surveys",
    industry: "Support",
    description: "Department triage routing, automated Ticket ID generation (#TICK-1024), and 1-5 star CSAT.",
    icon: "LifeBuoy",
    defaultRules: [
      {
        id: "r-sp-1",
        name: "Support Department Routing",
        whenKeyword: "help, support, issue, problem, broken",
        thenAction: "Issue Ticket ID (#TICK-[RANDOM]) and route to Tech Support Queue",
      },
      {
        id: "r-sp-2",
        name: "CSAT Feedback Trigger",
        whenKeyword: "#resolve, closed, ticket resolved",
        thenAction: "Send 1 to 5 Star interactive rating buttons to customer",
      },
    ],
    defaultTemplate: "Welcome to Nexus Support. Please describe your issue to generate a priority ticket.",
  },
  {
    id: "MOD_BROADCAST",
    name: "Smart Broadcast & Audience Tagging",
    industry: "Marketing",
    description: "Anti-ban randomized pacing broadcast engine with automated STOP opt-out compliance.",
    icon: "Radio",
    defaultRules: [
      {
        id: "r-bc-1",
        name: "Automated Opt-Out (STOP)",
        whenKeyword: "stop, unsubscribe, cancel, remove me",
        thenAction: "Immediately tag contact as UNSUBSCRIBED and blacklist from all campaigns",
      },
    ],
    defaultTemplate: "Exclusive VIP Member Alert: Enjoy 20% off all services this weekend with code VIP20.",
  },
  {
    id: "MOD_DOCS",
    name: "Dynamic Documents & Voice Note AI",
    industry: "General",
    description: "Instant PDF brochure auto-sender and voice note audio transcription to Gemini.",
    icon: "FileText",
    defaultRules: [
      {
        id: "r-dc-1",
        name: "Brochure Auto-Sender",
        whenKeyword: "brochure, pdf, document, specifications, floor plan",
        thenAction: "Dispatch official project PDF brochure with 2-second typing delay",
      },
    ],
    defaultTemplate: "Here is our official brochure with floor plans and price breakdown.",
  },
];
