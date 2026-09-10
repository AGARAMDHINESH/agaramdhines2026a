import React, { useState, useRef } from "react";
import { getGeminiAI } from "../../lib/gemini";

export default function ImageEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
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

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    try {
      const ai = getGeminiAI();
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setResultImage(`data:image/png;base64,${base64EncodeString}`);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error editing image. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Image Editor</h2>
      <p className="text-gray-600 mb-6">
        Powered by Gemini 2.5 Flash Image. Upload an image and describe how you
        want to edit it.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image
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
            Edit Prompt
          </label>
          <input
            type="text"
            placeholder="e.g., Add a retro filter, Remove the person in the background"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleEdit}
          disabled={!image || !prompt || loading}
          className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? "Editing..." : "Edit Image"}
        </button>

        {resultImage && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Result</h3>
            <img
              src={resultImage}
              alt="Result"
              className="max-h-96 object-contain rounded-md border"
            />
          </div>
        )}
      </div>
    </div>
  );
}
