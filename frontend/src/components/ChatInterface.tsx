import { useState, useRef, useEffect, useCallback, type DragEvent } from "react";
import { searchProducts } from "../services/api";
import { chatStream } from "../services/chatStream";
import type { SearchResult } from "../types";
import ProductCard from "./ProductCard";

const MAX_SIZE = 5 * 1024 * 1024;

interface Message {
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
  imagePreview?: string;
}

const SUGGESTIONS = [
  "Red wireless headphones under $100",
  "Ergonomic office chair leather",
  "Waterproof bluetooth speaker",
];

function BotIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-start gap-3">
      <BotIcon />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_SIZE) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processFile(file);
          return;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processFile]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    const image = imageBase64;
    if (!text && !image) return;

    const userMsg: Message = { role: "user", content: text, imagePreview: image || undefined };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImageBase64("");
    setLoading(true);

    try {
      const results = await searchProducts(text || undefined, image || undefined);
      const assistantMsg: Message = { role: "assistant", content: "", results };
      setMessages((prev) => [...prev, assistantMsg]);

      let accumulated = "";
      for await (const token of chatStream(text || undefined, image || undefined)) {
        accumulated += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sorry, something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full relative bg-gray-50"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-indigo-500/10 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-5 rounded-2xl shadow-lg text-center">
            <svg className="w-10 h-10 text-indigo-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-indigo-700 font-semibold">Drop your image here</p>
            <p className="text-gray-400 text-sm mt-1">We'll find visually similar products</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Find the perfect product</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm leading-relaxed">
              Describe what you're looking for, or drop a product photo and our AI will find the best matches.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-full hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <BotIcon />}
            <div className={`max-w-[85%] ${msg.role === "user" ? "space-y-2" : "space-y-3"}`}>
              {msg.role === "user" && (
                <div className="flex flex-col items-end gap-2">
                  {msg.imagePreview && (
                    <img
                      src={`data:image/jpeg;base64,${msg.imagePreview}`}
                      alt="Uploaded"
                      className="max-h-32 rounded-xl border border-indigo-200 shadow-sm"
                    />
                  )}
                  {msg.content && (
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              )}
              {msg.role === "assistant" && (
                <>
                  {msg.content && (
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-gray-800 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}
                  {msg.results && msg.results.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {msg.results.map((r) => (
                        <ProductCard key={r.product.id} result={r} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && <LoadingDots />}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        {imageBase64 && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="relative inline-block">
              <img
                src={`data:image/jpeg;base64,${imageBase64}`}
                alt="Preview"
                className="h-14 rounded-lg border border-gray-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setImageBase64("")}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600 shadow"
              >
                ✕
              </button>
            </div>
            <span className="text-xs text-gray-400">Image ready — add a query or send directly</span>
          </div>
        )}
        <div className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <label
            className={`p-1.5 rounded-xl cursor-pointer transition-colors shrink-0 ${
              imageBase64 ? "text-indigo-600 bg-indigo-100" : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
            }`}
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
                e.target.value = "";
              }}
            />
          </label>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            placeholder="Describe the product you're looking for..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50 py-1"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || (!input.trim() && !imageBase64)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
