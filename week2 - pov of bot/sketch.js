/**
 * Webcam input with LLM-based description output
 */

let video, canvas, ctx, output, status;
let isProcessing = false;
let lastProcessedTime = 0;
let currentObjects = [];
const PROCESS_INTERVAL = 30000;

async function init() {
  video = document.getElementById('webcam');
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  output = document.getElementById('output');
  status = document.getElementById('status');

  // Set canvas size to match camera area
  const cameraArea = document.getElementById('camera-area');
  canvas.width = cameraArea.clientWidth;
  canvas.height = cameraArea.clientHeight;

  // Request webcam access
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      processFrame();
    };
  } catch (err) {
    status.textContent = "Camera access denied";
    console.error(err);
  }

  window.addEventListener('resize', () => {
    const cameraArea = document.getElementById('camera-area');
    canvas.width = cameraArea.clientWidth;
    canvas.height = cameraArea.clientHeight;
  });
}

async function processFrame() {
  const now = Date.now();

  if (now - lastProcessedTime >= PROCESS_INTERVAL && !isProcessing) {
    lastProcessedTime = now;
    isProcessing = true;
    status.textContent = "Processing frame...";

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
    const response = await window.describeImageFromWebcam(imageData);

    if (response) {
      try {
        const svgMatch = response.match(/<text[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*>([^<]*)<\/text>/g);
        if (svgMatch?.length > 0) {
          currentObjects = svgMatch.map(textElem => {
            const xMatch = textElem.match(/x="([^"]*)"/);
            const yMatch = textElem.match(/y="([^"]*)"/);
            const textMatch = textElem.match(/>([^<]*)<\/text>/);
            return xMatch && yMatch && textMatch ? {
              text: textMatch[1].trim(),
              x: parseInt(xMatch[1]),
              y: parseInt(yMatch[1])
            } : null;
          }).filter(Boolean);
          
          if (currentObjects.length > 0) {
            status.textContent = `Labels ready (${currentObjects.length} objects)`;
          }
        } else {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            currentObjects = JSON.parse(jsonMatch[0]).labels || [];
            if (currentObjects.length > 0) {
              status.textContent = `Labels ready (${currentObjects.length} objects)`;
            }
          }
        }
      } catch (err) {
        console.warn("Parse error:", err);
      }
    }

    isProcessing = false;
  }

  setTimeout(processFrame, PROCESS_INTERVAL);
}

function draw() {
  // Always draw the video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Always draw labels
  if (currentObjects && currentObjects.length > 0) {
    drawLabelsFromJSON(currentObjects);
  }

  requestAnimationFrame(draw);
}

function drawLabelsFromJSON(labels) {
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'black';
  
  labels.forEach(({ x, y, text }) => {
    if (x && y && text) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  });
}

// Start when page loads
document.addEventListener('DOMContentLoaded', () => {
  init();
  draw();
});
