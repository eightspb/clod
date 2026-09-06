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

  function send(url, data, beacon) {
    var json = JSON.stringify(data)
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }))
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(function (err) {
        if (typeof console !== 'undefined') console.warn('[tracker] send failed:', err)
      })
    }
  }

  function getEventUrl(type) {
    var eventType = type || 'unknown'
    return API_EVENT + '?event=' + encodeURIComponent(eventType)
  }

  function sendEvent(type, data, beacon) {
    send(getEventUrl(type), { type: type, sessionId: sessionId, visitorId: visitorId, data: data }, beacon)
  }

  function flushBatch() {
    if (eventQueue.length === 0) return
    var events = eventQueue.slice()
    eventQueue = []
    send(getEventUrl('batch'), { type: 'batch', sessionId: sessionId, visitorId: visitorId, data: { events: events } })
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

  // Click tracking: only links, buttons and explicit data-track targets; never the text of the
  // clicked element, because it can be a patient's own data on the booking review screen.
  document.addEventListener('click', function (e) {
    var tracked = e.target
    var matched = false
    for (var i = 0; i < 5 && tracked; i++) {
      var tag = tracked.tagName ? tracked.tagName.toLowerCase() : ''
      if (tag === 'a' || tag === 'button' || (tracked.getAttribute && tracked.getAttribute('data-track'))) {
        matched = true
        break
      }
      tracked = tracked.parentElement
    }
    if (!matched) return

    var trackedTag = tracked.tagName.toLowerCase()
    var href = tracked.getAttribute('href') || null
    var id = tracked.id || null
    var track = tracked.getAttribute('data-track') || null
    var classes = tracked.className && typeof tracked.className === 'string'
      ? tracked.className.split(' ').filter(Boolean).slice(0, 5).join(' ')
      : null

    queueEvent('click', currentPage, track || href || id || trackedTag, {
      tag: trackedTag,
      id: id,
      classes: classes,
      href: href,
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
