/*! Datasetless embed loader · made by Abhipriyo · MIT
 *
 * <script src="https://YOUR-DATASETLESS-HOST/embed.js" async></script>
 * <datasetless-dashboard source="/api/reports/data" metrics="/metrics.json"></datasetless-dashboard>
 *
 * This file runs in the host page. It fetches data with the host's own session
 * (so the host's login decides what each user sees), then hands the data to the
 * dashboard iframe inside the same browser. Nothing is sent to Datasetless.
 */
(function () {
  'use strict';
  if (window.Datasetless && window.Datasetless.version) return;

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('.', script.src).href : new URL('./', location.href).href;
  var FRAME_ORIGIN = new URL(BASE).origin;
  var ATTRS = ['source', 'metrics', 'format', 'title', 'theme', 'accent', 'license', 'ai-endpoint', 'sql', 'exports', 'refresh', 'share', 'sample', 'height', 'credentials'];

  function detectFormat(url, contentType, bytes) {
    var ct = (contentType || '').toLowerCase();
    if (/parquet/.test(ct)) return 'parquet';
    if (/json/.test(ct)) return 'json';
    if (/spreadsheet|excel/.test(ct)) return 'xlsx';
    var m = String(url || '').toLowerCase().split('?')[0].match(/\.(csv|tsv|json|ndjson|parquet|xlsx|xls)$/);
    if (m) return m[1] === 'tsv' ? 'csv' : m[1];
    if (bytes && bytes.length > 3) {
      if (bytes[0] === 0x50 && bytes[1] === 0x41 && bytes[2] === 0x52 && bytes[3] === 0x31) return 'parquet'; // PAR1
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'xlsx'; // zip
      var c = String.fromCharCode(bytes[0]);
      if (c === '[' || c === '{') return 'json';
    }
    return 'csv';
  }

  class DatasetlessDashboard extends HTMLElement {
    static get observedAttributes() { return ['source', 'metrics', 'share', 'sample', 'theme', 'accent', 'title']; }
  }

  var P = DatasetlessDashboard.prototype;

  P.connectedCallback = function () {
    if (this._frame) return;
    this.style.display = this.style.display || 'block';
    var frame = document.createElement('iframe');
    frame.title = this.getAttribute('title') || 'Dashboard';
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('allow', 'clipboard-write');
    frame.style.cssText = 'width:100%;border:0;display:block;color-scheme:normal;background:transparent;';
    var fixed = this.getAttribute('height');
    frame.style.height = fixed && fixed !== 'auto' ? (/^\d+$/.test(fixed) ? fixed + 'px' : fixed) : '640px';
    var share = this.getAttribute('share');
    var sample = this.getAttribute('sample');
    frame.src = BASE + 'embed.html' + (share ? '#/d/' + share : '') + (sample ? '?sample=' + encodeURIComponent(sample) : '');
    this._frame = frame;
    this._ready = false;
    this._onMessage = this._handleMessage.bind(this);
    window.addEventListener('message', this._onMessage);
    this.appendChild(frame);
    var every = parseInt(this.getAttribute('refresh') || '0', 10);
    if (every >= 10) { var self = this; this._timer = setInterval(function () { self.reload(); }, every * 1000); }
  };

  P.disconnectedCallback = function () {
    window.removeEventListener('message', this._onMessage);
    clearInterval(this._timer);
    if (this._frame) this._frame.remove();
    this._frame = null;
  };

  P.attributeChangedCallback = function (name, oldV, newV) {
    if (!this._frame || oldV === newV) return;
    // Rebuild once after a batch of changes (e.g. switching customer and theme together).
    var self = this;
    clearTimeout(this._rebuild);
    this._rebuild = setTimeout(function () {
      if (!self.isConnected) return;
      self.disconnectedCallback();
      self.connectedCallback();
    }, 0);
  };

  P._config = function () {
    var a = this, cfg = {
      title: a.getAttribute('title') || undefined,
      theme: a.getAttribute('theme') || 'auto',
      accent: a.getAttribute('accent') || undefined,
      license: a.getAttribute('license') || undefined,
      sql: a.hasAttribute('sql') && a.getAttribute('sql') !== 'false',
      exports: a.getAttribute('exports') !== 'false',
      hasAI: !!a.getAttribute('ai-endpoint'),
      sourceLabel: a.getAttribute('source-label') || undefined,
    };
    return cfg;
  };

  P._fetchInit = function () {
    var self = this;
    var opts = Object.assign({ credentials: this.getAttribute('credentials') || 'same-origin' }, this.requestInit || {});
    var tasks = [];
    var src = this.getAttribute('source');
    var metricsUrl = this.getAttribute('metrics');
    var result = { data: null, format: this.getAttribute('format') || null, metrics: this.metrics || null };
    if (this._data !== undefined) { result.data = this._data; result.format = this._format || result.format; }
    else if (src) {
      tasks.push(fetch(src, opts).then(function (r) {
        if (!r.ok) throw new Error('Could not load data from ' + src + ' (' + r.status + ').');
        var ct = r.headers.get('content-type');
        return r.arrayBuffer().then(function (buf) {
          var bytes = new Uint8Array(buf);
          result.format = result.format || detectFormat(r.url || src, ct, bytes);
          result.data = buf;
        });
      }));
    }
    if (!result.metrics && metricsUrl) {
      tasks.push(fetch(metricsUrl, opts).then(function (r) {
        if (!r.ok) throw new Error('Could not load metrics from ' + metricsUrl + '.');
        return r.json();
      }).then(function (j) { result.metrics = j; }));
    }
    return Promise.all(tasks).then(function () { return result; });
  };

  P._send = function (type, payload, transfer) {
    if (!this._frame || !this._frame.contentWindow) return;
    var msg = Object.assign({ ds: 1, type: type }, payload);
    try { this._frame.contentWindow.postMessage(msg, FRAME_ORIGIN, transfer || []); }
    catch (e) { this._frame.contentWindow.postMessage(msg, FRAME_ORIGIN); }
  };

  P._handleMessage = function (e) {
    if (!this._frame || e.source !== this._frame.contentWindow || e.origin !== FRAME_ORIGIN) return;
    var m = e.data || {};
    if (m.ds !== 1) return;
    var self = this;
    if (m.type === 'hello') {
      this._ready = true;
      if (this.getAttribute('share') || this.getAttribute('sample')) return;
      this._fetchInit().then(function (r) {
        var cfg = self._config();
        cfg.metrics = r.metrics;
        if (r.data == null) { self._emit('error', { message: 'No data: set the "source" attribute or call el.load(rows).' }); return; }
        var isBuf = r.data instanceof ArrayBuffer;
        self._send('init', { config: cfg, data: r.data, format: r.format }, isBuf ? [r.data] : []);
      }).catch(function (err) {
        self._emit('error', { message: err.message });
        self._send('init', { config: self._config(), data: [], format: 'json' });
      });
    } else if (m.type === 'height') {
      var fixed = this.getAttribute('height');
      if (!fixed || fixed === 'auto') this._frame.style.height = Math.max(200, m.value) + 'px';
    } else if (m.type === 'event') {
      this._emit(m.name, m.detail);
    } else if (m.type === 'ai') {
      var url = this.getAttribute('ai-endpoint');
      if (!url) return this._send('ai:result', { id: m.id, error: 'No ai-endpoint configured.' });
      var opts = Object.assign({ credentials: this.getAttribute('credentials') || 'same-origin' }, this.requestInit || {});
      opts.method = 'POST';
      opts.headers = Object.assign({ 'content-type': 'application/json' }, (this.requestInit && this.requestInit.headers) || {});
      opts.body = JSON.stringify(m.prompt || {});
      fetch(url, opts).then(function (r) {
        if (!r.ok) throw new Error('AI endpoint returned ' + r.status);
        return r.json();
      }).then(function (j) {
        self._send('ai:result', { id: m.id, text: typeof j === 'string' ? j : (j.text || '') });
      }).catch(function (err) { self._send('ai:result', { id: m.id, error: err.message }); });
    }
  };

  P._emit = function (name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
  };

  /** Give data directly: an array of row objects, or file bytes (ArrayBuffer). */
  P.load = function (data, options) {
    this._data = data;
    this._format = (options && options.format) || (Array.isArray(data) ? 'json' : null);
    if (this._ready) {
      var isBuf = data instanceof ArrayBuffer;
      var payload = isBuf ? data.slice(0) : data;
      this._send('data', { data: payload, format: this._format || 'csv' }, isBuf ? [payload] : []);
    }
    return this;
  };

  /** Re-fetch from `source` and rebuild. */
  P.reload = function () {
    if (!this._ready) return this;
    var self = this;
    this._fetchInit().then(function (r) {
      var isBuf = r.data instanceof ArrayBuffer;
      self._send('data', { data: r.data, format: r.format }, isBuf ? [r.data] : []);
    }).catch(function (err) { self._emit('error', { message: err.message }); });
    return this;
  };

  if (!customElements.get('datasetless-dashboard')) customElements.define('datasetless-dashboard', DatasetlessDashboard);

  window.Datasetless = {
    version: '1.0.0',
    base: BASE,
    /** Datasetless.mount('#el', { source, metrics, title, theme, accent, license, aiEndpoint, data }) */
    mount: function (target, options) {
      options = options || {};
      var host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) throw new Error('Datasetless.mount: target not found');
      var el = document.createElement('datasetless-dashboard');
      Object.keys(options).forEach(function (k) {
        var attr = k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
        if (k === 'metrics' && typeof options.metrics === 'object') el.metrics = options.metrics;
        else if (k === 'data') el.load(options.data, { format: options.format });
        else if (k === 'requestInit') el.requestInit = options.requestInit;
        else if (ATTRS.indexOf(attr) >= 0 && options[k] != null && options[k] !== false) el.setAttribute(attr, options[k] === true ? '' : String(options[k]));
      });
      host.appendChild(el);
      return el;
    },
  };
})();
