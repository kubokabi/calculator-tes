// hagematech-calc.js
class HagematechCalc extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' }); // Agar CSS aman/terisolasi
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .calc-container { border: 1px solid #ccc; padding: 10px; border-radius: 8px; width: 200px; font-family: sans-serif; background: #fff; }
            .display { width: 100%; height: 40px; margin-bottom: 10px; text-align: right; padding: 5px; box-sizing: border-box; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
            button { padding: 10px; cursor: pointer; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }
            button:active { background: #eee; }
            .op { background: #fca311; color: white; }
        </style>
        <div class="calc-container">
            <input type="text" class="display" id="screen" readonly placeholder="0">
            <div class="grid">
                <button onclick="this.getRootNode().host.append('7')">7</button>
                <button onclick="this.getRootNode().host.append('8')">8</button>
                <button onclick="this.getRootNode().host.append('9')">9</button>
                <button class="op" onclick="this.getRootNode().host.append('/')">/</button>
                <!-- Tambahkan tombol lainnya di sini -->
                <button style="grid-column: span 4;" class="op" onclick="this.getRootNode().host.calculate()">=</button>
            </div>
        </div>
        `;
    }

    append(val) {
        this.shadowRoot.getElementById('screen').value += val;
    }

    calculate() {
        const screen = this.shadowRoot.getElementById('screen');
        try {
            // Gunakan logika matematika sederhana atau library tambahan
            screen.value = eval(screen.value); 
        } catch {
            screen.value = 'Error';
        }
    }
}

// Mendaftarkan tag baru <hagematech-calc>
customElements.define('hagematech-calc', HagematechCalc);