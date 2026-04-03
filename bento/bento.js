// =====================================================================
// bento.js — Event Spotlight Page  (v4 — Redesigned)
// Jain University — Department Events Portal
// Depends on: app.js (must be loaded before this file)
//   app.js must expose: state.events[], getDepartmentName(), formatDateLong(),
//   formatTime(), getEventTimeline(), getEventStatus(), getDeptColor(),
//   getEventPoster() [optional]
// =====================================================================

document.addEventListener('DOMContentLoaded', function () {

    /* ─────────────────────────────────────────────────────────────────
       GUARD — ensure app.js is loaded
    ───────────────────────────────────────────────────────────────── */
    if (typeof state === 'undefined' || !state.events) {
        console.error('bento.js: app.js was not loaded correctly — state.events is missing.');
        return;
    }


    /* ─────────────────────────────────────────────────────────────────
       WELCOME CAROUSEL
    ───────────────────────────────────────────────────────────────── */
    const WC_SLIDE_COUNT = 3;
    const WC_INTERVAL    = 5500;
    let wcIndex   = 0;
    let wcPaused  = false;
    let wcProgStart = Date.now();
    let wcProgTimer = null;

    const wcTrack    = document.getElementById('wcTrack');
    const wcDots     = document.querySelectorAll('.wc-dot');
    const wcPauseBtn = document.getElementById('wcPause');
    const wcFill     = document.getElementById('wcProgressFill');

    function wcGoTo(idx, resetProgress) {
        if (resetProgress === undefined) resetProgress = true;
        const slides = wcTrack ? wcTrack.querySelectorAll('.wc-slide') : [];
        if (!slides.length) return;

        slides[wcIndex].classList.remove('wc-slide--active');
        wcDots[wcIndex]?.classList.remove('active');
        wcDots[wcIndex]?.setAttribute('aria-selected', 'false');

        wcIndex = ((idx % WC_SLIDE_COUNT) + WC_SLIDE_COUNT) % WC_SLIDE_COUNT;

        slides[wcIndex].classList.add('wc-slide--active');
        wcDots[wcIndex]?.classList.add('active');
        wcDots[wcIndex]?.setAttribute('aria-selected', 'true');

        if (wcTrack) wcTrack.style.transform = 'translateX(-' + (wcIndex * 100) + '%)';
        if (resetProgress) wcStartProgress();
    }

    function wcStartProgress() {
        clearInterval(wcProgTimer);
        wcProgStart = Date.now();
        if (wcFill) wcFill.style.width = '0%';
        wcProgTimer = setInterval(function () {
            if (wcPaused) return;
            const elapsed = Date.now() - wcProgStart;
            const pct = Math.min((elapsed / WC_INTERVAL) * 100, 100);
            if (wcFill) wcFill.style.width = pct + '%';
            if (pct >= 100) wcGoTo(wcIndex + 1, true);
        }, 40);
    }

    // Pause / Resume
    if (wcPauseBtn) {
        wcPauseBtn.addEventListener('click', function () {
            wcPaused = !wcPaused;
            const icon = wcPauseBtn.querySelector('i');
            if (icon) {
                icon.className = wcPaused ? 'fas fa-play' : 'fas fa-pause';
            }
            wcPauseBtn.setAttribute('aria-label', wcPaused ? 'Resume autoplay' : 'Pause autoplay');
            wcPauseBtn.setAttribute('aria-pressed', String(wcPaused));
            if (!wcPaused) wcProgStart = Date.now() - ((wcFill ? parseFloat(wcFill.style.width) / 100 : 0) * WC_INTERVAL);
        });
    }

    document.getElementById('wcPrev')?.addEventListener('click', function () { wcGoTo(wcIndex - 1, true); });
    document.getElementById('wcNext')?.addEventListener('click', function () { wcGoTo(wcIndex + 1, true); });
    wcDots.forEach(function (d) { d.addEventListener('click', function () { wcGoTo(+d.dataset.idx, true); }); });

    // Pause on hover
    var wcCarousel = document.querySelector('.welcome-carousel');
    if (wcCarousel) {
        wcCarousel.addEventListener('mouseenter', function () { wcPaused = true; });
        wcCarousel.addEventListener('mouseleave', function () { if (!wcPauseBtn?.getAttribute('aria-pressed') === 'true') { wcPaused = false; wcProgStart = Date.now(); } });
    }

    // Keyboard nav on carousel
    if (wcCarousel) {
        wcCarousel.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft')  wcGoTo(wcIndex - 1, true);
            if (e.key === 'ArrowRight') wcGoTo(wcIndex + 1, true);
        });
    }

    // Init carousel
    wcStartProgress();


    /* ─────────────────────────────────────────────────────────────────
       NAV DROPDOWNS — DOM refs
    ───────────────────────────────────────────────────────────────── */
    const deptSelect   = document.getElementById('bentoDeptSelect');
    const eventSelect  = document.getElementById('bentoEventSelect');
    const bentoDetail  = document.getElementById('bentoGrid');
    const bentoWelcome = document.getElementById('bentoWelcome');


    /* ─────────────────────────────────────────────────────────────────
       POPULATE EVENT SELECTOR
    ───────────────────────────────────────────────────────────────── */
    function populateEventSelect(dept) {
        const filtered = dept === 'all'
            ? state.events
            : state.events.filter(function (e) { return e.department === dept; });

        var selects = [
            document.getElementById('bentoEventSelect'),
            document.getElementById('bentoEventSelectMobile')
        ];
        selects.forEach(function (sel) {
            if (!sel) return;
            sel.innerHTML = '<option value="">Select an event…</option>';
            filtered.forEach(function (ev) {
                var opt = document.createElement('option');
                opt.value       = ev.id;
                opt.textContent = ev.name;
                sel.appendChild(opt);
            });
        });
    }


    /* ─────────────────────────────────────────────────────────────────
       MOBILE FILTER TOGGLE
    ───────────────────────────────────────────────────────────────── */
    var filterToggle  = document.getElementById('filterToggle');
    var mobileFilters = document.getElementById('mobileFilters');
    if (filterToggle && mobileFilters) {
        filterToggle.addEventListener('click', function () {
            var isOpen = mobileFilters.classList.toggle('open');
            filterToggle.classList.toggle('active', isOpen);
            filterToggle.setAttribute('aria-expanded', String(isOpen));
            mobileFilters.setAttribute('aria-hidden', String(!isOpen));
        });
    }


    /* ─────────────────────────────────────────────────────────────────
       EVENT LISTENERS — dept/event dropdowns
    ───────────────────────────────────────────────────────────────── */
    function onDeptChange(value) {
        populateEventSelect(value);
        bentoDetail.style.display  = 'none';
        bentoWelcome.style.display = 'flex';
        history.replaceState(null, '', window.location.pathname);
        syncSelects('bentoDeptSelect',     value, false);
        syncSelects('bentoDeptSelectMobile', value, false);
    }

    function onEventChange(value) {
        if (!value) {
            bentoDetail.style.display  = 'none';
            bentoWelcome.style.display = 'flex';
            return;
        }
        var ev = state.events.find(function (e) { return e.id === value; });
        if (ev) {
            renderSpotlight(ev);
            history.replaceState(null, '', '?id=' + ev.id);
        }
        syncSelects('bentoEventSelect',       value, false);
        syncSelects('bentoEventSelectMobile', value, false);
    }

    function syncSelects(id, value, triggerChange) {
        var el = document.getElementById(id);
        if (el && el.value !== value) {
            el.value = value;
            if (triggerChange) el.dispatchEvent(new Event('change'));
        }
    }

    deptSelect?.addEventListener('change', function () { onDeptChange(this.value); });
    document.getElementById('bentoDeptSelectMobile')?.addEventListener('change', function () { onDeptChange(this.value); });
    eventSelect?.addEventListener('change', function () { onEventChange(this.value); });
    document.getElementById('bentoEventSelectMobile')?.addEventListener('change', function () { onEventChange(this.value); });


    /* ─────────────────────────────────────────────────────────────────
       INITIAL LOAD — read ?id= from URL
    ───────────────────────────────────────────────────────────────── */
    populateEventSelect('all');

    var params = new URLSearchParams(window.location.search);
    var urlId  = params.get('id');
    if (urlId) {
        var ev = state.events.find(function (e) { return e.id === urlId; });
        if (ev) {
            syncSelects('bentoDeptSelect',       ev.department, false);
            syncSelects('bentoDeptSelectMobile', ev.department, false);
            populateEventSelect(ev.department);
            syncSelects('bentoEventSelect',       ev.id, false);
            syncSelects('bentoEventSelectMobile', ev.id, false);
            renderSpotlight(ev);
        } else {
            showWelcome();
        }
    }


    /* ─────────────────────────────────────────────────────────────────
       RENDER SPOTLIGHT
    ───────────────────────────────────────────────────────────────── */
    function renderSpotlight(ev) {
        var tl = typeof getEventTimeline === 'function'
            ? getEventTimeline(ev.date)
            : inferTimeline(ev.date);

        /* ── HERO ── */
        setText('heroTitle', ev.name);
        setText('heroDept',  getDepartmentName(ev.department));
        setText('heroDate',  formatDateLong(ev.date));
        setText('heroTime',  formatTime(ev.time));
        setText('heroVenue', ev.location);
        setText('heroOrg',   ev.organizer || 'TBD');

        // Status badge
        var badge = document.getElementById('heroBadge');
        if (badge) {
            badge.textContent = tl === 'present' ? 'Today'
                              : tl === 'future'  ? 'Upcoming'
                              :                    'Past';
            badge.className   = 'sdh-badge ' + tl;
        }

        // Seats progress bar
        var capacity = ev.capacity || 120;
        var filled   = ev.filled   || Math.round(capacity * 0.72);
        var remain   = capacity - filled;
        var pct      = Math.round((filled / capacity) * 100);
        setText('heroSeats', filled + '/' + capacity);

        var heroProgBar = document.getElementById('heroProgressBar');
        if (heroProgBar) heroProgBar.setAttribute('aria-valuenow', pct);
        var heroProgEl = document.getElementById('heroProgress');
        if (heroProgEl) setTimeout(function () { heroProgEl.style.width = pct + '%'; }, 120);

        /* ── POSTER ── */
        var imgEl = document.getElementById('heroPoster');
        var fbEl  = document.getElementById('heroPosterFallback');
        var posterSrc = typeof getEventPoster === 'function'
            ? getEventPoster(ev)
            : (ev.poster || '');

        if (imgEl && posterSrc) {
            imgEl.src             = posterSrc;
            imgEl.alt             = ev.name + ' — Event Poster';
            imgEl.style.display   = 'block';
            imgEl.onerror = function () {
                this.style.display = 'none';
                renderPosterFallback(fbEl, ev);
            };
            if (fbEl) fbEl.style.display = 'none';
        } else {
            if (imgEl) imgEl.style.display = 'none';
            renderPosterFallback(fbEl, ev);
        }

        function renderPosterFallback(fb, ev) {
            if (!fb) return;
            fb.style.display = 'flex';
            var deptLabel = document.getElementById('posterDeptLabel');
            if (deptLabel) deptLabel.textContent = getDepartmentName(ev.department);
            var color = typeof getDeptColor === 'function' ? getDeptColor(ev.department) : '#1E2840';
            fb.style.background = 'linear-gradient(160deg,' + color + 'cc,' + color + '55)';
        }

        /* ── QUICK STATS BAR ── */
        var statusObj = typeof getEventStatus === 'function'
            ? getEventStatus(ev)
            : { label: tl === 'future' ? 'Open' : tl === 'present' ? 'Today' : 'Closed' };

        setText('quickStatusText', statusObj.label || 'Open');
        setText('quickSeats',      remain + ' / ' + capacity);
        setText('quickSeatsSub',   filled + ' seats filled · ' + remain + ' remaining');

        var quickProgBar = document.getElementById('quickProgress');
        if (quickProgBar) setTimeout(function () { quickProgBar.style.width = pct + '%'; }, 150);

        /* ── ABOUT / OVERVIEW ── */
        setText('aboutText', ev.description || 'No description provided.');

        // Optional quote
        var quoteEl     = document.getElementById('aboutQuote');
        var quoteTextEl = document.getElementById('aboutQuoteText');
        if (ev.quote && quoteEl && quoteTextEl) {
            quoteTextEl.textContent   = ev.quote;
            quoteEl.style.display     = 'block';
        } else if (quoteEl) {
            quoteEl.style.display = 'none';
        }

        // Optional second paragraph
        var text2El = document.getElementById('aboutText2');
        if (ev.description2 && text2El) {
            text2El.textContent   = ev.description2;
            text2El.style.display = 'block';
        } else if (text2El) {
            text2El.style.display = 'none';
        }

        // Tags
        var tagsEl = document.getElementById('aboutTags');
        if (tagsEl) {
            var tags = (ev.tags && ev.tags.length)
                ? ev.tags
                : [getDepartmentName(ev.department), 'Academic Event', 'Open to All'];
            tagsEl.innerHTML = tags.map(function (t) {
                return '<span class="sdc-tag">' + escHtml(t) + '</span>';
            }).join('');
        }

        /* ── ELIGIBILITY ── */
        var eligDeptEl = document.getElementById('eligDept');
        if (eligDeptEl) eligDeptEl.textContent = getDepartmentName(ev.department);
        setText('eligCapacity', (ev.capacity || '—') + ' Students');

        /* ── SCHEDULE — update times in first row ── */
        setText('sTime1', formatTime(ev.time));

        /* ── SIDEBAR: REGISTRATION ── */
        var deadlineFmt = ev.regCloseDate
            ? formatDateLong(ev.regCloseDate)
            : 'Before event date';
        setText('sDeadline', deadlineFmt);

        // Remaining days
        var remEl = document.getElementById('deadlineRemaining');
        if (remEl) {
            if (ev.regCloseDate) {
                var diff = Math.ceil((new Date(ev.regCloseDate) - new Date()) / 86400000);
                remEl.textContent = diff > 0  ? '— ' + diff + ' days remaining'
                                  : diff === 0 ? '— Today!'
                                  :              '— Closed';
            } else {
                remEl.textContent = '';
            }
        }

        // Sidebar seats
        setText('sidebarSeats', remain + ' / ' + capacity);
        var sidebarProgBar = document.getElementById('sidebarProgressBar');
        if (sidebarProgBar) sidebarProgBar.setAttribute('aria-valuenow', pct);
        var sidebarProgEl = document.getElementById('sidebarProgress');
        if (sidebarProgEl) setTimeout(function () { sidebarProgEl.style.width = pct + '%'; }, 160);
        setText('sidebarSeatsSub', filled + ' seats filled · ' + remain + ' remaining');

        // Status badge in sidebar
        var statusBadge = document.getElementById('sidebarStatusBadge');
        if (statusBadge) statusBadge.textContent = statusObj.label || 'Open';

        /* ── SIDEBAR: VENUE & TIME ── */
        var venueParts = (ev.location || '').split(',');
        setText('venueHall',   venueParts[0] || ev.location);
        setText('venueFloor',  venueParts[1] ? venueParts[1].trim() : '');
        setText('venueDate',   formatDateLong(ev.date));
        setText('timingsBig',  formatTime(ev.time));
        setText('timingsEnd',  ev.endTime ? formatTime(ev.endTime) : '—');
        setText('metaVenue',   ev.location);

        /* ── FACULTY / ORGANIZER ── */
        setText('facultyName',  ev.organizer || 'Staff Coordinator');
        setText('facultyName2', ev.organizer || 'Staff Coordinator');
        setText('facultyRole',  ev.organizerRole || 'Faculty Coordinator');

        // Avatar initials
        var avatarEl = document.getElementById('organizerAvatar');
        if (avatarEl && ev.organizer) {
            var parts = ev.organizer.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').split(' ');
            avatarEl.textContent = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
        }

        // Email
        var emailEl     = document.getElementById('orgEmail');
        var emailLink   = document.getElementById('orgEmailLink');
        if (emailEl && ev.organizer) {
            var slug = ev.organizer
                .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '')
                .toLowerCase().replace(/\s+/g, '.');
            var email = slug + '@jainuniversity.ac.in';
            emailEl.textContent = email;
            if (emailLink) emailLink.href = 'mailto:' + email;
        }

        /* ── META TABLE ── */
        setText('metaCoordinator', ev.organizer || 'TBD');
        setText('metaDept',        getDepartmentName(ev.department));
        setText('metaCapacity',    (ev.capacity || '—') + ' seats');
        setText('metaStatus',      statusObj.label || 'Upcoming');
        setText('metaVenue',       ev.location);

        /* ── HIGHLIGHTS (past events only) ── */
        var highlightsSection = document.getElementById('highlightsSection');
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


    /* ─────────────────────────────────────────────────────────────────
       RELATED EVENTS
    ───────────────────────────────────────────────────────────────── */
    function renderRelatedEvents(ev) {
        var relatedGrid    = document.getElementById('relatedGrid');
        var relatedSection = document.getElementById('relatedSection');
        if (!relatedGrid) return;

        var related = state.events
            .filter(function (e) { return e.id !== ev.id && e.department === ev.department; })
            .slice(0, 3);

        if (!related.length) {
            if (relatedSection) relatedSection.style.display = 'none';
            return;
        }
        if (relatedSection) relatedSection.style.display = 'block';

        var iconMap = {
            'computer-science': 'fa-laptop-code',
            'mathematics':      'fa-square-root-alt',
            'physics':          'fa-atom',
            'chemistry':        'fa-flask',
            'biology':          'fa-dna',
            'english':          'fa-book-open',
            'history':          'fa-landmark'
        };
        var icon = iconMap[ev.department] || 'fa-calendar-alt';

        relatedGrid.innerHTML = related.map(function (r) {
            return '<div class="related-card" role="listitem" tabindex="0"' +
                   '     onclick="location.href=\'?id=' + escHtml(r.id) + '\'"' +
                   '     onkeydown="if(event.key===\'Enter\')location.href=\'?id=' + escHtml(r.id) + '\'">' +
                   '  <div class="related-card-img" aria-hidden="true">' +
                   '    <i class="fas ' + icon + '"></i>' +
                   '  </div>' +
                   '  <div class="related-card-body">' +
                   '    <span class="related-card-dept">' + escHtml(getDepartmentName(r.department)) + '</span>' +
                   '    <div class="related-card-name">' + escHtml(r.name) + '</div>' +
                   '    <div class="related-card-meta"><i class="fas fa-calendar-day" aria-hidden="true"></i> ' + escHtml(formatDateLong(r.date)) + '</div>' +
                   '    <div class="related-card-meta"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ' + escHtml(r.location) + '</div>' +
                   '  </div>' +
                   '</div>';
        }).join('');
    }


    /* ─────────────────────────────────────────────────────────────────
       HIGHLIGHTS MINI-CAROUSEL
    ───────────────────────────────────────────────────────────────── */
    var hlIndex = 0;
    var hlTrack = document.getElementById('hlTrack');
    var hlDots  = document.querySelectorAll('.hl-dot');

    function hlGoTo(idx) {
        hlIndex = ((idx % 3) + 3) % 3;
        if (hlTrack) hlTrack.style.transform = 'translateX(-' + (hlIndex * 100) + '%)';
        hlDots.forEach(function (d, i) {
            d.classList.toggle('active', i === hlIndex);
            d.setAttribute('aria-selected', String(i === hlIndex));
        });
    }

    document.getElementById('hlNext')?.addEventListener('click', function () { hlGoTo(hlIndex + 1); });
    document.getElementById('hlPrev')?.addEventListener('click', function () { hlGoTo(hlIndex - 1); });
    hlDots.forEach(function (d) { d.addEventListener('click', function () { hlGoTo(+d.dataset.idx); }); });

    // Auto-advance highlights carousel
    setInterval(function () {
        var hs = document.getElementById('highlightsSection');
        if (hs && hs.style.display !== 'none') hlGoTo(hlIndex + 1);
    }, 4000);


    /* ─────────────────────────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────────────────────────── */
    function showWelcome() {
        bentoWelcome.style.display = 'flex';
        bentoDetail.style.display  = 'none';
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = (val !== undefined && val !== null && val !== '') ? val : '—';
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Fallback timeline inference if app.js doesn't provide getEventTimeline
    function inferTimeline(dateStr) {
        if (!dateStr) return 'future';
        var evDate  = new Date(dateStr);
        var today   = new Date();
        var todayStr = today.toDateString();
        if (evDate.toDateString() === todayStr) return 'present';
        return evDate > today ? 'future' : 'past';
    }

    /* ── Toast notification ── */
    var _toastTimer = null;
    function showBentoToast(msg) {
        var el  = document.getElementById('bentoToast');
        var txt = document.getElementById('bentoToastMsg');
        if (!el) return;
        if (txt) txt.textContent = msg;
        el.classList.add('show');
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3000);
    }

    // Expose toast globally so HTML inline onclick handlers can call it
    window.showBentoToastGlobal = showBentoToast;

});