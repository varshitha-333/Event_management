// =====================================================================
// bento.js — Event Spotlight Page  (v2 — new two-column layout)
// Jain University — Department Events Portal
// Depends on: app.js (must be loaded before this file)
// =====================================================================

document.addEventListener('DOMContentLoaded', function () {

    /* ── DOM refs ── */
    const deptSelect   = document.getElementById('bentoDeptSelect');
    const eventSelect  = document.getElementById('bentoEventSelect');
    const bentoDetail  = document.getElementById('bentoGrid');
    const bentoWelcome = document.getElementById('bentoWelcome');

    // Guard: if app.js didn't load, bail gracefully
    if (typeof state === 'undefined' || !state.events) {
        console.error('bento.js: app.js was not loaded correctly — state.events is missing.');
        return;
    }

    /* ─────────────────────────────────────────────────
       POPULATE EVENT SELECTOR
    ───────────────────────────────────────────────── */
    function populateEventSelect(dept) {
        const filtered = dept === 'all'
            ? state.events
            : state.events.filter(e => e.department === dept);

        const selects = [
            document.getElementById('bentoEventSelect'),
            document.getElementById('bentoEventSelectMobile')
        ];
        selects.forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="">Select an event…</option>';
            filtered.forEach(ev => {
                const opt = document.createElement('option');
                opt.value       = ev.id;
                opt.textContent = ev.name;
                sel.appendChild(opt);
            });
        });
    }

    /* ─────────────────────────────────────────────────
       EVENT LISTENERS — nav dropdowns
    ───────────────────────────────────────────────── */
    function onDeptChange(value) {
        populateEventSelect(value);
        bentoDetail.style.display  = 'none';
        bentoWelcome.style.display = 'flex';
        history.replaceState(null, '', window.location.pathname);
        // sync both dept selects
        ['bentoDeptSelect','bentoDeptSelectMobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value !== value) el.value = value;
        });
    }

    function onEventChange(value) {
        if (!value) {
            bentoDetail.style.display  = 'none';
            bentoWelcome.style.display = 'flex';
            return;
        }
        const ev = state.events.find(e => e.id === value);
        if (ev) {
            renderSpotlight(ev);
            history.replaceState(null, '', '?id=' + ev.id);
        }
        // sync both event selects
        ['bentoEventSelect','bentoEventSelectMobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value !== value) el.value = value;
        });
    }

    deptSelect?.addEventListener('change', function () { onDeptChange(this.value); });
    document.getElementById('bentoDeptSelectMobile')?.addEventListener('change', function () { onDeptChange(this.value); });
    eventSelect?.addEventListener('change', function () { onEventChange(this.value); });
    document.getElementById('bentoEventSelectMobile')?.addEventListener('change', function () { onEventChange(this.value); });

    /* ─────────────────────────────────────────────────
       INITIAL LOAD — read ?id= from URL
    ───────────────────────────────────────────────── */
    populateEventSelect('all');

    const params = new URLSearchParams(window.location.search);
    const urlId  = params.get('id');
    if (urlId) {
        const ev = state.events.find(e => e.id === urlId);
        if (ev) {
            ['bentoDeptSelect','bentoDeptSelectMobile'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = ev.department;
            });
            populateEventSelect(ev.department);
            ['bentoEventSelect','bentoEventSelectMobile'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = ev.id;
            });
            renderSpotlight(ev);
        } else {
            showWelcome();
        }
    }

    /* ─────────────────────────────────────────────────
       RENDER SPOTLIGHT
    ───────────────────────────────────────────────── */
    function renderSpotlight(ev) {
        const tl = getEventTimeline(ev.date);

        /* ── HERO ── */
        setText('heroTitle', ev.name);
        setText('heroDept',  getDepartmentName(ev.department));
        setText('heroDate',  formatDateLong(ev.date));
        setText('heroTime',  formatTime(ev.time));
        setText('heroVenue', ev.location);
        setText('heroOrg',   ev.organizer || 'TBD');

        const heroDesc = document.getElementById('heroDesc');
        if (heroDesc) {
            const baseDesc = (ev.description || 'A focused academic experience designed for clarity, discovery, and meaningful participation.').trim();
            const shortDesc = baseDesc.split(/(?<=[.!?])\s+/)[0].slice(0, 160);
            heroDesc.textContent = shortDesc || baseDesc;
        }

        const heroTagGroup = document.getElementById('heroTagGroup');
        if (heroTagGroup) {
            const tagPool = (ev.tags && ev.tags.length ? ev.tags : [getDepartmentName(ev.department), 'Lecture', 'Research'])
                .filter(Boolean)
                .slice(0, 3);
            heroTagGroup.innerHTML = tagPool.map(tag => `<span class="hero-tag">${escHtml(tag)}</span>`).join('');
        }

        // Status badge
        const badge = document.getElementById('heroBadge');
        if (badge) {
            badge.textContent = tl === 'present' ? 'Today'
                              : tl === 'future'  ? 'Upcoming'
                              :                    'Past';
            badge.className = 'sdh-badge ' + tl;
        }
        setText('quickStatus', tl === 'present' ? 'Today' : tl === 'future' ? 'Open' : 'Closed');
        setText('quickMode', ev.mode || 'Hybrid');
        setText('quickFee', ev.registrationFee || ev.fee || 'Free');

        // Seats progress bar
        const capacity = ev.capacity || 120;
        const filled   = ev.filled   || Math.round(capacity * 0.72);
        const remain   = capacity - filled;
        const pct      = Math.round((filled / capacity) * 100);
        setText('heroSeats', filled + '/' + capacity);
        const progEl = document.getElementById('heroProgress');
        if (progEl) setTimeout(() => progEl.style.width = pct + '%', 100);

        setText('quickSeats', filled + ' / ' + capacity);
        setText('quickSeatsPct', pct + '%');
        const quickProg = document.getElementById('quickProgress');
        if (quickProg) setTimeout(() => quickProg.style.width = pct + '%', 120);

        /* ── POSTER ── */
        const img = document.getElementById('heroPoster');
        const fb  = document.getElementById('heroPosterFallback');
        const posterSrc = typeof getEventPoster === 'function'
            ? getEventPoster(ev)
            : (ev.poster || '');

        if (img && posterSrc) {
            img.src = posterSrc;
            img.alt = ev.name + ' — Event Poster';
            img.style.display = 'block';
            img.onerror = function () {
                this.style.display = 'none';
                if (fb) {
                    fb.style.display = 'flex';
                    fb.innerHTML = `<span style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);">${getDepartmentName(ev.department)}</span>`;
                    fb.style.background = `linear-gradient(135deg,${getDeptColor(ev.department)}cc,${getDeptColor(ev.department)}55)`;
                }
            };
            if (fb) fb.style.display = 'none';
        } else if (fb) {
            if (img) img.style.display = 'none';
            fb.style.display = 'flex';
            fb.innerHTML = `<span style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);">${getDepartmentName(ev.department)}</span>`;
            fb.style.background = `linear-gradient(135deg,${getDeptColor(ev.department)}cc,${getDeptColor(ev.department)}55)`;
        }

        /* ── ABOUT / OVERVIEW ── */
        setText('aboutText', ev.description || 'No description provided.');
        const tagsEl = document.getElementById('aboutTags');
        if (tagsEl) {
            const tags = ev.tags && ev.tags.length
                ? ev.tags
                : [getDepartmentName(ev.department), 'Academic Event', 'Open to All'];
            tagsEl.innerHTML = tags.map(t => `<span class="sdc-tag">${escHtml(t)}</span>`).join('');
        }

        /* ── ELIGIBILITY ── */
        const eligDeptEl = document.getElementById('eligDept');
        if (eligDeptEl) eligDeptEl.textContent = getDepartmentName(ev.department);
        setText('eligCapacity', (ev.capacity || '—') + ' Students');

        /* ── SCHEDULE rows — fill date columns ── */
        ['sDate','sDate2','sDate3','sDate4','sDate5'].forEach(id => setText(id, formatDateLong(ev.date)));
        setText('sTime', formatTime(ev.time));

        /* ── SIDEBAR: REGISTRATION ── */
        const deadlineFmt = ev.regCloseDate ? formatDateLong(ev.regCloseDate) : 'Before event date';
        setText('sDeadline', deadlineFmt);

        // Deadline remaining days
        const remEl = document.getElementById('deadlineRemaining');
        if (remEl && ev.regCloseDate) {
            const diff = Math.ceil((new Date(ev.regCloseDate) - new Date()) / 86400000);
            remEl.textContent = diff > 0 ? '— ' + diff + ' days remaining' : diff === 0 ? '— Today!' : '— Closed';
        }

        // Sidebar seats
        const sidebarSeatsEl = document.getElementById('sidebarSeats');
        if (sidebarSeatsEl) sidebarSeatsEl.textContent = remain + ' / ' + capacity;
        const sidebarProgEl = document.getElementById('sidebarProgress');
        if (sidebarProgEl) setTimeout(() => sidebarProgEl.style.width = pct + '%', 150);
        const sidebarSubEl = document.getElementById('sidebarSeatsSub');
        if (sidebarSubEl) sidebarSubEl.textContent = filled + ' seats filled · ' + remain + ' remaining';

        // Status badge in sidebar
        const statusBadge = document.getElementById('sidebarStatusBadge');
        if (statusBadge) {
            const status = typeof getEventStatus === 'function'
                ? getEventStatus(ev)
                : { label: tl === 'future' ? 'Open' : tl === 'present' ? 'Today' : 'Closed' };
            statusBadge.textContent = status.label || 'Open';
        }

        /* ── SIDEBAR: VENUE & TIME ── */
        const venueParts = (ev.location || '').split(',');
        setText('venueHall',   venueParts[0] || ev.location);
        setText('venueFloor',  venueParts[1] ? venueParts[1].trim() : '');
        setText('venueDate',   formatDateLong(ev.date));
        setText('timingsBig',  formatTime(ev.time));
        setText('timingsEnd',  ev.endTime ? formatTime(ev.endTime) : '—');
        setText('timingsDate', formatDateLong(ev.date));
        setText('metaVenue',   ev.location);

        /* ── FACULTY / ORGANIZER ── */
        setText('facultyName',  ev.organizer || 'Staff Coordinator');
        setText('facultyName2', ev.organizer || 'Staff Coordinator');
        setText('facultyRole',  ev.organizerRole || 'Faculty Coordinator');

        // Organizer avatar initials
        const avatarEl = document.getElementById('organizerAvatar');
        if (avatarEl && ev.organizer) {
            const parts = ev.organizer.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').split(' ');
            avatarEl.textContent = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }

        // Email placeholder
        const emailEl = document.getElementById('orgEmail');
        if (emailEl && ev.organizer) {
            const slug = ev.organizer.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i,'').toLowerCase().replace(/\s+/g, '.');
            emailEl.textContent = slug + '@jainuniversity.ac.in';
        }

        /* ── META GRID ── */
        setText('metaCoordinator', ev.organizer || 'TBD');
        setText('metaDept',        getDepartmentName(ev.department));
        setText('metaCapacity',    (ev.capacity || '—') + ' seats');
        const statusObj = typeof getEventStatus === 'function' ? getEventStatus(ev) : { label: 'Upcoming' };
        setText('metaStatus', statusObj.label);
        setText('metaVenue',  ev.location);

        /* ── PAST HIGHLIGHTS ── */
        const highlightsSection = document.getElementById('highlightsSection');
        if (highlightsSection) {
            highlightsSection.style.display = tl === 'past' ? 'block' : 'none';
        }

        /* ── RELATED EVENTS ── */
        renderRelatedEvents(ev);

        /* ── SHOW DETAIL, HIDE WELCOME ── */
        bentoWelcome.style.display = 'none';
        bentoDetail.style.display  = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        /* ── TOAST ── */
        showBentoToast('Loaded: ' + ev.name);
    }

    /* ─────────────────────────────────────────────────
       RELATED EVENTS
    ───────────────────────────────────────────────── */
    function renderRelatedEvents(ev) {
        const relatedGrid = document.getElementById('relatedGrid');
        if (!relatedGrid) return;

        const related = state.events
            .filter(e => e.id !== ev.id && e.department === ev.department)
            .slice(0, 3);

        if (!related.length) {
            document.getElementById('relatedSection').style.display = 'none';
            return;
        }
        document.getElementById('relatedSection').style.display = 'block';

        const icons = { 'computer-science': 'fa-laptop-code', 'mathematics': 'fa-square-root-alt', 'physics': 'fa-atom', 'chemistry': 'fa-flask', 'biology': 'fa-dna', 'english': 'fa-book-open', 'history': 'fa-landmark' };
        const icon = icons[ev.department] || 'fa-calendar-alt';

        relatedGrid.innerHTML = related.map(r => `
            <div class="related-card" onclick="location.href='?id=${escHtml(r.id)}'">
                <div class="related-card-img">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="related-card-body">
                    <span class="related-card-dept">${escHtml(getDepartmentName(r.department))}</span>
                    <div class="related-card-name">${escHtml(r.name)}</div>
                    <div class="related-card-meta">
                        <i class="fas fa-calendar-day"></i>
                        ${escHtml(formatDateLong(r.date))}
                    </div>
                    <div class="related-card-meta">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escHtml(r.location)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /* ─────────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────────── */
    function showWelcome() {
        bentoWelcome.style.display = 'flex';
        bentoDetail.style.display  = 'none';
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '—';
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Toast notification ── */
    letconst observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

document.querySelectorAll('[data-count]').forEach((el) => {
  const target = Number(el.dataset.count || 0);
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 36));
  const tick = () => {
    current += step;
    if (current >= target) {
      el.textContent = String(target);
      return;
    }
    el.textContent = String(current);
    requestAnimationFrame(tick);
  };
  tick();
});

document.querySelectorAll('.progress-fill').forEach((bar) => {
  const target = bar.style.getPropertyValue('--target') || '72%';
  requestAnimationFrame(() => {
    setTimeout(() => {
      bar.style.width = target;
    }, 250);
  });
});

document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});
_toastTimer = null;
    function showBentoToast(msg) {
        const el  = document.getElementById('bentoToast');
        const txt = document.getElementById('bentoToastMsg');
        if (!el) return;
        if (txt) txt.textContent = msg;
        el.classList.add('show');
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }
});