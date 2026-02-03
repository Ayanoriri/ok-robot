/**
 * GPT-5 Nano via Replicate Proxy
 */

const REPLICATE_PROXY = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
const LLM_MODEL_VERSION = "openai/gpt-5.2";
const LLM_TIMEOUT_MS = 60000;

async function describeImage(base64ImageData) {
  if (!base64ImageData) {
    console.warn("No image data provided");
    return null;
  }

  const systemPrompt = `Take this image and add clear black text labels identifying each visible object at their approximate location in the image.
Use white background with black text only.
Return the modified image with text labels overlaid on objects.`;

  const payload = {
    version: LLM_MODEL_VERSION,
    input: {
      prompt: systemPrompt,
      image: base64ImageData, // Base64 encoded image
      num_inference_steps: 20,
      guidance_scale: 7.5,
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const response = await fetch(REPLICATE_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`LLM request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    let outputText = data.output && typeof data.output === "string" ? data.output :
                     data.output && Array.isArray(data.output) ? data.output.join("") : data.text || data;

    if (!outputText) {
      console.warn("No output text in LLM response");
      return null;
    }

    return outputText.trim();
  } catch (err) {
    console.warn("LLM request error:", err.message || err);
    return null;
  }
}

async function describeImageFromWebcam() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('webcam');

  // Capture the current frame from the webcam
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert the canvas content to base64 (without data URL prefix)
  const fullDataUrl = canvas.toDataURL('image/jpeg');
  const base64ImageData = fullDataUrl.split(',')[1];

  const payload = {
    version: LLM_MODEL_VERSION,
    input: {
      prompt: "Identify objects in this image and overlay text labels at their approximate locations.",
      image_input: [fullDataUrl]
    }
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const response = await fetch(REPLICATE_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`LLM request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // The output is an array of characters, join them into a string
    let outputText = Array.isArray(data.output) ? data.output.join("") : data.output;
    
    if (!outputText) {
      console.warn("No output in LLM response");
      return null;
    }

    console.log("Objects detected:", outputText);
    return outputText; // Return the text response (will be parsed by sketch.js)
  } catch (err) {
    console.warn("LLM request error:", err.message || err);
    return null;
  }
}

window.describeImage = describeImage;
window.describeImageFromWebcam = describeImageFromWebcam;
