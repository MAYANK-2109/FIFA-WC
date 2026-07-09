import axios from "axios";
import { parseSSEStream } from "./sse";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
    timeout: 90000,
});

export const getVenues = () => api.get("/venues").then((r) => r.data.venues);
export const getMatches = () => api.get("/matches").then((r) => r.data.matches);
export const getCrowd = (venueId) => api.get(`/crowd/${venueId}`).then((r) => r.data);
export const getSustainability = (venueId) => api.get(`/sustainability/${venueId}`).then((r) => r.data);
export const listIncidents = (venueId) => api.get(`/incidents`, { params: venueId ? { venue_id: venueId } : {} }).then((r) => r.data);
export const createIncident = (payload) => api.post(`/incidents`, payload).then((r) => r.data);
export const updateIncident = (id, status) => api.patch(`/incidents/${id}`, null, { params: { status } }).then((r) => r.data);
export const opsInsights = (venueId) => api.post(`/ops/insights`, { venue_id: venueId }).then((r) => r.data);
export const transportRecommend = (payload) => api.post(`/transport/recommend`, payload).then((r) => r.data);
export const accessibilityRoute = (payload) => api.post(`/accessibility/route`, payload).then((r) => r.data);
export const sustainabilityInsights = (venueId) => api.post(`/sustainability/insights`, { venue_id: venueId }).then((r) => r.data);
export const conciergeHistory = (sessionId) => api.get(`/concierge/history`, { params: { session_id: sessionId } }).then((r) => r.data);

/**
 * Stream concierge chat via SSE. Returns an abort function.
 * Delegates SSE parsing to `parseSSEStream` to keep complexity low.
 */
export function streamConcierge(payload, callbacks) {
    const controller = new AbortController();
    const body = {
        session_id: payload.sessionId,
        role: payload.role,
        language: payload.language,
        venue_id: payload.venueId,
        message: payload.message,
    };

    fetch(`${API}/concierge/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
        signal: controller.signal,
    })
        .then(async (res) => {
            if (!res.ok || !res.body) {
                callbacks.onError?.(new Error(`Concierge request failed: ${res.status}`));
                return;
            }
            await parseSSEStream(res.body.getReader(), callbacks);
        })
        .catch((e) => {
            if (e.name !== "AbortError") callbacks.onError?.(e);
        });

    return () => controller.abort();
}
