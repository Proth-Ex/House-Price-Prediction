'use strict';

/* ═══════════════════════════════════════════════════════
   ProphetAI — main.js
   Handles: tabs, ratings, toggles, validation, API call
   ═══════════════════════════════════════════════════════ */

// Replace the URL below with your actual Render URL
const BACKEND_URL = 'https://house-price-prediction-fuey.onrender.com';

const API_URL = `${BACKEND_URL}/predict`;
const HEALTH_URL = `${BACKEND_URL}/health`;


// ── Grade descriptions ──────────────────────────────────
const GRADE_LABELS = {
    1: 'Dilapidated', 2: 'Substandard', 3: 'Poor quality',
    4: 'Below average', 5: 'Low quality', 6: 'Fair quality',
    7: 'Average quality', 8: 'Good quality', 9: 'Better quality',
    10: 'High quality', 11: 'Custom design', 12: 'Luxury', 13: 'Mansion'
};

// ── INR formatter ───────────────────────────────────────
function formatINR(val) {
    if (val >= 1e7) return '₹' + (val / 1e7).toFixed(2) + ' Cr';
    if (val >= 1e5) return '₹' + (val / 1e5).toFixed(2) + ' L';
    return '₹' + Math.round(val).toLocaleString('en-IN');
}

// ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    /* ── DOM refs ───────────────────────────────────────── */
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    const dots = document.querySelectorAll('.dot');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnPredict = document.getElementById('btn-predict');
    const form = document.getElementById('prediction-form');
    const resultPanel = document.getElementById('result-panel');
    const badgeDot = document.querySelector('.badge-dot');
    const badgeText = document.getElementById('badge-text');
    const gradeInput = document.getElementById('grade');
    const gradeHint = document.getElementById('grade-hint');
    const waterfrontCb = document.getElementById('waterfront');
    const waterfrontVal = document.getElementById('waterfront_val');
    const waterfrontLbl = document.getElementById('waterfront-label');

    let currentStep = 0;
    const TOTAL_STEPS = 3;

    /* ── Health check ───────────────────────────────────── */
    (async () => {
        try {
            const res = await fetch(HEALTH_URL);
            const data = await res.json();
            if (data.model_loaded) {
                badgeDot.classList.add('online');
                badgeText.textContent = `Model ready · R² ${data.r2_score?.toFixed(3) ?? '—'}`;
            } else {
                badgeText.textContent = 'Model not loaded';
            }
        } catch {
            badgeText.textContent = 'Backend offline';
        }
    })();

    /* ── Fetch Talukas ──────────────────────────────────── */
    const talukaSelect = document.getElementById('taluka');
    (async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/talukas`);
            if (res.ok) {
                const data = await res.json();
                if (data.talukas) {
                    data.talukas.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        opt.style.color = 'black';
                        talukaSelect.appendChild(opt);
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load talukas:', e);
        }
    })();

    /* ── Tab navigation ─────────────────────────────────── */
    function goToStep(step) {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));

        tabs[step].classList.add('active');
        panels[step].classList.add('active');
        dots[step].classList.add('active');

        btnPrev.disabled = step === 0;
        btnNext.classList.toggle('hidden', step === TOTAL_STEPS - 1);
        btnPredict.classList.toggle('hidden', step !== TOTAL_STEPS - 1);

        currentStep = step;
    }

    tabs.forEach((tab, i) => tab.addEventListener('click', () => goToStep(i)));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToStep(i)));

    btnNext.addEventListener('click', () => {
        if (currentStep < TOTAL_STEPS - 1) goToStep(currentStep + 1);
    });
    btnPrev.addEventListener('click', () => {
        if (currentStep > 0) goToStep(currentStep - 1);
    });

    /* ── Rating buttons ─────────────────────────────────── */
    document.querySelectorAll('.rating-row').forEach(row => {
        const hiddenInput = document.getElementById(row.id.replace('rating-', ''));
        row.querySelectorAll('.rating-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                row.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                hiddenInput.value = btn.dataset.val;
            });
        });
    });

    /* ── Grade hint ─────────────────────────────────────── */
    gradeInput.addEventListener('input', () => {
        const v = parseInt(gradeInput.value);
        gradeHint.textContent = GRADE_LABELS[v] ?? '';
    });

    /* ── Waterfront toggle ──────────────────────────────── */
    waterfrontCb.addEventListener('change', () => {
        const on = waterfrontCb.checked;
        waterfrontVal.value = on ? '1' : '0';
        waterfrontLbl.textContent = on ? 'Yes' : 'No';
    });

    /* ── Sync living/lot area → renov fields (auto-fill) ── */
    const livingArea = document.getElementById('living_area');
    const lotArea = document.getElementById('lot_area');
    const livingRenov = document.getElementById('living_area_renov');
    const lotRenov = document.getElementById('lot_area_renov');

    livingArea.addEventListener('input', () => {
        if (!livingRenov.value) livingRenov.value = livingArea.value;
    });
    lotArea.addEventListener('input', () => {
        if (!lotRenov.value) lotRenov.value = lotArea.value;
    });

    /* ── Sync above-ground = living - basement ──────────── */
    const basementArea = document.getElementById('basement_area');
    const areaExcl = document.getElementById('area_excl_basement');

    function syncAboveGround() {
        const la = parseFloat(livingArea.value) || 0;
        const ba = parseFloat(basementArea.value) || 0;
        if (!areaExcl.dataset.manual && la > 0) {
            areaExcl.value = Math.max(0, la - ba);
        }
    }
    livingArea.addEventListener('input', syncAboveGround);
    basementArea.addEventListener('input', syncAboveGround);
    areaExcl.addEventListener('input', () => { areaExcl.dataset.manual = '1'; });

    /* ── Field validation ───────────────────────────────── */
    const REQUIRED_IDS = [
        'living_area', 'lot_area', 'bedrooms', 'bathrooms', 'floors',
        'area_excl_basement', 'basement_area',
        'grade', 'built_year', 'renovation_year',
        'living_area_renov', 'lot_area_renov',
        'schools_nearby', 'airport_distance'
    ];

    function validateAll() {
        let ok = true;
        REQUIRED_IDS.forEach(id => {
            const el = document.getElementById(id);
            const v = el.value.trim();
            if (v === '' || isNaN(Number(v))) {
                el.classList.add('invalid');
                ok = false;
            } else {
                el.classList.remove('invalid');
            }
        });
        return ok;
    }

    REQUIRED_IDS.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('input', () => el.classList.remove('invalid'));
    });

    /* ── Form submission ────────────────────────────────── */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateAll()) {
            // jump to first tab with error
            for (let s = 0; s < TOTAL_STEPS; s++) {
                goToStep(s);
                const panel = panels[s];
                const invalid = panel.querySelector('.invalid');
                if (invalid) { invalid.focus(); break; }
            }
            return;
        }

        btnPredict.disabled = true;
        btnPredict.classList.add('loading');

        const payload = {
            bedrooms: parseInt(document.getElementById('bedrooms').value),
            bathrooms: parseFloat(document.getElementById('bathrooms').value),
            living_area: parseInt(document.getElementById('living_area').value),
            lot_area: parseInt(document.getElementById('lot_area').value),
            floors: parseFloat(document.getElementById('floors').value),
            waterfront: parseInt(waterfrontVal.value),
            views: parseInt(document.getElementById('views').value),
            condition: parseInt(document.getElementById('condition').value),
            grade: parseInt(document.getElementById('grade').value),
            area_excluding_basement: parseInt(document.getElementById('area_excl_basement').value),
            basement_area: parseInt(document.getElementById('basement_area').value),
            built_year: parseInt(document.getElementById('built_year').value),
            renovation_year: parseInt(document.getElementById('renovation_year').value),
            living_area_renov: parseInt(document.getElementById('living_area_renov').value),
            lot_area_renov: parseInt(document.getElementById('lot_area_renov').value),
            schools_nearby: parseInt(document.getElementById('schools_nearby').value),
            airport_distance: parseInt(document.getElementById('airport_distance').value),
            taluka: document.getElementById('taluka').value || null,
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Server error');
            }

            const data = await res.json();
            showResult(data);

        } catch (err) {
            console.error('Prediction error:', err);
            showError(err.message);
        } finally {
            btnPredict.disabled = false;
            btnPredict.classList.remove('loading');
        }
    });

    /* ── Show result ────────────────────────────────────── */
    function showResult(data) {
        const price = data.predicted_price;
        const low = data.price_range_low;
        const high = data.price_range_high;
        const conf = data.confidence_pct;
        const r2 = data.model_r2;

        document.getElementById('result-price').textContent = formatINR(price);
        document.getElementById('range-low').textContent = formatINR(low);
        document.getElementById('range-high').textContent = formatINR(high);
        document.getElementById('result-conf').textContent = `${conf.toFixed(1)}% confidence`;
        document.getElementById('meta-r2').textContent = r2.toFixed(4);

        // Animate the range bar thumb to center
        const fill = document.getElementById('range-fill');
        const thumb = document.getElementById('range-thumb');
        fill.style.width = '100%';
        thumb.style.left = '50%';

        document.getElementById('main-card').classList.add('hidden');
        resultPanel.classList.remove('hidden');
    }

    /* ── Show error toast ────────────────────────────────── */
    function showError(msg) {
        const existing = document.querySelector('.toast-error');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-error';
        toast.textContent = '⚠ ' + (msg || 'Something went wrong. Is the backend running?');
        Object.assign(toast.style, {
            position: 'fixed', bottom: '2rem', left: '50%',
            transform: 'translateX(-50%)',
            background: '#450a0a', border: '1px solid #ef4444',
            color: '#fca5a5', borderRadius: '10px',
            padding: '0.85rem 1.5rem', fontSize: '0.88rem',
            fontFamily: 'var(--font)', zIndex: '9999',
            animation: 'fadeUp 0.3s ease',
            maxWidth: '90vw', textAlign: 'center',
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    /* ── Reset button ────────────────────────────────────── */
    document.getElementById('btn-reset').addEventListener('click', () => {
        resultPanel.classList.add('hidden');
        document.getElementById('main-card').classList.remove('hidden');
        form.reset();
        waterfrontVal.value = '0';
        waterfrontLbl.textContent = 'No';
        gradeHint.textContent = 'Average quality';
        // reset rating buttons to defaults
        document.querySelectorAll('#rating-condition .rating-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.val === '3');
        });
        document.getElementById('condition').value = '3';
        document.querySelectorAll('#rating-views .rating-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.val === '1');
        });
        document.getElementById('views').value = '1';
        if(document.getElementById('taluka')) document.getElementById('taluka').value = '';
        delete areaExcl.dataset.manual;
        goToStep(0);
    });

    /* ── Initial state ───────────────────────────────────── */
    goToStep(0);
});
