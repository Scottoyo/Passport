export type MarketingServiceType =
  | "featured_business"
  | "email_marketing"
  | "sms_marketing"
  | "sponsored_promotion"
  | "social_media_post"
  | "custom_campaign";

export interface MarketingService {
  key: MarketingServiceType;
  label: string;
  price: string;
  description: string;
  features: string[];
}

// Single source of truth for the 6 marketing services a business can
// request (matches the marketing_service_type enum, supabase/migrations/
// 0040_marketing_dashboard.sql) — used by both the business portal's
// request form and the admin marketing dashboard's category grouping.
export const MARKETING_SERVICES: MarketingService[] = [
  {
    key: "featured_business",
    label: "Featured Business",
    price: "$75.00",
    description: "Stand out with a featured placement across the platform.",
    features: ["Featured placement", "Increased visibility", "Priority exposure"],
  },
  {
    key: "email_marketing",
    label: "Email Marketing",
    price: "$50.00",
    description: "Reach Passport holders directly in their inbox.",
    features: ["Target Passport holders", "Reach upcoming visitors", "Campaign reporting"],
  },
  {
    key: "sms_marketing",
    label: "SMS Marketing",
    price: "$50.00",
    description: "Send targeted promotional messages to opted-in Passport holders.",
    features: ["Reach opted-in holders", "Target relevant audiences", "Campaign reporting"],
  },
  {
    key: "sponsored_promotion",
    label: "Sponsored Promotion",
    price: "$40.00",
    description: "Boost an existing promotion so it receives additional visibility.",
    features: ["Increased visibility", "Featured placement", "Performance metrics"],
  },
  {
    key: "social_media_post",
    label: "Social Media Post",
    price: "$60.00",
    description: "Put your business, event, or offer in front of the platform's social audience.",
    features: ["Dedicated social post", "Campaign scheduling", "Performance reporting"],
  },
  {
    key: "custom_campaign",
    label: "Custom Campaign",
    price: "Custom",
    description: "Looking for something bigger? Combine multiple channels into one campaign.",
    features: ["Featured placement", "Email", "SMS", "Sponsored promotions"],
  },
];
