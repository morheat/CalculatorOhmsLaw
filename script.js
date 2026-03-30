const SQ3 = Math.sqrt(3);

// Track the last two edited fields per calculator
const state = {
  s: { order: [], vals: { v: null, i: null, r: null, w: null } },
  t: { order: [], vals: { v: null, i: null, r: null, w: null } }
};

function fmt(n) {
  if (n === null || isNaN(n) || !isFinite(n)) return '';
  // Use up to 4 sig figs
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return parseFloat(n.toFixed(2)).toString();
  if (abs >= 100)  return parseFloat(n.toFixed(3)).toString();
  if (abs >= 1)    return parseFloat(n.toFixed(4)).toString();
  return parseFloat(n.toPrecision(4)).toString();
}

function setResult(id, val) {
  const el = document.getElementById(id);
  if (val !== null && val > 0 && isFinite(val)) {
    el.value = fmt(val);
    el.classList.add('is-result');
  } else {
    el.value = '';
    el.classList.remove('is-result');
  }
  el.readOnly = true;
}

function setEditable(id) {
  const el = document.getElementById(id);
  el.classList.remove('is-result');
  el.readOnly = false;
}

function showErr(pfx, msg) {
  document.getElementById(pfx + '_err').textContent = msg;
}

// ── SINGLE PHASE ───────────────────────────────────────────────
function calcSingle(inputs) {
  // inputs: object with the two known keys
  const k = Object.keys(inputs);
  const [a, b] = k;
  const v1 = inputs[a], v2 = inputs[b];
  let V, I, R, W;

  if (a === 'v' && b === 'i') { V=v1; I=v2; R=V/I; W=V*I; }
  else if (a === 'v' && b === 'r') { V=v1; R=v2; I=V/R; W=V*V/R; }
  else if (a === 'v' && b === 'w') { V=v1; W=v2; I=W/V; R=V*V/W; }
  else if (a === 'i' && b === 'r') { I=v1; R=v2; V=I*R; W=I*I*R; }
  else if (a === 'i' && b === 'w') { I=v1; W=v2; V=W/I; R=W/(I*I); }
  else if (a === 'r' && b === 'w') { R=v1; W=v2; V=Math.sqrt(W*R); I=Math.sqrt(W/R); }

  return { v: V, i: I, r: R, w: W };
}

// ── 3-PHASE OPEN WYE ───────────────────────────────────────────
// W = √3 · V · I
// R = V / (√3 · I)   [phase resistance in wye]
// Equivalently: W = 3 · I² · R  and  V = √3 · I · R
function calcThree(inputs) {
  const k = Object.keys(inputs);
  const [a, b] = k;
  const v1 = inputs[a], v2 = inputs[b];
  let V, I, R, W;

  if (a === 'v' && b === 'i') { V=v1; I=v2; W=SQ3*V*I; R=V/(SQ3*I); }
  else if (a === 'v' && b === 'r') { V=v1; R=v2; I=V/(SQ3*R); W=V*V/R; }
  else if (a === 'v' && b === 'w') { V=v1; W=v2; I=W/(SQ3*V); R=V*V/W; }
  else if (a === 'i' && b === 'r') { I=v1; R=v2; V=SQ3*I*R; W=3*I*I*R; }
  else if (a === 'i' && b === 'w') { I=v1; W=v2; V=W/(SQ3*I); R=W/(3*I*I); }
  else if (a === 'r' && b === 'w') { R=v1; W=v2; I=Math.sqrt(W/(3*R)); V=Math.sqrt(W*R); }

  return { v: V, i: I, r: R, w: W };
}

function runCalc(pfx) {
  const s = state[pfx];
  showErr(pfx, '');
  const allKeys = ['v','i','r','w'];

  // Determine which two are "input" (last two edited), rest become output
  const inputKeys = s.order.slice(-2);
  const outputKeys = allKeys.filter(k => !inputKeys.includes(k));

  // Reset all outputs to editable first
  outputKeys.forEach(k => {
    setEditable(pfx + '_' + k);
    document.getElementById(pfx + '_' + k).value = '';
  });

  if (inputKeys.length < 2) return;

  const inputs = {};
  for (const k of inputKeys) {
    const val = parseFloat(document.getElementById(pfx + '_' + k).value);
    if (isNaN(val) || val <= 0) return; // wait for valid values
    inputs[k] = val;
  }

  try {
    const res = pfx === 's' ? calcSingle(inputs) : calcThree(inputs);
    for (const k of outputKeys) {
      if (res[k] !== undefined && isFinite(res[k]) && res[k] > 0) {
        setResult(pfx + '_' + k, res[k]);
      } else {
        showErr(pfx, 'Check inputs — result out of range.');
      }
    }
  } catch(e) {
    showErr(pfx, 'Invalid combination.');
  }
}

function attachListeners(pfx) {
  ['v','i','r','w'].forEach(key => {
    const el = document.getElementById(pfx + '_' + key);
    el.addEventListener('input', () => {
      // Remove from order then re-add at end
      state[pfx].order = state[pfx].order.filter(k => k !== key);
      if (el.value !== '') state[pfx].order.push(key);

      // If this field just got focus and was a result, clear it
      el.classList.remove('is-result');
      el.readOnly = false;

      runCalc(pfx);
    });

    el.addEventListener('focus', () => {
      // If it was a computed result and user clicks it, let them overwrite
      if (el.classList.contains('is-result')) {
        el.readOnly = false;
        el.classList.remove('is-result');
        el.select();
      }
    });
  });
}

function clearCalc(pfx) {
  state[pfx].order = [];
  ['v','i','r','w'].forEach(k => {
    const el = document.getElementById(pfx + '_' + k);
    el.value = '';
    el.classList.remove('is-result');
    el.readOnly = false;
  });
  showErr(pfx, '');
}

attachListeners('s');
attachListeners('t');