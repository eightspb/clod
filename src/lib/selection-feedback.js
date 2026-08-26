const CLICK_DURATION_SECONDS = 0.018

function ignoreFailure() {
  return undefined
}

function emitAudioClick(audioContext) {
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(700, now)
  oscillator.frequency.exponentialRampToValueAtTime(480, now + CLICK_DURATION_SECONDS)
  gain.gain.setValueAtTime(0.028, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + CLICK_DURATION_SECONDS)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + CLICK_DURATION_SECONDS)
}

export function createSelectionFeedback(environment = globalThis) {
  let audioContext
  let closed = false
  function getAudioContext() {
    const AudioContextClass = environment.AudioContext || environment.webkitAudioContext
    if (!AudioContextClass) return undefined
    audioContext ||= new AudioContextClass({ latencyHint: 'interactive' })
    return audioContext
  }
  function play() {
    if (closed) return
    try {
      environment.navigator?.vibrate?.(8)
    } catch (error) {
      ignoreFailure(error)
    }
    try {
      const activeContext = getAudioContext()
      if (!activeContext) return
      if (activeContext.state === 'running') {
        emitAudioClick(activeContext)
        return
      }
      Promise.resolve(activeContext.resume())
        .then(() => {
          if (!closed) emitAudioClick(activeContext)
        })
        .catch(ignoreFailure)
    } catch (error) {
      ignoreFailure(error)
    }
  }
  function close() {
    if (closed) return
    closed = true
    try {
      const closing = audioContext?.close?.()
      if (closing?.catch) closing.catch(ignoreFailure)
    } catch (error) {
      ignoreFailure(error)
    }
  }
  return { close, play }
}
