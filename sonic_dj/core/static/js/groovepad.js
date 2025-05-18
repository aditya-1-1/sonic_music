document.addEventListener("DOMContentLoaded", () => {
  // Initialize Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const masterGainNode = audioContext.createGain()
  masterGainNode.connect(audioContext.destination)

  // Set up audio analyzer for visualizer
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  masterGainNode.connect(analyser)

  // Variables for recording
  let mediaRecorder
  let recordedChunks = []
  let isRecording = false
  let recordingStream

  // Pad tracking
  const activePads = new Map()
  const padNodes = new Map()

  // Session storage
  const sessions = JSON.parse(localStorage.getItem("groovePadSessions") || "{}")

  // DOM Elements
  const padContainer = document.querySelector(".pad-container")
  const padTemplate = document.getElementById("pad-template")
  const visualizerCanvas = document.getElementById("visualizer")
  const visualizerCtx = visualizerCanvas.getContext("2d")
  const masterVolumeControl = document.getElementById("master-volume")
  const bpmControl = document.getElementById("bpm")
  const stopAllButton = document.getElementById("stop-all")
  const recordToggleButton = document.getElementById("record-toggle")
  const downloadRecordingButton = document.getElementById("download-recording")
  const saveSessionButton = document.getElementById("save-session")
  const loadSessionSelect = document.getElementById("load-session")
  const modeBtns = document.querySelectorAll(".mode-btn")

  // Set canvas size
  function resizeCanvas() {
    visualizerCanvas.width = visualizerCanvas.offsetWidth
    visualizerCanvas.height = visualizerCanvas.offsetHeight
  }
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  // Initialize master volume
  masterVolumeControl.addEventListener("input", function () {
    const volume = this.value / 100
    masterGainNode.gain.value = volume
  })
  masterGainNode.gain.value = masterVolumeControl.value / 100

  // Initialize BPM
  let currentBPM = Number.parseInt(bpmControl.value)
  bpmControl.addEventListener("input", function () {
    currentBPM = Number.parseInt(this.value)
  })

  // Stop all sounds
  stopAllButton.addEventListener("click", () => {
    stopAllSounds()
  })

  function stopAllSounds() {
    activePads.forEach((audioData, pad) => {
      stopPad(pad)
    })
  }

  // Draw visualizer
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    const width = visualizerCanvas.width
    const height = visualizerCanvas.height

    visualizerCtx.clearRect(0, 0, width, height)

    const barWidth = width / bufferLength

    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height

      // Create gradient for bars
      const gradient = visualizerCtx.createLinearGradient(0, height, 0, height - barHeight)
      gradient.addColorStop(0, "rgba(106, 0, 255, 0.8)")
      gradient.addColorStop(1, "rgba(255, 0, 255, 0.8)")

      visualizerCtx.fillStyle = gradient
      visualizerCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight)

      x += barWidth
    }
  }

  // Recording functionality - captures actual audio output
  recordToggleButton.addEventListener("click", () => {
    if (!isRecording) {
      try {
        recordedChunks = []

        // Create a MediaStreamDestination to capture the audio output
        const destinationNode = audioContext.createMediaStreamDestination()

        // Connect the master gain node to the destination
        masterGainNode.connect(destinationNode)
        recordingStream = destinationNode.stream

        // Create a MediaRecorder to record the stream
        mediaRecorder = new MediaRecorder(destinationNode.stream)

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunks.push(e.data)
          }
        }

        mediaRecorder.onstop = () => {
          // Disconnect the destination node when recording stops
          masterGainNode.disconnect(destinationNode)
          downloadRecordingButton.disabled = false
        }

        mediaRecorder.start(1000) // Collect data every second
        isRecording = true
        recordToggleButton.textContent = "Stop Recording"
        recordToggleButton.classList.add("recording")
      } catch (err) {
        console.error("Error recording audio:", err)
        alert("Could not start recording.")
      }
    } else {
      mediaRecorder.stop()
      isRecording = false
      recordToggleButton.textContent = "Record"
      recordToggleButton.classList.remove("recording")
    }
  })

  // Download recording
  downloadRecordingButton.addEventListener("click", () => {
    if (recordedChunks.length === 0) return

    const blob = new Blob(recordedChunks, { type: "audio/webm" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = "groovepad-recording.webm"
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 100)
  })

  // Session management
  function updateSessionList() {
    // Clear existing options except the first one
    while (loadSessionSelect.options.length > 1) {
      loadSessionSelect.remove(1)
    }

    // Add session options
    Object.keys(sessions).forEach((sessionName) => {
      const option = document.createElement("option")
      option.value = sessionName
      option.textContent = sessionName
      loadSessionSelect.appendChild(option)
    })
  }

  saveSessionButton.addEventListener("click", () => {
    const sessionName = prompt("Enter a name for this session:")
    if (!sessionName) return

    const sessionData = {
      pads: {},
    }

    padNodes.forEach((nodeData, padElement) => {
      const padId = padElement.dataset.sound
      sessionData.pads[padId] = {
        active: padElement.classList.contains("active"),
        volume: nodeData.gainNode.gain.value,
        delay: nodeData.delayNode ? nodeData.delayNode.delayTime.value : 0,
        filter: nodeData.filterNode ? nodeData.filterNode.frequency.value : 20000,
        loop: padElement.querySelector(".loop-btn").classList.contains("active"),
      }
    })

    sessions[sessionName] = sessionData
    localStorage.setItem("groovePadSessions", JSON.stringify(sessions))
    updateSessionList()

    alert(`Session "${sessionName}" saved!`)
  })

  loadSessionSelect.addEventListener("change", function () {
    const sessionName = this.value
    if (!sessionName) return

    const sessionData = sessions[sessionName]
    if (!sessionData) return

    // Stop all current sounds
    stopAllSounds()

    // Apply session data
    Object.entries(sessionData.pads).forEach(([padId, settings]) => {
      const padElement = document.querySelector(`.pad[data-sound="${padId}"]`)
      if (!padElement) return

      const nodeData = padNodes.get(padElement)
      if (!nodeData) return

      // Set volume
      nodeData.gainNode.gain.value = settings.volume
      padElement.querySelector(".volume-control").value = settings.volume * 100

      // Set delay if available
      if (nodeData.delayNode && settings.delay) {
        nodeData.delayNode.delayTime.value = settings.delay
        padElement.querySelector(".delay-control").value = settings.delay * 10
      }

      // Set filter if available
      if (nodeData.filterNode && settings.filter) {
        nodeData.filterNode.frequency.value = settings.filter
        const filterValue = (Math.log10(settings.filter) - 2) * 25 // Convert from log scale
        padElement.querySelector(".filter-control").value = Math.min(100, Math.max(0, filterValue))
      }

      // Set loop
      const loopBtn = padElement.querySelector(".loop-btn")
      if (settings.loop) {
        loopBtn.classList.add("active")
      } else {
        loopBtn.classList.remove("active")
      }

      // Activate pad if it was active
      if (settings.active) {
        playPad(padElement)
      }
    })

    alert(`Session "${sessionName}" loaded!`)
  })

  // Initialize session list
  updateSessionList()

  // Mode filtering
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      modeBtns.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")

      const mode = this.dataset.mode
      const pads = document.querySelectorAll(".pad")

      if (mode === "all") {
        pads.forEach((pad) => (pad.style.display = "flex"))
      } else {
        pads.forEach((pad) => {
          if (pad.dataset.category === mode) {
            pad.style.display = "flex"
          } else {
            pad.style.display = "none"
          }
        })
      }
    })
  })

  // Create audio buffer cache
  const audioBufferCache = new Map()

  // Load audio file and cache it
  async function loadAudio(url) {
    if (audioBufferCache.has(url)) {
      return audioBufferCache.get(url)
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to load audio: ${url} - Status: ${response.status}`)
        return null
      }

      const arrayBuffer = await response.arrayBuffer()
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error(`Empty audio data received for: ${url}`)
        return null
      }

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      if (!audioBuffer) {
        console.error(`Failed to decode audio data for: ${url}`)
        return null
      }

      audioBufferCache.set(url, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error(`Error loading audio (${url}):`, error)
      return null
    }
  }

  // Modified playPad function to handle loading errors
  async function playPad(pad) {
    if (pad.classList.contains("active")) return

    const soundUrl = pad.dataset.sound
    try {
      const audioBuffer = await loadAudio(soundUrl)
      if (!audioBuffer) {
        pad.querySelector(".beat-name").textContent += " (Error)"
        pad.style.opacity = "0.5"
        return
      }

      const nodeData = padNodes.get(pad)
      if (!nodeData) return

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer

      source.connect(nodeData.gainNode)
      const loopBtn = pad.querySelector(".loop-btn")
      source.loop = loopBtn.classList.contains("active")

      source.start()
      pad.classList.add("active")

      activePads.set(pad, {
        source,
        startTime: audioContext.currentTime,
      })

      if (!source.loop) {
        source.onended = () => {
          pad.classList.remove("active")
          activePads.delete(pad)
        }
      }
    } catch (error) {
      console.error(`Error playing pad (${soundUrl}):`, error)
      pad.querySelector(".beat-name").textContent += " (Error)"
      pad.style.opacity = "0.5"
    }
  }

  // Sample audio data (replace with your actual data source)
  const audioData = {
    pads: [
      { name: "Beat 1", sound: "/static/audio/beat1.mp3" },
      { name: "Beat 2", sound: "/static/audio/Beat2.mp3" },
      { name: "Beat 3", sound: "/static/audio/Beat3.mp3" },
      { name: "Beat 4", sound: "/static/audio/Beat4.mp3" },
      { name: "Beat 5", sound: "/static/audio/Beat5.mp3" },
      { name: "Beat 6", sound: "/static/audio/Beat6.mp3" },
      { name: "Beat 7", sound: "/static/audio/Beat7.mp3" },
      { name: "Beat 8", sound: "/static/audio/Beat8.mp3" },
      { name: "Beat 9", sound: "/static/audio/Beat9.mp3" },
      { name: "Beat 10", sound: "/static/audio/Beat10.mp3" },
      { name: "Arijit", sound: "/static/audio/arijit.mp3" },
      { name: "Bollywood", sound: "/static/audio/bollywood.mp3" },
      { name: "Lofi", sound: "/static/audio/lofi.mp3" },
      { name: "Soulful", sound: "/static/audio/soulful.mp3" },
      { name: "Night", sound: "/static/audio/night.mp3" },
    ],
  }

  // Create pads from audio data
  function createPads() {
    // Categorize pads
    const categories = {
      beats: ["Beat 1", "Beat 2", "Beat 3", "Beat 4", "Beat 5", "Beat 6", "Beat 7", "Beat 8", "Beat 9", "Beat 10"],
      melody: ["Arijit", "Bollywood", "Lofi", "Soulful"],
      fx: ["Night"],
    }

    audioData.pads.forEach((padData) => {
      // Determine category
      let category = "fx"
      for (const [cat, names] of Object.entries(categories)) {
        if (names.includes(padData.name)) {
          category = cat
          break
        }
      }

      // Clone template
      const padClone = padTemplate.content.cloneNode(true)
      const pad = padClone.querySelector(".pad")

      // Set attributes
      pad.setAttribute("data-sound", padData.sound)
      pad.setAttribute("data-category", category)
      pad.querySelector(".beat-name").textContent = padData.name

      // Create audio nodes for this pad
      const gainNode = audioContext.createGain()
      const filterNode = audioContext.createBiquadFilter()
      const delayNode = audioContext.createDelay(5.0)
      const feedbackNode = audioContext.createGain()

      // Set up audio graph
      filterNode.type = "lowpass"
      filterNode.frequency.value = 20000 // Default to max

      delayNode.delayTime.value = 0 // Default no delay
      feedbackNode.gain.value = 0.3 // 30% feedback

      // Connect nodes
      gainNode.connect(filterNode)
      filterNode.connect(masterGainNode)

      // Delay path
      filterNode.connect(delayNode)
      delayNode.connect(feedbackNode)
      feedbackNode.connect(delayNode)
      delayNode.connect(masterGainNode)

      // Store nodes
      padNodes.set(pad, {
        gainNode,
        filterNode,
        delayNode,
        feedbackNode,
      })

      // Set up controls
      const volumeControl = pad.querySelector(".volume-control")
      volumeControl.addEventListener("input", function () {
        gainNode.gain.value = this.value / 100
      })
      gainNode.gain.value = volumeControl.value / 100

      const delayControl = pad.querySelector(".delay-control")
      delayControl.addEventListener("input", function () {
        delayNode.delayTime.value = this.value / 100
      })

      const filterControl = pad.querySelector(".filter-control")
      filterControl.addEventListener("input", function () {
        // Logarithmic scale for frequency (100Hz to 20000Hz)
        const value = this.value / 100
        const frequency = Math.pow(10, 2 + value * 3) // 100Hz to 20000Hz
        filterNode.frequency.value = frequency
      })

      const loopBtn = pad.querySelector(".loop-btn")
      loopBtn.addEventListener("click", function () {
        this.classList.toggle("active")
      })

      // Play/stop on click
      const padContent = pad.querySelector(".pad-content")
      padContent.addEventListener("click", () => {
        const isActive = pad.classList.contains("active")

        if (isActive) {
          stopPad(pad)
        } else {
          playPad(pad)
        }
      })

      // Add to container
      padContainer.appendChild(pad)
    })
  }

  // Play a pad
  async function playPad(pad) {
    if (pad.classList.contains("active")) return

    const soundUrl = pad.dataset.sound
    const audioBuffer = await loadAudio(soundUrl)

    if (!audioBuffer) return

    const nodeData = padNodes.get(pad)
    if (!nodeData) return

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer

    // Connect to the pad's gain node
    source.connect(nodeData.gainNode)

    // Set loop based on button state
    const loopBtn = pad.querySelector(".loop-btn")
    source.loop = loopBtn.classList.contains("active")

    // Start playback
    source.start()
    pad.classList.add("active")

    // Store source for later stopping
    activePads.set(pad, {
      source,
      startTime: audioContext.currentTime,
    })

    // Handle non-looping sounds ending
    if (!source.loop) {
      source.onended = () => {
        pad.classList.remove("active")
        activePads.delete(pad)
      }
    }
  }

  // Stop a pad
  function stopPad(pad) {
    const audioData = activePads.get(pad)
    if (!audioData) return

    try {
      audioData.source.stop()
    } catch (e) {
      // Source might have already stopped
    }

    pad.classList.remove("active")
    activePads.delete(pad)
  }

  // Initialize
  createPads()
  drawVisualizer()

  // Resume audio context on user interaction (required by browsers)
  document.body.addEventListener(
    "click",
    () => {
      if (audioContext.state === "suspended") {
        audioContext.resume()
      }
    },
    { once: true },
  )

  // Custom Beat Upload Functionality
  const addCustomBeatButton = document.getElementById("add-custom-beat")
  const customBeatModal = document.getElementById("custom-beat-modal")
  const closeModalButton = document.querySelector(".close-modal")
  const uploadBeatButton = document.getElementById("upload-beat")
  const beatNameInput = document.getElementById("beat-name")
  const beatCategorySelect = document.getElementById("beat-category")
  const beatFileInput = document.getElementById("beat-file")

  // Custom beats storage
  const customBeats = JSON.parse(localStorage.getItem("customBeats") || "[]")

  // Show modal
  addCustomBeatButton.addEventListener("click", () => {
    customBeatModal.style.display = "block"
  })

  // Close modal
  closeModalButton.addEventListener("click", () => {
    customBeatModal.style.display = "none"
  })

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === customBeatModal) {
      customBeatModal.style.display = "none"
    }
  })

  // Handle beat upload
  uploadBeatButton.addEventListener("click", async () => {
    const name = beatNameInput.value.trim()
    const category = beatCategorySelect.value
    const file = beatFileInput.files[0]

    if (!name) {
      alert("Please enter a name for your beat")
      return
    }

    if (!file) {
      alert("Please select an audio file")
      return
    }

    try {
      // Create a URL for the file
      const fileURL = URL.createObjectURL(file)

      // Create a new pad data object
      const newPadData = {
        name: name,
        sound: fileURL,
        isCustom: true,
        category: category,
      }

      // Add to custom beats array and save to localStorage
      customBeats.push(newPadData)
      localStorage.setItem("customBeats", JSON.stringify(customBeats))

      // Create a new pad element
      createCustomPad(newPadData)

      // Reset form and close modal
      beatNameInput.value = ""
      beatFileInput.value = ""
      customBeatModal.style.display = "none"

      alert("Custom beat added successfully!")
    } catch (error) {
      console.error("Error adding custom beat:", error)
      alert("Failed to add custom beat. Please try again.")
    }
  })

  // Function to create a custom pad
  function createCustomPad(padData) {
    // Clone template
    const padClone = padTemplate.content.cloneNode(true)
    const pad = padClone.querySelector(".pad")

    // Set attributes
    pad.setAttribute("data-sound", padData.sound)
    pad.setAttribute("data-category", padData.category)
    pad.querySelector(".beat-name").textContent = padData.name

    // Add custom class for styling
    if (padData.isCustom) {
      pad.classList.add("custom-pad")
    }

    // Create audio nodes for this pad
    const gainNode = audioContext.createGain()
    const filterNode = audioContext.createBiquadFilter()
    const delayNode = audioContext.createDelay(5.0)
    const feedbackNode = audioContext.createGain()

    // Set up audio graph
    filterNode.type = "lowpass"
    filterNode.frequency.value = 20000 // Default to max

    delayNode.delayTime.value = 0 // Default no delay
    feedbackNode.gain.value = 0.3 // 30% feedback

    // Connect nodes
    gainNode.connect(filterNode)
    filterNode.connect(masterGainNode)

    // Delay path
    filterNode.connect(delayNode)
    delayNode.connect(feedbackNode)
    feedbackNode.connect(delayNode)
    delayNode.connect(masterGainNode)

    // Store nodes
    padNodes.set(pad, {
      gainNode,
      filterNode,
      delayNode,
      feedbackNode,
    })

    // Set up controls
    const volumeControl = pad.querySelector(".volume-control")
    volumeControl.addEventListener("input", function () {
      gainNode.gain.value = this.value / 100
    })
    gainNode.gain.value = volumeControl.value / 100

    const delayControl = pad.querySelector(".delay-control")
    delayControl.addEventListener("input", function () {
      delayNode.delayTime.value = this.value / 100
    })

    const filterControl = pad.querySelector(".filter-control")
    filterControl.addEventListener("input", function () {
      // Logarithmic scale for frequency (100Hz to 20000Hz)
      const value = this.value / 100
      const frequency = Math.pow(10, 2 + value * 3) // 100Hz to 20000Hz
      filterNode.frequency.value = frequency
    })

    const loopBtn = pad.querySelector(".loop-btn")
    loopBtn.addEventListener("click", function () {
      this.classList.toggle("active")
    })

    // Play/stop on click
    const padContent = pad.querySelector(".pad-content")
    padContent.addEventListener("click", () => {
      const isActive = pad.classList.contains("active")

      if (isActive) {
        stopPad(pad)
      } else {
        playPad(pad)
      }
    })

    // Add to container
    padContainer.appendChild(pad)
  }

  // Load custom beats on startup
  function loadCustomBeats() {
    customBeats.forEach((beatData) => {
      createCustomPad(beatData)
    })
  }

  // Call this after createPads()
  loadCustomBeats()
})
