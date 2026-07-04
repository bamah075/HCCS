// HCCS admin API client.
//
// Thin wrappers over the admin Route Handlers under `/api/...`. All privileged
// operations go through the server side (each route calls `requireAdmin()` or
// `requireStaff()` before touching the DB). The client never holds the service
// role key.
//
// Grouped by domain. Add new entries beneath the matching `// ---` section.

import { create_function } from "./api_util";

// --- Users ---
export const get_users = async (data) => create_function("/api/users/");
export const get_user_detail = async (data) => create_function("/api/users/detail/", data, 1);
export const update_user = async (data) => create_function("/api/users/update", data, 1);
export const get_user_subscriptions = async (data) => create_function("/api/users/subscriptions", data, 1);

// --- News ---
export const get_news = async () => create_function("/api/news");
export const create_news = async (data) => create_function("/api/news/create", data, 1);
export const update_news = async (data) => create_function("/api/news/update", data, 1);
export const delete_news = async (data) => create_function("/api/news/delete", data, 1);

// --- News Category ---
export const get_news_categories = async () => create_function("/api/news_category");
export const create_news_category = async (data) => create_function("/api/news_category/create", data, 1);
export const update_news_category = async (data) => create_function("/api/news_category/update", data, 1);
export const delete_news_category = async (data) => create_function("/api/news_category/delete", data, 1);

// --- Media ---
export const get_media = async () => create_function("/api/media");
export const create_media = async (data) => create_function("/api/media/create", data, 1);
export const update_media = async (data) => create_function("/api/media/update", data, 1);
export const delete_media = async (data) => create_function("/api/media/delete", data, 1);

// --- Resources ---
export const get_resources = async () => create_function("/api/resources");
export const create_resource = async (data) => create_function("/api/resources/create", data, 1);
export const update_resource = async (data) => create_function("/api/resources/update", data, 1);
export const delete_resource = async (data) => create_function("/api/resources/delete", data, 1);

// --- Services ---
export const get_services = async () => create_function("/api/services");
export const create_service = async (data) => create_function("/api/services/create", data, 1);
export const update_service = async (data) => create_function("/api/services/update", data, 1);
export const delete_service = async (data) => create_function("/api/services/delete", data, 1);
export const create_service_feature = async (data) => create_function("/api/services/features/create", data, 1);
export const delete_service_feature = async (data) => create_function("/api/services/features/delete", data, 1);
export const create_service_help = async (data) => create_function("/api/services/help/create", data, 1);
export const delete_service_help = async (data) => create_function("/api/services/help/delete", data, 1);

// --- Compliance Scan ---
export const get_compliance_scans = async () => create_function("/api/compliance_scan");
export const get_compliance_scans_details = async (data) => create_function("/api/compliance_scan/detail", data, 1);
export const save_compliance_scan_action_report = async (data) =>
    create_function("/api/compliance_scan/action_report", data, 1);
export const clear_compliance_scan_qr = async () => create_function("/api/compliance_scan/clear_qr", {}, 1);

// --- Mini Quiz Completions ---
export const get_mini_quiz_completions = async () => create_function("/api/mini_quiz_completions");
export const clear_mini_quiz_qr_code = async () => create_function("/api/mini_quiz_completions/clear_qr_code", {}, 1);

// --- Consultation ---
export const get_consultations = async () => create_function("/api/consultation");

// --- Subscription Plans ---
export const get_subscription_plans = async () => create_function("/api/subscription_plan");
export const create_subscription_plan = async (data) => create_function("/api/subscription_plan/create", data, 1);
export const update_subscription_plan = async (data) => create_function("/api/subscription_plan/update", data, 1);
export const delete_subscription_plan = async (data) => create_function("/api/subscription_plan/delete", data, 1);

// --- Translations ---
export const get_translations = async () => create_function("/api/translations");
export const update_translation = async (data) => create_function("/api/translations/update", data, 1);

// --- User Tier ---
export const get_user_tiers = async () => create_function("/api/user_tier");
export const create_user_tier = async (data) => create_function("/api/user_tier/create", data, 1);
export const update_user_tier = async (data) => create_function("/api/user_tier/update", data, 1);
export const delete_user_tier = async (data) => create_function("/api/user_tier/delete", data, 1);

// --- Orders ---
export const get_orders = async () => create_function("/api/orders");
export const create_order = async (data) => create_function("/api/orders/create", data, 1);
export const update_order = async (data) => create_function("/api/orders/update", data, 1);
export const delete_order = async (data) => create_function("/api/orders/delete", data, 1);
export const create_order_item = async (data) => create_function("/api/orders/items/create", data, 1);
export const delete_order_item = async (data) => create_function("/api/orders/items/delete", data, 1);
