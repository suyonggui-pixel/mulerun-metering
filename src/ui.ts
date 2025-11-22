// src/ui.ts

export const getMockupStudioHTML = (
  sessionId: string, 
  logInfo: Record<string, any> = {}
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mockup Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #111; color: white; font-family: sans-serif; overflow: hidden; }
    #editor-area { display: none; height: 100vh; flex-direction: column; }
    canvas { border: 1px solid #333; background: #222; max-height: 70vh; margin: 20px auto; }
    #action-loading { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 50; align-items: center; justify-content: center; flex-direction: column;}
    
    /* Toast 样式 */
    #toast {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;
      opacity: 0; transition: opacity 0.3s ease, top 0.3s ease; pointer-events: none; z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    #toast.show { opacity: 1; top: 40px; }
    #toast.success { background-color: #10B981; color: white; }
    #toast.error { background-color: #EF4444; color: white; }
  </style>
</head>
<body>

  <script>
    (function() {
      try {
        const serverData = ${JSON.stringify(logInfo)};
        if (serverData && Object.keys(serverData).length > 0) {
           console.group("🚀 Gateway Log");
           console.log(serverData);
           console.groupEnd();
        }
      } catch(e){}
    })();
  </script>

  <div id="action-loading">
    <div class="text-blue-400 text-xl font-bold animate-pulse">Processing Transaction...</div>
    <div class="text-gray-400 text-sm mt-2" id="loading-text"></div>
  </div>

  <div id="toast">Notification</div>

  <div id="check-layer" class="flex items-center justify-center h-screen">
    <div class="text-green-500 animate-pulse">Verifying Environment...</div>
  </div>

  <div id="editor-area">
    <header class="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center">
      <h1 class="font-bold text-lg">Mockup Studio</h1>
      <div class="text-xs text-gray-500 font-mono">Session: ${sessionId.substring(0, 8)}...</div>
    </header>
    
    <main class="flex-1 flex flex-col items-center justify-center p-4">
      <div class="mb-6 space-x-4 bg-gray-800 p-2 rounded-lg flex items-center">
        <label class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer text-sm">
          Upload
          <input type="file" id="imgUpload" accept="image/*" class="hidden">
        </label>
        
        <!-- 动态参数演示：不同按钮扣不同费用 -->
        <button onclick="applyFilter(20)" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">
          Simple Filter (20 pts)
        </button>

        <button onclick="applyFilter(50)" class="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm">
          Pro Filter (50 pts)
        </button>
        
        <button onclick="downloadImg()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
          Download
        </button>
      </div>
      <canvas id="canvas"></canvas>
    </main>
  </div>

  <script>
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.className = type + ' show';
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    (function checkEnvironment() {
        if (window.self === window.top) {
            window.location.href = "https://mulerun.com/";
        } else {
            document.getElementById('check-layer').style.display = 'none';
            document.getElementById('editor-area').style.display = 'flex';
        }
    })();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let currentImage = null;
    
    canvas.width = 600; canvas.height = 400;
    ctx.fillStyle = '#222'; ctx.fillRect(0,0,600,400);

    document.getElementById('imgUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                currentImage = img;
                const scale = Math.min(800 / img.width, 600 / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    // =====================================================
    // 核心修改：支持动态传入 Cost 参数
    // =====================================================
    async function applyFilter(cost) {
        if(!currentImage) {
            showToast("Please upload an image first.", "error");
            return;
        }

        const loading = document.getElementById('action-loading');
        document.getElementById('loading-text').innerText = \`Cost: \${cost} credits\`;
        loading.style.display = 'flex';

        try {
            // 1. URL 依然携带签名参数用于鉴权
            const apiUrl = '/api/action/filter' + window.location.search;

            // 2. 在 Body 中传递动态的业务参数 (Cost)
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cost: cost }) 
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Transaction failed');
            }

            console.log("Charge Success:", result);

            // Canvas 滤镜效果
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
            }
            ctx.putImageData(imageData, 0, 0);
            
            showToast(\`Filter applied! Cost: \${result.cost} credits.\`, "success");

        } catch (err) {
            console.error(err);
            showToast("Error: " + err.message, "error");
        } finally {
            loading.style.display = 'none';
        }
    }

    function downloadImg() {
        if(!currentImage) return;
        const link = document.createElement('a');
        link.download = 'mockup-edited.png';
        link.href = canvas.toDataURL();
        link.click();
    }
  </script>
</body>
</html>
`;