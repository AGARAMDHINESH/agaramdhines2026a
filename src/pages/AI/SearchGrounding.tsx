import React, { useState } from "react";
import { getGeminiAI } from "../../lib/gemini";

export default function SearchGrounding() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResult(null);
    setSources([]);

    try {
      const ai = getGeminiAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResult(response.text || "No response generated.");

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setSources(chunks.map((chunk) => chunk.web).filter(Boolean));
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching search data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        AI Search Grounding
      </h2>
      <p className="text-gray-600 mb-6">
        Powered by Gemini 3 Flash with Google Search. Ask questions to get
        up-to-date and accurate information.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g., What are the latest education trends in 2026?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={!query || loading}
              className="bg-[#1e3a8a] text-white px-6 py-2 rounded-md hover:bg-blue-800 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Answer</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {result}
            </div>

            {sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">
                  Sources
                </h4>
                <ul className="space-y-2">
                  {sources.map((source, idx) => (
                    <li key={idx} className="text-sm">
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        <span className="truncate">
                          {source.title || source.uri}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
