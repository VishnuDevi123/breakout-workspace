"use client";
import {useState, useEffect, useSyncExternalStore} from "react";
import {apiFetch} from "@/lib/execution-api";
import type {LiveState} from "@/types/breakout";

const RETRY_FIRST_MS = 1000;
const RETRY_MAX_MS = 10_000;
// The backend sends a heartbeat every 20 s; this much silence means the stream is dead.
const SILENCE_MS = 45_000;

/**
 * Whether the page's live stream is up: "idle" with no stream (no meeting screen),
 * "connecting" before its first event, "live", or "lost" while it reconnects.
 * `since` counts changes, so a notice can wait a moment on each new outage.
 */
export type LiveConnection = {status: "idle" | "connecting" | "live" | "lost"; since: number};

let connection: LiveConnection = {status: "idle", since: 0};
const connectionListeners = new Set<() => void>();

function setConnection(status: LiveConnection["status"]) {
    if (connection.status === status) return;
    connection = {status, since: connection.since + 1};
    for (const listener of connectionListeners) listener();
}

/** The live stream's connection, for the reconnect notice. */
export function useLiveConnection(): LiveConnection {
    return useSyncExternalStore(
        (listener) => {
            connectionListeners.add(listener);
            return () => connectionListeners.delete(listener);
        },
        () => connection,
        () => connection,
    );
}

/**
 * The meeting's live state, pushed over SSE. Read with fetch, not EventSource,
 * because the stream needs the app context header like every other route.
 */
export function useLiveState(parentUUID: string): { liveState: LiveState | null } {
    const [liveState, setLiveState] = useState<LiveState | null>(null);

    useEffect(() => {
        if (!parentUUID) return;
        const controller = new AbortController();
        void followLiveState(parentUUID, controller.signal, setLiveState);
        return () => {
            controller.abort();
            setConnection("idle");
        };
    }, [parentUUID]);

    return {liveState};
}

/**
 * Keeps one stream open until aborted, reconnecting after a drop or a long silence:
 * 1 s, then 2 s, up to 10 s. Each event restores the state, so nothing is missed.
 */
async function followLiveState(
    parentUUID: string,
    signal: AbortSignal,
    onState: (state: LiveState) => void,
): Promise<void> {
    const url = `/api/live/events?parentUUID=${encodeURIComponent(parentUUID)}`;
    let retryMs = RETRY_FIRST_MS;
    setConnection("connecting");
    while (!signal.aborted) {
        const attempt = new AbortController();
        const stop = () => attempt.abort();
        signal.addEventListener("abort", stop, {once: true});
        try {
            // apiFetch swaps an expired token for a fresh one on 401.
            const response = await apiFetch(url, {signal: attempt.signal, headers: {Accept: "text/event-stream"}});
            if (response.ok && response.body) {
                retryMs = RETRY_FIRST_MS;
                await readEvents(response.body, attempt, (state) => {
                    setConnection("live");
                    onState(state);
                });
            }
        } catch {
            // A dropped connection, a silent one or an abort; the loop decides which.
        } finally {
            signal.removeEventListener("abort", stop);
        }
        if (signal.aborted) return;
        if (connection.status === "live") setConnection("lost");
        await pause(retryMs, signal);
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    }
}

/** Reads `data:` events until the stream ends or stays silent too long. Each event is one LiveState. */
async function readEvents(
    body: ReadableStream<Uint8Array>,
    attempt: AbortController,
    onState: (state: LiveState) => void,
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let silence = setTimeout(() => attempt.abort(), SILENCE_MS);
    try {
        for (;;) {
            const {value, done} = await reader.read();
            if (done) return;
            // Any bytes, the heartbeat included, prove the stream is alive.
            clearTimeout(silence);
            silence = setTimeout(() => attempt.abort(), SILENCE_MS);
            buffer += decoder.decode(value, {stream: true});
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
                const data = event
                    .split("\n")
                    .filter((line) => line.startsWith("data:"))
                    .map((line) => line.slice("data:".length).trimStart())
                    .join("\n");
                if (data) onState(JSON.parse(data) as LiveState);
            }
        }
    } finally {
        clearTimeout(silence);
    }
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
        }, {once: true});
    });
}
