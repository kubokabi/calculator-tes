class HagematechCalculator extends HTMLElement {
    static tagName = 'hagematech-calculator';
    static mathJsUrl = 'https://cdn.jsdelivr.net/npm/mathjs@15.2.0/lib/browser/math.js';
    static mathLoader = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.expression = '';
        this.previewValue = '';
        this.lastResult = 0;
        this.memory = null;
        this.guideOpen = false;

        this.angleMode = (this.getAttribute('angle-mode') || 'DEG').toUpperCase() === 'RAD'
            ? 'RAD'
            : 'DEG';

        this.theme = (this.getAttribute('theme') || 'dark').toLowerCase();
        this.gradient = (this.getAttribute('gradient') || 'aurora').toLowerCase();
        this.color = this.getAttribute('color') || '';

        this.gradients = ['aurora', 'sunset', 'ocean', 'forest', 'grape', 'gold'];
        this.precision = Number(this.getAttribute('precision') || 16);
        this.maxExpressionLength = Number(this.getAttribute('max-length') || 300);

        this.math = null;
        this.scope = new Map();

        this.handleKeyboard = this.handleKeyboard.bind(this);
    }

    async connectedCallback() {
        this.renderLoading();

        try {
            await this.loadMathJs();
            this.initMath();
            this.render();
            this.cacheElements();
            this.bindEvents();
            this.updateAll();
        } catch (error) {
            this.renderError(error);
        }
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeyboard);
    }

    async loadMathJs() {
        if (window.math) return window.math;

        if (!HagematechCalc.mathLoader) {
            HagematechCalc.mathLoader = new Promise((resolve, reject) => {
                const existingScript = document.querySelector('script[data-hagematech-mathjs="true"]');

                if (existingScript) {
                    existingScript.addEventListener('load', () => {
                        if (window.math) {
                            resolve(window.math);
                        } else {
                            reject(new Error('The calculator engine was loaded, but it is not available.'));
                        }
                    }, { once: true });

                    existingScript.addEventListener('error', () => {
                        reject(new Error('Unable to load the calculator engine.'));
                    }, { once: true });

                    return;
                }

                const script = document.createElement('script');
                script.src = HagematechCalc.mathJsUrl;
                script.async = true;
                script.defer = true;
                script.dataset.hagematechMathjs = 'true';

                script.onload = () => {
                    if (window.math) {
                        resolve(window.math);
                    } else {
                        reject(new Error('The calculator engine was loaded, but it is not available.'));
                    }
                };

                script.onerror = () => {
                    reject(new Error('Unable to connect to the calculator engine CDN.'));
                };

                document.head.appendChild(script);
            });
        }

        return HagematechCalc.mathLoader;
    }

    initMath() {
        const rootMath = window.math;

        this.math = rootMath.create
            ? rootMath.create(rootMath.all)
            : rootMath;

        try {
            this.math.config({
                number: 'BigNumber',
                precision: 64
            });
        } catch (_) { }

        this.installScope();
    }

    installScope() {
        const m = this.math;

        const valueToString = (value) => {
            if (value === null || value === undefined) return '0';
            if (typeof value === 'string') return value;
            if (typeof value?.toString === 'function') return value.toString();
            return String(value);
        };

        const toAngle = (value) => {
            if (this.angleMode === 'RAD') return value;
            return m.unit(`${valueToString(value)} deg`);
        };

        const fromAngle = (value) => {
            if (this.angleMode === 'RAD') return value;
            return m.multiply(m.divide(value, m.pi), 180);
        };

        this.scope.set('sin', (x) => m.sin(toAngle(x)));
        this.scope.set('cos', (x) => m.cos(toAngle(x)));
        this.scope.set('tan', (x) => m.tan(toAngle(x)));

        this.scope.set('asin', (x) => fromAngle(m.asin(x)));
        this.scope.set('acos', (x) => fromAngle(m.acos(x)));
        this.scope.set('atan', (x) => fromAngle(m.atan(x)));

        this.scope.set('ln', (x) => m.log(x));
        this.scope.set('log', (x) => m.log10(x));
        this.scope.set('log10', (x) => m.log10(x));
        this.scope.set('log2', (x) => m.log2(x));

        this.scope.set('sqrt', (x) => m.sqrt(x));
        this.scope.set('cbrt', (x) => m.nthRoot(x, 3));
        this.scope.set('root', (x, n) => m.nthRoot(x, n));

        this.scope.set('square', (x) => m.pow(x, 2));
        this.scope.set('cube', (x) => m.pow(x, 3));
        this.scope.set('inv', (x) => m.divide(1, x));

        this.scope.set('nCr', (n, r) => m.combinations(n, r));
        this.scope.set('nPr', (n, r) => m.permutations(n, r));

        this.scope.set('ans', this.lastResult || 0);
        this.scope.set('Ans', this.lastResult || 0);
        this.scope.set('mem', this.memory || 0);
        this.scope.set('Mem', this.memory || 0);
    }

    renderLoading() {
        this.syncStyleAttributesForLoading();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    width: 390px;
                    max-width: 100%;
                    font-family: Inter, Arial, sans-serif;
                    --loader-gradient: linear-gradient(145deg, #020617, #1e1b4b, #0f766e);
                    --loader-glow: rgba(34, 211, 238, .35);
                    --loader-border: rgba(255,255,255,.12);
                    --loader-screen: linear-gradient(180deg, #dbe8bd, #b7c99a);
                    --loader-screen-text: #17210f;
                }

                :host([gradient="sunset"]) {
                    --loader-gradient: linear-gradient(145deg, #431407, #7c2d12, #be123c);
                    --loader-glow: rgba(251, 146, 60, .45);
                }

                :host([gradient="ocean"]) {
                    --loader-gradient: linear-gradient(145deg, #082f49, #075985, #164e63);
                    --loader-glow: rgba(56, 189, 248, .42);
                }

                :host([gradient="forest"]) {
                    --loader-gradient: linear-gradient(145deg, #052e16, #14532d, #365314);
                    --loader-glow: rgba(74, 222, 128, .45);
                }

                :host([gradient="grape"]) {
                    --loader-gradient: linear-gradient(145deg, #2e1065, #581c87, #701a75);
                    --loader-glow: rgba(192, 132, 252, .45);
                }

                :host([gradient="gold"]) {
                    --loader-gradient: linear-gradient(145deg, #1c1917, #44403c, #78350f);
                    --loader-glow: rgba(251, 191, 36, .45);
                }

                * {
                    box-sizing: border-box;
                }

                .loader-card {
                    width: 100%;
                    padding: 18px;
                    border-radius: 28px;
                    background:
                        radial-gradient(circle at 20% 0%, rgba(255,255,255,.22), transparent 28%),
                        radial-gradient(circle at 90% 12%, var(--loader-glow), transparent 24%),
                        var(--loader-gradient);
                    border: 1px solid var(--loader-border);
                    box-shadow: 0 24px 60px rgba(0,0,0,.35);
                    color: #f9fafb;
                    overflow: hidden;
                }

                .loader-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .loader-brand {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }

                .loader-badge {
                    font-size: 11px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(255,255,255,.12);
                    border: 1px solid rgba(255,255,255,.18);
                    backdrop-filter: blur(10px);
                }

                .loader-screen {
                    min-height: 118px;
                    margin-bottom: 14px;
                    padding: 18px;
                    border-radius: 18px;
                    background: var(--loader-screen);
                    color: var(--loader-screen-text);
                    border: 3px inset rgba(0,0,0,.22);
                    box-shadow: inset 0 3px 10px rgba(0,0,0,.22);
                    display: grid;
                    place-items: center;
                    text-align: center;
                }

                .spinner {
                    width: 36px;
                    height: 36px;
                    border-radius: 999px;
                    border: 4px solid rgba(23,33,15,.18);
                    border-top-color: #17210f;
                    animation: spin .8s linear infinite;
                    margin: 0 auto 12px;
                }

                .loader-title {
                    font-size: 15px;
                    font-weight: 900;
                    margin-bottom: 4px;
                }

                .loader-text {
                    font-size: 12px;
                    font-weight: 700;
                    opacity: .7;
                }

                .loader-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 8px;
                }

                .loader-key {
                    height: 46px;
                    border-radius: 13px;
                    background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.18)), #1f2937;
                    border: 1px solid rgba(0,0,0,.35);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.12),
                        0 4px 0 rgba(0,0,0,.28);
                    opacity: .55;
                    animation: pulse 1.2s ease-in-out infinite;
                }

                .loader-key:nth-child(2n) { animation-delay: .1s; }
                .loader-key:nth-child(3n) { animation-delay: .2s; }
                .loader-key:nth-child(5n) { animation-delay: .3s; }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes pulse {
                    0%, 100% { opacity: .42; }
                    50% { opacity: .9; }
                }

                @media (max-width: 430px) {
                    :host { width: 100%; }

                    .loader-card {
                        border-radius: 22px;
                        padding: 14px;
                    }

                    .loader-key {
                        height: 44px;
                    }
                }
            </style>

            <div class="loader-card" role="status" aria-live="polite">
                <div class="loader-header">
                    <div class="loader-brand">Hagematech</div>
                    <div class="loader-badge">Scientific</div>
                </div>

                <div class="loader-screen">
                    <div>
                        <div class="spinner"></div>
                        <div class="loader-title">Preparing calculator</div>
                        <div class="loader-text">Loading calculation engine...</div>
                    </div>
                </div>

                <div class="loader-grid">
                    ${Array.from({ length: 25 }).map(() => '<div class="loader-key"></div>').join('')}
                </div>
            </div>
        `;
    }

    renderError(error) {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    width: 390px;
                    max-width: 100%;
                    font-family: Inter, Arial, sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .error-card {
                    width: 100%;
                    padding: 18px;
                    border-radius: 28px;
                    background:
                        radial-gradient(circle at 20% 0%, rgba(255,255,255,.16), transparent 28%),
                        radial-gradient(circle at 90% 12%, rgba(248,113,113,.28), transparent 24%),
                        linear-gradient(145deg, #450a0a, #7f1d1d, #111827);
                    border: 1px solid rgba(255,255,255,.12);
                    box-shadow: 0 24px 60px rgba(0,0,0,.35);
                    color: #ffffff;
                    overflow: hidden;
                }

                .error-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .error-brand {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }

                .error-badge {
                    font-size: 11px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(255,255,255,.12);
                    border: 1px solid rgba(255,255,255,.18);
                    backdrop-filter: blur(10px);
                }

                .error-screen {
                    min-height: 118px;
                    padding: 18px;
                    border-radius: 18px;
                    background: linear-gradient(180deg, #fee2e2, #fecaca);
                    color: #7f1d1d;
                    border: 3px inset rgba(0,0,0,.22);
                    box-shadow: inset 0 3px 10px rgba(0,0,0,.18);
                    display: grid;
                    place-items: center;
                    text-align: center;
                }

                .error-icon {
                    width: 38px;
                    height: 38px;
                    margin: 0 auto 10px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    background: #dc2626;
                    color: #ffffff;
                    font-size: 22px;
                    font-weight: 900;
                    box-shadow: 0 8px 18px rgba(220,38,38,.35);
                }

                .error-title {
                    font-size: 16px;
                    font-weight: 900;
                    margin-bottom: 6px;
                }

                .error-message {
                    max-width: 280px;
                    margin: 0 auto;
                    font-size: 12px;
                    font-weight: 700;
                    line-height: 1.5;
                    opacity: .82;
                }

                .error-help {
                    margin-top: 14px;
                    padding: 10px 12px;
                    border-radius: 14px;
                    background: rgba(255,255,255,.1);
                    border: 1px solid rgba(255,255,255,.12);
                    color: rgba(255,255,255,.78);
                    font-size: 12px;
                    line-height: 1.5;
                }

                .error-help strong {
                    color: #ffffff;
                }

                @media (max-width: 430px) {
                    :host { width: 100%; }

                    .error-card {
                        border-radius: 22px;
                        padding: 14px;
                    }
                }
            </style>

            <div class="error-card" role="alert">
                <div class="error-header">
                    <div class="error-brand">Hagematech</div>
                    <div class="error-badge">Scientific</div>
                </div>

                <div class="error-screen">
                    <div>
                        <div class="error-icon">!</div>
                        <div class="error-title">Calculator unavailable</div>
                        <div class="error-message">
                            ${this.escapeHtml(error?.message || 'The calculator could not be initialized.')}
                        </div>
                    </div>
                </div>

                <div class="error-help">
                    <strong>Suggestion:</strong> Please check your internet connection, CDN access, or refresh the page.
                </div>
            </div>
        `;
    }

    render() {
        this.syncStyleAttributes();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    width: 390px;
                    max-width: 100%;
                    font-family: Inter, Arial, sans-serif;

                    --body-gradient: linear-gradient(145deg, #020617, #1e1b4b, #0f766e);
                    --body-border: rgba(255,255,255,.12);

                    --screen-gradient: linear-gradient(180deg, #dbe8bd, #b7c99a);
                    --screen-text: #17210f;
                    --screen-muted: rgba(23,33,15,.65);

                    --key-bg: #374151;
                    --key-text: #f9fafb;
                    --key-border: rgba(0,0,0,.45);

                    --operator-gradient: linear-gradient(180deg, #22d3ee, #0e7490);
                    --equal-gradient: linear-gradient(180deg, #a78bfa, #7c3aed);
                    --danger-gradient: linear-gradient(180deg, #f87171, #dc2626);
                    --memory-gradient: linear-gradient(180deg, #38bdf8, #2563eb);
                    --fn-gradient: linear-gradient(180deg, #334155, #0f172a);

                    --brand-glow: rgba(34, 211, 238, .4);
                    --shadow: 0 24px 60px rgba(0,0,0,.35);
                }

                :host([gradient="aurora"]) {
                    --body-gradient: linear-gradient(145deg, #020617, #1e1b4b, #0f766e);
                    --operator-gradient: linear-gradient(180deg, #22d3ee, #0e7490);
                    --equal-gradient: linear-gradient(180deg, #a78bfa, #7c3aed);
                    --memory-gradient: linear-gradient(180deg, #38bdf8, #2563eb);
                    --fn-gradient: linear-gradient(180deg, #334155, #0f172a);
                    --brand-glow: rgba(34, 211, 238, .4);
                }

                :host([gradient="sunset"]) {
                    --body-gradient: linear-gradient(145deg, #431407, #7c2d12, #be123c);
                    --operator-gradient: linear-gradient(180deg, #fb923c, #ea580c);
                    --equal-gradient: linear-gradient(180deg, #f43f5e, #be123c);
                    --memory-gradient: linear-gradient(180deg, #facc15, #ca8a04);
                    --fn-gradient: linear-gradient(180deg, #78350f, #451a03);
                    --brand-glow: rgba(251, 146, 60, .45);
                }

                :host([gradient="ocean"]) {
                    --body-gradient: linear-gradient(145deg, #082f49, #075985, #164e63);
                    --operator-gradient: linear-gradient(180deg, #38bdf8, #0284c7);
                    --equal-gradient: linear-gradient(180deg, #2dd4bf, #0f766e);
                    --memory-gradient: linear-gradient(180deg, #67e8f9, #0891b2);
                    --fn-gradient: linear-gradient(180deg, #0f172a, #083344);
                    --brand-glow: rgba(56, 189, 248, .42);
                }

                :host([gradient="forest"]) {
                    --body-gradient: linear-gradient(145deg, #052e16, #14532d, #365314);
                    --operator-gradient: linear-gradient(180deg, #4ade80, #16a34a);
                    --equal-gradient: linear-gradient(180deg, #bef264, #65a30d);
                    --memory-gradient: linear-gradient(180deg, #86efac, #15803d);
                    --fn-gradient: linear-gradient(180deg, #064e3b, #052e16);
                    --brand-glow: rgba(74, 222, 128, .45);
                }

                :host([gradient="grape"]) {
                    --body-gradient: linear-gradient(145deg, #2e1065, #581c87, #701a75);
                    --operator-gradient: linear-gradient(180deg, #c084fc, #9333ea);
                    --equal-gradient: linear-gradient(180deg, #f0abfc, #c026d3);
                    --memory-gradient: linear-gradient(180deg, #a78bfa, #7c3aed);
                    --fn-gradient: linear-gradient(180deg, #3b0764, #1e1b4b);
                    --brand-glow: rgba(192, 132, 252, .45);
                }

                :host([gradient="gold"]) {
                    --body-gradient: linear-gradient(145deg, #1c1917, #44403c, #78350f);
                    --operator-gradient: linear-gradient(180deg, #fbbf24, #d97706);
                    --equal-gradient: linear-gradient(180deg, #fde047, #ca8a04);
                    --memory-gradient: linear-gradient(180deg, #fcd34d, #b45309);
                    --fn-gradient: linear-gradient(180deg, #292524, #1c1917);
                    --brand-glow: rgba(251, 191, 36, .45);
                }

                :host([theme="light"]) {
                    --body-border: rgba(15,23,42,.18);
                    --screen-gradient: linear-gradient(180deg, #edf7d4, #cbd8ad);
                    --screen-text: #17210f;
                    --screen-muted: rgba(23,33,15,.65);
                    --key-bg: #f8fafc;
                    --key-text: #111827;
                    --key-border: rgba(15,23,42,.18);
                    --shadow: 0 24px 60px rgba(15,23,42,.18);
                }

                * {
                    box-sizing: border-box;
                }

                .calculator {
                    position: relative;
                    width: 100%;
                    padding: 18px;
                    border-radius: 28px;
                    background:
                        radial-gradient(circle at 20% 0%, rgba(255,255,255,.22), transparent 28%),
                        radial-gradient(circle at 90% 12%, var(--brand-glow), transparent 24%),
                        var(--body-gradient);
                    border: 1px solid var(--body-border);
                    box-shadow: var(--shadow);
                    color: var(--key-text);
                    user-select: none;
                    overflow: hidden;
                }

                .brand {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    color: #f9fafb;
                }

                :host([theme="light"]) .brand {
                    color: #111827;
                }

                .brand-title {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }

                .brand-badge {
                    font-size: 11px;
                    padding: 4px 8px;
                    border-radius: 999px;
                    background: rgba(255,255,255,.12);
                    border: 1px solid rgba(255,255,255,.18);
                    backdrop-filter: blur(10px);
                }

                .screen {
                    margin-bottom: 14px;
                    padding: 12px;
                    border-radius: 18px;
                    background: var(--screen-gradient);
                    color: var(--screen-text);
                    border: 3px inset rgba(0,0,0,.22);
                    min-height: 118px;
                    box-shadow: inset 0 3px 10px rgba(0,0,0,.22);
                }

                .status-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 8px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--screen-muted);
                }

                .expression {
                    min-height: 32px;
                    padding: 4px 0;
                    overflow-x: auto;
                    white-space: nowrap;
                    text-align: right;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--screen-muted);
                }

                .main-result {
                    min-height: 46px;
                    overflow-x: auto;
                    white-space: nowrap;
                    text-align: right;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 31px;
                    line-height: 1.25;
                    font-weight: 900;
                    letter-spacing: -1px;
                }

                .main-result.error {
                    color: #991b1b;
                    font-size: 20px;
                    white-space: normal;
                    word-break: break-word;
                }

                .top-controls {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .keys {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 8px;
                }

                button {
                    appearance: none;
                    border: 0;
                    cursor: pointer;
                    font-family: inherit;
                    touch-action: manipulation;
                }

                .key {
                    min-height: 46px;
                    border-radius: 13px;
                    color: var(--key-text);
                    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.08)), var(--key-bg);
                    border: 1px solid var(--key-border);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.16),
                        0 4px 0 rgba(0,0,0,.28);
                    font-size: 15px;
                    font-weight: 900;
                    transition: transform .06s ease, box-shadow .06s ease, filter .12s ease;
                }

                .key:hover {
                    filter: brightness(1.08);
                }

                .key:active {
                    transform: translateY(3px);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.12),
                        0 1px 0 rgba(0,0,0,.28);
                }

                .small {
                    min-height: 34px;
                    border-radius: 10px;
                    font-size: 11px;
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,.16),
                        0 3px 0 rgba(0,0,0,.24);
                }

                .fn {
                    background: var(--fn-gradient);
                    font-size: 12px;
                    color: white;
                }

                .memory {
                    background: var(--memory-gradient);
                    font-size: 12px;
                    color: white;
                }

                .operator {
                    background: var(--operator-gradient);
                    color: white;
                    font-size: 18px;
                }

                .danger {
                    background: var(--danger-gradient);
                    color: white;
                }

                .equal {
                    background: var(--equal-gradient);
                    color: white;
                    font-size: 22px;
                    grid-row: span 2;
                }

                .zero {
                    grid-column: span 2;
                }

                .footer {
                    margin-top: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    color: rgba(255,255,255,.62);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }

                :host([theme="light"]) .footer {
                    color: rgba(15,23,42,.55);
                }

                .guide-link {
                    padding: 0;
                    background: transparent;
                    color: inherit;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                    text-decoration: underline;
                    text-underline-offset: 4px;
                    box-shadow: none;
                    border: 0;
                }

                .guide-link:hover {
                    color: #ffffff;
                    filter: none;
                }

                :host([theme="light"]) .guide-link:hover {
                    color: #111827;
                }

                .guide-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    padding: 14px;
                    background: rgba(2, 6, 23, .62);
                    backdrop-filter: blur(8px);
                    display: none;
                    align-items: center;
                    justify-content: center;
                }

                .guide-overlay.open {
                    display: flex;
                }

                .guide-book {
                    width: 100%;
                    max-height: 92%;
                    overflow: hidden;
                    border-radius: 22px;
                    background:
                        linear-gradient(90deg, rgba(0,0,0,.14), transparent 7%, transparent 93%, rgba(0,0,0,.14)),
                        linear-gradient(180deg, #fff7ed, #fef3c7);
                    color: #1f2937;
                    border: 1px solid rgba(120, 53, 15, .25);
                    box-shadow:
                        0 24px 60px rgba(0,0,0,.4),
                        inset 0 0 0 1px rgba(255,255,255,.6);
                    position: relative;
                }

                .guide-book::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 50%;
                    width: 1px;
                    background: linear-gradient(180deg, transparent, rgba(120, 53, 15, .28), transparent);
                }

                .guide-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(120, 53, 15, .18);
                    background: rgba(255,255,255,.35);
                }

                .guide-title {
                    display: grid;
                    gap: 2px;
                }

                .guide-title strong {
                    font-size: 15px;
                    font-weight: 1000;
                    letter-spacing: .02em;
                    color: #7c2d12;
                }

                .guide-title span {
                    font-size: 11px;
                    font-weight: 800;
                    color: #92400e;
                }

                .guide-close {
                    width: 34px;
                    height: 34px;
                    border-radius: 999px;
                    background: #7c2d12;
                    color: #ffffff;
                    font-size: 18px;
                    font-weight: 900;
                    box-shadow: 0 4px 0 rgba(0,0,0,.22);
                }

                .guide-pages {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    max-height: 520px;
                    overflow: auto;
                }

                .guide-page {
                    padding: 16px;
                    min-height: 420px;
                }

                .guide-page h3 {
                    margin: 0 0 10px;
                    color: #7c2d12;
                    font-size: 14px;
                    font-weight: 1000;
                    letter-spacing: .03em;
                    text-transform: uppercase;
                }

                .guide-section {
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed rgba(120, 53, 15, .2);
                }

                .guide-section:last-child {
                    border-bottom: 0;
                    margin-bottom: 0;
                }

                .guide-section h4 {
                    margin: 0 0 6px;
                    color: #1f2937;
                    font-size: 12px;
                    font-weight: 1000;
                }

                .guide-section p,
                .guide-section li {
                    color: #374151;
                    font-size: 11px;
                    font-weight: 700;
                    line-height: 1.55;
                }

                .guide-section p {
                    margin: 0;
                }

                .guide-section ul {
                    margin: 0;
                    padding-left: 16px;
                }

                .guide-section code {
                    display: inline-block;
                    padding: 1px 5px;
                    border-radius: 6px;
                    background: rgba(120, 53, 15, .1);
                    color: #7c2d12;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 10px;
                    font-weight: 900;
                }

                @media (max-width: 430px) {
                    :host {
                        width: 100%;
                    }

                    .calculator {
                        border-radius: 22px;
                        padding: 14px;
                    }

                    .key {
                        min-height: 44px;
                        font-size: 14px;
                    }

                    .fn,
                    .memory {
                        font-size: 11px;
                    }

                    .main-result {
                        font-size: 27px;
                    }

                    .guide-pages {
                        grid-template-columns: 1fr;
                        max-height: 480px;
                    }

                    .guide-book::before {
                        display: none;
                    }

                    .guide-page {
                        min-height: auto;
                    }
                }
            </style>

            <div class="calculator">
                <div class="brand">
                    <div class="brand-title">Hagematech</div>
                    <div class="brand-badge">Scientific</div>
                </div>

                <div class="screen">
                    <div class="status-row">
                        <span id="angleText">DEG</span>
                        <span id="memoryText"></span>
                        <span id="styleText">AURORA</span>
                    </div>

                    <div id="expressionText" class="expression"></div>
                    <div id="resultText" class="main-result">0</div>
                </div>

                <div class="top-controls">
                    ${this.button('MC', 'memory-clear', '', 'key small memory')}
                    ${this.button('MR', 'memory-recall', '', 'key small memory')}
                    ${this.button('M+', 'memory-plus', '', 'key small memory')}
                    ${this.button('M-', 'memory-minus', '', 'key small memory')}
                    ${this.button('MS', 'memory-save', '', 'key small memory')}

                    ${this.button('DEG/RAD', 'toggle-angle', '', 'key small fn')}
                    ${this.button('STYLE', 'cycle-gradient', '', 'key small fn')}
                    ${this.button('LIGHT', 'toggle-theme', '', 'key small fn')}
                    ${this.button('π', 'insert', 'pi', 'key small fn')}
                    ${this.button('e', 'insert', 'e', 'key small fn')}
                </div>

                <div class="keys">
                    ${this.button('sin', 'insert-function', 'sin(', 'key fn')}
                    ${this.button('cos', 'insert-function', 'cos(', 'key fn')}
                    ${this.button('tan', 'insert-function', 'tan(', 'key fn')}
                    ${this.button('log', 'insert-function', 'log(', 'key fn')}
                    ${this.button('ln', 'insert-function', 'ln(', 'key fn')}

                    ${this.button('asin', 'insert-function', 'asin(', 'key fn')}
                    ${this.button('acos', 'insert-function', 'acos(', 'key fn')}
                    ${this.button('atan', 'insert-function', 'atan(', 'key fn')}
                    ${this.button('x²', 'smart-square', '', 'key fn')}
                    ${this.button('xʸ', 'insert', '^', 'key fn')}

                    ${this.button('√', 'insert-function', 'sqrt(', 'key fn')}
                    ${this.button('∛', 'insert-function', 'cbrt(', 'key fn')}
                    ${this.button('1/x', 'smart-inverse', '', 'key fn')}
                    ${this.button('x!', 'smart-factorial', '', 'key fn')}
                    ${this.button('mod', 'insert', ' mod ', 'key fn')}

                    ${this.button('AC', 'clear-all', '', 'key danger')}
                    ${this.button('CE', 'clear-entry', '', 'key danger')}
                    ${this.button('⌫', 'backspace', '', 'key danger')}
                    ${this.button('(', 'insert', '(', 'key fn')}
                    ${this.button(')', 'insert', ')', 'key fn')}

                    ${this.button('7', 'insert', '7', 'key')}
                    ${this.button('8', 'insert', '8', 'key')}
                    ${this.button('9', 'insert', '9', 'key')}
                    ${this.button('÷', 'insert', '/', 'key operator')}
                    ${this.button('%', 'percent', '', 'key operator')}

                    ${this.button('4', 'insert', '4', 'key')}
                    ${this.button('5', 'insert', '5', 'key')}
                    ${this.button('6', 'insert', '6', 'key')}
                    ${this.button('×', 'insert', '*', 'key operator')}
                    ${this.button('±', 'toggle-sign', '', 'key operator')}

                    ${this.button('1', 'insert', '1', 'key')}
                    ${this.button('2', 'insert', '2', 'key')}
                    ${this.button('3', 'insert', '3', 'key')}
                    ${this.button('−', 'insert', '-', 'key operator')}
                    ${this.button('=', 'calculate', '', 'key equal')}

                    ${this.button('0', 'insert', '0', 'key zero')}
                    ${this.button('.', 'insert', '.', 'key')}
                    ${this.button('+', 'insert', '+', 'key operator')}
                </div>

                <div class="footer">
                    <button type="button" class="guide-link" data-action="toggle-guide">Guide Book</button>
                    <span>Enter =</span>
                </div>

                <div id="guideOverlay" class="guide-overlay">
                    <div class="guide-book">
                        <div class="guide-head">
                            <div class="guide-title">
                                <strong>Guide Book</strong>
                                <span>English & Indonesia</span>
                            </div>
                            <button type="button" class="guide-close" data-action="toggle-guide">×</button>
                        </div>

                        <div class="guide-pages">
                            <div class="guide-page">
                                <h3>English Guide</h3>

                                <div class="guide-section">
                                    <h4>Basic Calculation</h4>
                                    <ul>
                                        <li>Use <code>0-9</code> to enter numbers.</li>
                                        <li>Use <code>+</code>, <code>−</code>, <code>×</code>, and <code>÷</code> for arithmetic operations.</li>
                                        <li>Press <code>=</code> or <code>Enter</code> to calculate.</li>
                                        <li>Press <code>AC</code> to clear all, <code>CE</code> to clear current input, and <code>⌫</code> to delete one character.</li>
                                    </ul>
                                </div>

                                <div class="guide-section">
                                    <h4>Scientific Functions</h4>
                                    <ul>
                                        <li><code>√</code> inserts square root, for example <code>√(81)</code>.</li>
                                        <li><code>∛</code> inserts cube root, for example <code>∛(27)</code>.</li>
                                        <li><code>x²</code> squares the current expression.</li>
                                        <li><code>xʸ</code> adds power operator.</li>
                                        <li><code>sin</code>, <code>cos</code>, and <code>tan</code> follow the selected DEG/RAD mode.</li>
                                    </ul>
                                </div>

                                <div class="guide-section">
                                    <h4>Memory & Style</h4>
                                    <ul>
                                        <li><code>MS</code> saves the current value to memory.</li>
                                        <li><code>MR</code> recalls memory value.</li>
                                        <li><code>M+</code> adds current value to memory.</li>
                                        <li><code>M-</code> subtracts current value from memory.</li>
                                        <li><code>MC</code> clears memory.</li>
                                        <li><code>STYLE</code> changes gradient style.</li>
                                        <li><code>LIGHT</code> switches light or dark mode.</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="guide-page">
                                <h3>Panduan Indonesia</h3>

                                <div class="guide-section">
                                    <h4>Perhitungan Dasar</h4>
                                    <ul>
                                        <li>Gunakan <code>0-9</code> untuk memasukkan angka.</li>
                                        <li>Gunakan <code>+</code>, <code>−</code>, <code>×</code>, dan <code>÷</code> untuk operasi hitung.</li>
                                        <li>Tekan <code>=</code> atau <code>Enter</code> untuk menghitung.</li>
                                        <li>Tekan <code>AC</code> untuk hapus semua, <code>CE</code> untuk hapus input aktif, dan <code>⌫</code> untuk hapus satu karakter.</li>
                                    </ul>
                                </div>

                                <div class="guide-section">
                                    <h4>Fungsi Scientific</h4>
                                    <ul>
                                        <li><code>√</code> untuk akar kuadrat, contoh <code>√(81)</code>.</li>
                                        <li><code>∛</code> untuk akar pangkat tiga, contoh <code>∛(27)</code>.</li>
                                        <li><code>x²</code> untuk mengkuadratkan ekspresi aktif.</li>
                                        <li><code>xʸ</code> untuk pangkat bebas.</li>
                                        <li><code>sin</code>, <code>cos</code>, dan <code>tan</code> mengikuti mode DEG/RAD.</li>
                                    </ul>
                                </div>

                                <div class="guide-section">
                                    <h4>Memori & Tampilan</h4>
                                    <ul>
                                        <li><code>MS</code> menyimpan nilai aktif ke memori.</li>
                                        <li><code>MR</code> memanggil nilai dari memori.</li>
                                        <li><code>M+</code> menambahkan nilai aktif ke memori.</li>
                                        <li><code>M-</code> mengurangi memori dengan nilai aktif.</li>
                                        <li><code>MC</code> menghapus memori.</li>
                                        <li><code>STYLE</code> mengganti warna gradient.</li>
                                        <li><code>LIGHT</code> mengganti mode terang atau gelap.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    button(label, action, value, className) {
        return `
            <button
                type="button"
                class="${className}"
                data-action="${this.escapeHtml(action)}"
                data-value="${this.escapeHtml(value)}"
            >
                ${this.escapeHtml(label)}
            </button>
        `;
    }

    cacheElements() {
        this.expressionText = this.shadowRoot.getElementById('expressionText');
        this.resultText = this.shadowRoot.getElementById('resultText');
        this.angleText = this.shadowRoot.getElementById('angleText');
        this.memoryText = this.shadowRoot.getElementById('memoryText');
        this.styleText = this.shadowRoot.getElementById('styleText');
        this.guideOverlay = this.shadowRoot.getElementById('guideOverlay');
    }

    bindEvents() {
        this.shadowRoot.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const value = button.dataset.value || '';

            this.runAction(action, value);
        });

        this.shadowRoot.addEventListener('click', (event) => {
            if (event.target === this.guideOverlay) {
                this.closeGuide();
            }
        });

        document.addEventListener('keydown', this.handleKeyboard);
    }

    runAction(action, value) {
        switch (action) {
            case 'insert':
                this.insert(value);
                break;
            case 'insert-function':
                this.insertFunction(value);
                break;
            case 'smart-square':
                this.smartSquare();
                break;
            case 'smart-inverse':
                this.smartInverse();
                break;
            case 'smart-factorial':
                this.smartFactorial();
                break;
            case 'wrap':
                this.wrap(value);
                break;
            case 'clear-all':
                this.clearAll();
                break;
            case 'clear-entry':
                this.clearEntry();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'calculate':
                this.calculate();
                break;
            case 'percent':
                this.percent();
                break;
            case 'toggle-sign':
                this.toggleSign();
                break;
            case 'toggle-angle':
                this.toggleAngle();
                break;
            case 'toggle-theme':
                this.toggleTheme();
                break;
            case 'cycle-gradient':
                this.cycleGradient();
                break;
            case 'memory-clear':
                this.memoryClear();
                break;
            case 'memory-recall':
                this.memoryRecall();
                break;
            case 'memory-save':
                this.memorySave();
                break;
            case 'memory-plus':
                this.memoryPlus();
                break;
            case 'memory-minus':
                this.memoryMinus();
                break;
            case 'toggle-guide':
                this.toggleGuide();
                break;
        }
    }

    handleKeyboard(event) {
        if (this.guideOpen && event.key === 'Escape') {
            event.preventDefault();
            this.closeGuide();
            return;
        }

        if (this.guideOpen) return;

        const activeTag = document.activeElement?.tagName?.toLowerCase();

        if (['input', 'textarea', 'select'].includes(activeTag)) {
            return;
        }

        const allowed = '0123456789+-*/().';

        if (allowed.includes(event.key)) {
            event.preventDefault();
            this.insert(event.key);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.calculate();
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            this.backspace();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.clearAll();
            return;
        }

        if (event.key === '%') {
            event.preventDefault();
            this.percent();
        }
    }

    insert(value) {
        if (this.resultText?.classList.contains('error')) {
            this.expression = '';
        }

        this.expression += value;
        this.updateAll();
    }

    insertFunction(value) {
        if (this.resultText?.classList.contains('error')) {
            this.expression = '';
        }

        if (!this.expression) {
            this.expression = value;
            this.updateAll();
            return;
        }

        const lastChar = this.expression.slice(-1);

        if (/[0-9.)]/.test(lastChar)) {
            this.expression += `*${value}`;
        } else {
            this.expression += value;
        }

        this.updateAll();
    }

    wrap(pattern) {
        const current = this.expression || String(this.lastResult || '');
        this.expression = pattern.replace('|', current);
        this.updateAll();
    }

    smartSquare() {
        if (!this.expression.trim()) return;

        this.expression = `(${this.expression})^2`;
        this.updateAll();
    }

    smartInverse() {
        if (!this.expression.trim()) {
            this.expression = '1/(';
            this.updateAll();
            return;
        }

        this.expression = `1/(${this.expression})`;
        this.updateAll();
    }

    smartFactorial() {
        if (!this.expression.trim()) return;

        this.expression = `(${this.expression})!`;
        this.updateAll();
    }

    clearAll() {
        this.expression = '';
        this.previewValue = '';
        this.updateAll();
    }

    clearEntry() {
        this.expression = '';
        this.updateAll();
    }

    backspace() {
        this.expression = this.expression.slice(0, -1);
        this.updateAll();
    }

    percent() {
        if (!this.expression) return;

        const match = this.expression.match(/(\d+(\.\d+)?)$/);

        if (!match) {
            this.expression += '%';
            this.updateAll();
            return;
        }

        const number = match[0];
        this.expression = this.expression.slice(0, -number.length) + `(${number}/100)`;
        this.updateAll();
    }

    toggleSign() {
        if (!this.expression) {
            this.expression = '-';
            this.updateAll();
            return;
        }

        this.expression = `-(${this.expression})`;
        this.updateAll();
    }

    toggleAngle() {
        this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.installScope();
        this.updateAll();
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.syncStyleAttributes();
        this.updateAll();
    }

    cycleGradient() {
        if (this.color) {
            this.color = '';
            this.removeAttribute('color');
        }

        const currentIndex = this.gradients.indexOf(this.gradient);
        const nextIndex = currentIndex >= 0
            ? (currentIndex + 1) % this.gradients.length
            : 0;

        this.gradient = this.gradients[nextIndex];
        this.syncStyleAttributes();
        this.updateAll();
    }

    calculate() {
        if (!this.expression.trim()) return;

        if (this.hasIncompleteExpression(this.expression)) {
            this.showError('Invalid expression');
            return;
        }

        try {
            const originalExpression = this.expression;
            const result = this.evaluate(this.expression);
            const formatted = this.format(result);

            this.lastResult = result;
            this.expression = formatted;
            this.previewValue = formatted;

            this.scope.set('ans', result);
            this.scope.set('Ans', result);

            this.updateAll(false);
            this.dispatchCalculateEvent(originalExpression, formatted);
        } catch (error) {
            this.showError(error?.message || 'Calculation error');
        }
    }

    evaluate(expression) {
        if (expression.length > this.maxExpressionLength) {
            throw new Error('The expression is too long.');
        }

        this.scope.set('ans', this.lastResult || 0);
        this.scope.set('Ans', this.lastResult || 0);
        this.scope.set('mem', this.memory || 0);
        this.scope.set('Mem', this.memory || 0);

        const normalized = this.normalizeExpression(expression);
        return this.math.evaluate(normalized, this.scope);
    }

    normalizeExpression(expression) {
        return expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/π/g, 'pi');
    }

    preview() {
        if (!this.expression.trim()) {
            this.previewValue = '';
            return;
        }

        if (this.hasIncompleteExpression(this.expression)) {
            this.previewValue = '';
            return;
        }

        try {
            const result = this.evaluate(this.expression);
            this.previewValue = this.format(result);
        } catch (_) {
            this.previewValue = '';
        }
    }

    hasIncompleteExpression(expression) {
        const value = String(expression).trim();

        if (!value) return true;
        if (/[+\-*/^,(]$/.test(value)) return true;

        const emptyFunctionPatterns = [
            'sqrt()',
            'cbrt()',
            'log()',
            'ln()',
            'sin()',
            'cos()',
            'tan()',
            'asin()',
            'acos()',
            'atan()'
        ];

        if (emptyFunctionPatterns.some((pattern) => value.includes(pattern))) {
            return true;
        }

        const openCount = (value.match(/\(/g) || []).length;
        const closeCount = (value.match(/\)/g) || []).length;

        return closeCount > openCount;
    }

    format(value) {
        try {
            return this.math.format(value, {
                precision: this.precision,
                notation: 'auto',
                lowerExp: -9,
                upperExp: 12
            });
        } catch (_) {
            return value?.toString ? value.toString() : String(value);
        }
    }

    currentValue() {
        if (this.expression.trim() && !this.hasIncompleteExpression(this.expression)) {
            return this.evaluate(this.expression);
        }

        return this.lastResult || 0;
    }

    memoryClear() {
        this.memory = null;
        this.updateAll();
    }

    memoryRecall() {
        if (this.memory === null) return;

        const value = this.format(this.memory);

        if (this.expression && /[0-9.)]$/.test(this.expression)) {
            this.expression += `*${value}`;
        } else {
            this.expression += value;
        }

        this.updateAll();
    }

    memorySave() {
        try {
            this.memory = this.currentValue();
            this.updateAll();
        } catch (error) {
            this.showError(error?.message || 'Memory error');
        }
    }

    memoryPlus() {
        try {
            const value = this.currentValue();
            this.memory = this.memory === null ? value : this.math.add(this.memory, value);
            this.updateAll();
        } catch (error) {
            this.showError(error?.message || 'Memory error');
        }
    }

    memoryMinus() {
        try {
            const value = this.currentValue();
            this.memory = this.memory === null ? this.math.unaryMinus(value) : this.math.subtract(this.memory, value);
            this.updateAll();
        } catch (error) {
            this.showError(error?.message || 'Memory error');
        }
    }

    toDisplayMath(value) {
        if (value === null || value === undefined) return '';

        return String(value)
            .replace(/sqrt\(/g, '√(')
            .replace(/cbrt\(/g, '∛(')
            .replace(/root\(/g, 'ⁿ√(')
            .replace(/pi/g, 'π')
            .replace(/Infinity/g, '∞')
            .replace(/\*/g, '×')
            .replace(/\//g, '÷')
            .replace(/-/g, '−')
            .replace(/\^2/g, '²')
            .replace(/\^3/g, '³')
            .replace(/\^4/g, '⁴')
            .replace(/\^5/g, '⁵')
            .replace(/\^6/g, '⁶')
            .replace(/\^7/g, '⁷')
            .replace(/\^8/g, '⁸')
            .replace(/\^9/g, '⁹')
            .replace(/\^0/g, '⁰')
            .replace(/ mod /g, ' mod ')
            .replace(/nCr/g, 'C')
            .replace(/nPr/g, 'P');
    }

    updateAll(updatePreview = true) {
        if (updatePreview) {
            this.preview();
        }

        const displayExpression = this.toDisplayMath(this.expression || '');
        const displayResult = this.toDisplayMath(this.previewValue || this.expression || '0');

        if (this.expressionText) {
            this.expressionText.textContent = displayExpression;
        }

        if (this.resultText) {
            this.resultText.classList.remove('error');
            this.resultText.textContent = displayResult;
        }

        if (this.angleText) {
            this.angleText.textContent = this.angleMode;
        }

        if (this.memoryText) {
            this.memoryText.textContent = this.memory === null ? '' : 'M';
        }

        if (this.styleText) {
            this.styleText.textContent = this.color ? this.color.toUpperCase() : this.gradient.toUpperCase();
        }

        if (this.guideOverlay) {
            this.guideOverlay.classList.toggle('open', this.guideOpen);
        }
    }

    showError(message) {
        if (!this.resultText) return;

        this.resultText.classList.add('error');

        const text = String(message || '').toLowerCase();

        if (
            text.includes('unexpected type of argument') ||
            text.includes('unexpected end') ||
            text.includes('syntax error') ||
            text.includes('undefined symbol') ||
            text.includes('parenthesis') ||
            text.includes('expected') ||
            text.includes('invalid expression')
        ) {
            this.resultText.textContent = 'Invalid expression';
            return;
        }

        if (
            text.includes('divide by zero') ||
            text.includes('division by zero')
        ) {
            this.resultText.textContent = 'Cannot divide by zero';
            return;
        }

        if (text.includes('too long')) {
            this.resultText.textContent = 'Expression is too long';
            return;
        }

        this.resultText.textContent = 'Calculation error';
    }

    toggleGuide() {
        this.guideOpen = !this.guideOpen;
        this.updateAll(false);
    }

    closeGuide() {
        this.guideOpen = false;
        this.updateAll(false);
    }

    dispatchCalculateEvent(expression, formatted) {
        this.dispatchEvent(new CustomEvent('calculate', {
            detail: {
                expression,
                result: formatted
            },
            bubbles: true,
            composed: true
        }));
    }

    syncStyleAttributesForLoading() {
        this.color = this.getAttribute('color') || this.color || '';
        this.gradient = (this.getAttribute('gradient') || this.gradient || 'aurora').toLowerCase();

        if (!this.gradients.includes(this.gradient)) {
            this.gradient = 'aurora';
        }

        this.setAttribute('theme', this.theme);
        this.setAttribute('gradient', this.gradient);

        if (this.isHexColor(this.color)) {
            const base = this.normalizeHex(this.color);
            const dark1 = this.shadeHex(base, -55);
            const deep = this.shadeHex(base, -70);

            this.setAttribute('color', base);
            this.style.setProperty('--loader-gradient', `linear-gradient(145deg, ${deep}, ${dark1}, ${base})`);
            this.style.setProperty('--loader-glow', this.hexToRgba(base, 0.45));
        }
    }

    syncStyleAttributes() {
        this.color = this.getAttribute('color') || this.color || '';
        this.gradient = (this.getAttribute('gradient') || this.gradient || 'aurora').toLowerCase();

        if (!this.gradients.includes(this.gradient)) {
            this.gradient = 'aurora';
        }

        this.setAttribute('theme', this.theme);
        this.setAttribute('gradient', this.gradient);

        this.style.removeProperty('--body-gradient');
        this.style.removeProperty('--operator-gradient');
        this.style.removeProperty('--equal-gradient');
        this.style.removeProperty('--memory-gradient');
        this.style.removeProperty('--fn-gradient');
        this.style.removeProperty('--brand-glow');

        if (this.isHexColor(this.color)) {
            const base = this.normalizeHex(this.color);
            const dark1 = this.shadeHex(base, -55);
            const dark2 = this.shadeHex(base, -35);
            const dark3 = this.shadeHex(base, -15);
            const light1 = this.shadeHex(base, 30);
            const light2 = this.shadeHex(base, 12);
            const deep = this.shadeHex(base, -70);

            this.setAttribute('color', base);
            this.style.setProperty('--body-gradient', `linear-gradient(145deg, ${deep}, ${dark1}, ${base})`);
            this.style.setProperty('--operator-gradient', `linear-gradient(180deg, ${light1}, ${base})`);
            this.style.setProperty('--equal-gradient', `linear-gradient(180deg, ${light2}, ${dark2})`);
            this.style.setProperty('--memory-gradient', `linear-gradient(180deg, ${light1}, ${dark3})`);
            this.style.setProperty('--fn-gradient', `linear-gradient(180deg, ${dark2}, ${deep})`);
            this.style.setProperty('--brand-glow', this.hexToRgba(base, 0.45));
        } else {
            this.removeAttribute('color');
            this.color = '';
        }
    }

    isHexColor(value) {
        return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(String(value).trim());
    }

    normalizeHex(value) {
        let hex = String(value).trim();

        if (/^#[0-9A-F]{3}$/i.test(hex)) {
            hex = '#' + hex.slice(1).split('').map((char) => char + char).join('');
        }

        return hex.toLowerCase();
    }

    shadeHex(hex, percent) {
        const normalized = this.normalizeHex(hex).replace('#', '');
        const num = parseInt(normalized, 16);

        let r = (num >> 16) & 255;
        let g = (num >> 8) & 255;
        let b = num & 255;

        r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
        g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
        b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));

        return '#' + [r, g, b]
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    }

    hexToRgba(hex, alpha) {
        const normalized = this.normalizeHex(hex).replace('#', '');
        const num = parseInt(normalized, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

if (!customElements.get(HagematechCalc.tagName)) {
    customElements.define(HagematechCalc.tagName, HagematechCalc);
}