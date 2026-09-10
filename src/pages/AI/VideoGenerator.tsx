import React, { useState, useRef } from "react";
import { getGeminiAI } from "../../lib/gemini";

export default function VideoGenerator() {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const ai = getGeminiAI();
      const base64Data = image.split(",")[1];

      let operation = await ai.models.generateVideos({
        model: "veo-3.1-fast-generate-preview",
        prompt: prompt || "Animate this image",
        image: {
          imageBytes: base64Data,
          mimeType: "image/png",
        },
        config: {
          numberOfVideos: 1,
          resolution: "720p",
          aspectRatio: "16:9",
        },
      });

      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({
          operation: operation,
        });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const apiKey = process.env.GEMINI_API_KEY;
        const response = await fetch(downloadLink, {
          method: "GET",
          headers: {
            "x-goog-api-key": apiKey || "",
          },
        });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error(error);
      alert("Error generating video. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        AI Video Generator
      </h2>
      <p className="text-gray-600 mb-6">
        Powered by Veo. Upload a photo and generate a video animation.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Starting Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {image && (
          <div className="mt-4">
            <img
              src={image}
              alt="Original"
              className="max-h-64 object-contain rounded-md border"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Animation Prompt (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., A neon hologram of a cat driving at top speed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!image || loading}
          className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium disabled:opacity-50"
        >
          {loading
            ? "Generating Video (This may take a few minutes)..."
            : "Generate Video"}
        </button>

        {videoUrl && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Result</h3>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-md border"
            />
          </div>
        )}
      </div>
    </div>
  );
}
