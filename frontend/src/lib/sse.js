/**
 * SSE stream parser — extracted for testability and to reduce cyclomatic complexity.
 * Consumes a Response.body reader and invokes callbacks for each event.
 */
export async function parseSSEStream(reader, { onDelta, onDone, onError }) {
    const decoder = new TextDecoder();
    let buffer = "";

    const handleChunk = (chunk) => {
        if (!chunk.trim()) return "continue";
        const { event, data } = parseSSEBlock(chunk);
        if (event === "done" || data === "[DONE]") return "done";
        if (event === "error") {
            onError?.(new Error(data));
            return "done";
        }
        if (data) onDelta?.(data);
        return "continue";
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        for (const chunk of parts) {
            if (handleChunk(chunk) === "done") {
                onDone?.();
                return;
            }
        }
    }
    onDone?.();
}

function parseSSEBlock(chunk) {
    let event = "message";
    const dataLines = [];
    for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    return { event, data: dataLines.join("\n") };
}
