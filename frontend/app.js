const result = document.getElementById("result");
const button = document.getElementById("ping");

async function pingBackend() {
  result.textContent = "Calling /api/hello…";
  try {
    const response = await fetch("/api/hello");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    result.textContent = data.message ?? JSON.stringify(data);
  } catch (error) {
    result.textContent = `Error: ${error.message}`;
  }
}

button.addEventListener("click", pingBackend);
pingBackend();
