;(function () {
  'use strict'

  // Skip tracking on admin pages
  if (window.location.pathname.startsWith('/admin')) return

  var API_EVENT = '/api/analytics/event'
  var API_HEARTBEAT = '/api/analytics/heartbeat'
  var HEARTBEAT_INTERVAL = 30000 // 30s
  var BATCH_INTERVAL = 5000 // 5s

  // IDs
  var visitorId = localStorage.getItem('_vid')
  if (!visitorId) {
    visitorId = uuid()
    localStorage.setItem('_vid', visitorId)
  }
  var sessionId = sessionStorage.getItem('_sid')
  if (!sessionId) {
    sessionId = uuid()
    sessionStorage.setItem('_sid', sessionId)
  }

  var currentPage = window.location.pathname
  var currentPageViewId = uuid()
  var pageEnterTime = Date.now()
  var eventQueue = []
  var heartbeatTimer = null
  var batchTimer = null

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }

  function debugLog(hypothesisId, location, message, data) {
    fetch('http://127.0.0.1:7460/ingest/7cf089c7-4d6e-431f-b961-980290614486',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42da84'},body:JSON.stringify({sessionId:'42da84',runId:'post-fix',hypothesisId:hypothesisId,location:location,message:message,data:data,timestamp:Date.now()})}).catch(function () {})
  }

  function send(url, data, beacon) {
    var json = JSON.stringify(data)
    // #region agent log
    debugLog('H1', 'public/tracker.js:send:start', 'About to send analytics payload', {
      url: url,
      type: data && data.type ? data.type : null,
      beacon: !!beacon,
      hasSessionId: !!(data && data.sessionId),
      hasVisitorId: !!(data && data.visitorId),
    })
    // #endregion
    if (beacon && navigator.sendBeacon) {
      var beaconResult = navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }))
      // #region agent log
      debugLog('H2', 'public/tracker.js:send:beacon', 'sendBeacon result', {
        url: url,
        type: data && data.type ? data.type : null,
        beaconResult: beaconResult,
      })
      // #endregion
    } else {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '42da84',
        },
        body: json,
        keepalive: true,
      }).then(function (response) {
        response.text().then(function (responseBody) {
          // #region agent log
          debugLog('H3', 'public/tracker.js:send:response', 'Fetch analytics response', {
            url: url,
            type: data && data.type ? data.type : null,
            status: response.status,
            ok: response.ok,
            bodySnippet: (responseBody || '').slice(0, 220),
          })
          // #endregion
        })
      }).catch(function (err) {
        // #region agent log
        debugLog('H4', 'public/tracker.js:send:catch', 'Fetch analytics failed before response', {
          url: url,
          type: data && data.type ? data.type : null,
          error: err && err.message ? err.message : String(err),
        })
        // #endregion
        if (typeof console !== 'undefined') console.warn('[tracker] send failed:', err)
      })
    }
  }

  function sendEvent(type, data, beacon) {
    send(API_EVENT, { type: type, sessionId: sessionId, visitorId: visitorId, data: data }, beacon)
  }

  function flushBatch() {
    if (eventQueue.length === 0) return
    var events = eventQueue.slice()
    eventQueue = []
    send(API_EVENT, { type: 'batch', sessionId: sessionId, visitorId: visitorId, data: { events: events } })
  }

  function queueEvent(type, page, target, details) {
    eventQueue.push({ type: type, page: page, target: target, details: details, timestamp: Date.now() })
    if (eventQueue.length >= 10) flushBatch()
  }

  // Session start
  sendEvent('session_start', {
    page: currentPage,
    userAgent: navigator.userAgent,
    referrer: document.referrer || null,
    screenWidth: screen.width,
    screenHeight: screen.height,
    language: navigator.language,
  })

  // Page enter
  sendEvent('page_enter', { page: currentPage, pageViewId: currentPageViewId, from: document.referrer || null })

  // Heartbeat
  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(function () {
      send(API_HEARTBEAT, { sessionId: sessionId, page: currentPage })
    }, HEARTBEAT_INTERVAL)
  }
  startHeartbeat()

  // Batch flush timer
  batchTimer = setInterval(flushBatch, BATCH_INTERVAL)

  // Page leave
  function onPageLeave() {
    var duration = Math.round((Date.now() - pageEnterTime) / 1000)
    var data = { page: currentPage, pageViewId: currentPageViewId, duration: duration }
    sendEvent('page_leave', data, true)
    flushBatch()
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') onPageLeave()
  })

  window.addEventListener('beforeunload', function () {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (batchTimer) clearInterval(batchTimer)
    onPageLeave()
  })

  // Navigation tracking (for Astro view transitions / SPA-like navigation)
  function handleNavigation(newPage) {
    if (newPage === currentPage) return
    var duration = Math.round((Date.now() - pageEnterTime) / 1000)
    sendEvent('page_leave', {
      page: currentPage,
      pageViewId: currentPageViewId,
      duration: duration,
    })
    var prevPage = currentPage
    currentPage = newPage
    currentPageViewId = uuid()
    pageEnterTime = Date.now()
    sendEvent('page_enter', { page: currentPage, pageViewId: currentPageViewId, from: prevPage })
  }

  // Listen for Astro page transitions
  document.addEventListener('astro:page-load', function () {
    handleNavigation(window.location.pathname)
  })

  // Fallback: popstate for regular navigation
  window.addEventListener('popstate', function () {
    handleNavigation(window.location.pathname)
  })

  // Click tracking
  document.addEventListener('click', function (e) {
    var el = e.target
    // Walk up to find meaningful element (button, a, [data-track])
    var tracked = el
    for (var i = 0; i < 5; i++) {
      if (!tracked) break
      var tag = tracked.tagName ? tracked.tagName.toLowerCase() : ''
      if (tag === 'a' || tag === 'button' || tracked.getAttribute('data-track')) break
      tracked = tracked.parentElement
    }
    if (!tracked) return

    var tag = tracked.tagName ? tracked.tagName.toLowerCase() : ''
    var text = (tracked.innerText || tracked.textContent || '').trim().slice(0, 100)
    var href = tracked.getAttribute('href') || null
    var id = tracked.id || null
    var classes = tracked.className && typeof tracked.className === 'string'
      ? tracked.className.split(' ').filter(Boolean).slice(0, 5).join(' ')
      : null

    var target = text || href || id || tag

    queueEvent('click', currentPage, target, {
      tag: tag,
      id: id,
      classes: classes,
      href: href,
      text: text,
    })
  }, true)

  // Form submit tracking
  document.addEventListener('submit', function (e) {
    var form = e.target
    var id = form.id || null
    var action = form.action || null
    var name = form.getAttribute('name') || null
    queueEvent('form_submit', currentPage, name || id || action || 'form', {
      id: id,
      action: action,
      name: name,
    })
  }, true)
})()
