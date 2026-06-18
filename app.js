/* ==========================================================================
   SimAssess Pro - Application Logic & Interactive State Controller
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================================================
  // Mock Data definitions
  // ==========================================================================

  const timelineEvents = [
    {
      time: "00:12",
      seconds: 12,
      title: "Patient Unresponsive Confirmed",
      type: "compliance",
      desc: "Candidate immediately checked responsiveness and carotid pulse simultaneously.",
      guideline: "AHA ACLS Section 1.1: Check for responsiveness, breathing, and carotid pulse simultaneously. This assessment must be completed within 10 seconds to avoid delays in care.",
      transcript: "LEADER (Marcus): Patient is unresponsive. Checking carotid pulse... no pulse detected. No breathing.",
      metric: "Pulse Check Duration: 6 seconds (Compliant, Target: < 10s)",
      stepId: "step-1"
    },
    {
      time: "00:28",
      seconds: 28,
      title: "Code Blue Activated",
      type: "compliance",
      desc: "Emergency response team summoned and resuscitation cart/defibrillator requested.",
      guideline: "AHA ACLS Section 1.2: If pulse is absent, immediately activate the emergency response system or call Code Blue, and retrieve the defibrillator and crash cart.",
      transcript: "LEADER (Marcus): Sarah, activate Code Blue immediately and get the crash cart with the defibrillator in here now!",
      metric: "Activation Delay: 16 seconds from room entry (Compliant, Target: < 30s)",
      stepId: "step-2"
    },
    {
      time: "00:45",
      seconds: 45,
      title: "High-Quality CPR Initiated",
      type: "compliance",
      desc: "Chest compressions started at the correct rate (112 bpm) and appropriate depth.",
      guideline: "AHA ACLS Section 2.1: Perform chest compressions at a rate of 100-120 bpm and a depth of 5-6 cm, allowing full chest recoil between compressions and avoiding leaning.",
      transcript: "COMPRESSOR: Starting compressions. One, two, three, four...",
      metric: "Compression Rate: 112 bpm (Compliant, Target: 100-120 bpm)",
      stepId: "step-3"
    },
    {
      time: "01:32",
      seconds: 92,
      title: "BVM Ventilations Started",
      type: "compliance",
      desc: "Bag-valve-mask ventilations delivered at a compliant 30:2 ratio.",
      guideline: "AHA ACLS Section 2.3: Provide ventilations with bag-valve-mask connected to high-flow oxygen. Keep compression-to-ventilation ratio at 30:2 prior to advanced airway insertion.",
      transcript: "LEADER (Marcus): Deliver two breaths after the next compression cycle. OK, breathe... breathe. Excellent, resume compressions.",
      metric: "Ventilation Ratio: 30:2 (Compliant)",
      stepId: "step-4"
    },
    {
      time: "02:02",
      seconds: 122,
      title: "Defibrillator Pads Applied",
      type: "compliance",
      desc: "Biphasic defibrillator pads applied to standard sternum-apex positions.",
      guideline: "AHA ACLS Section 3.1: Apply self-adhesive defibrillation pads to the patient's bare chest (sternum-apex position) as soon as the defibrillator is available.",
      transcript: "SARAH: Crash cart is here. Pads are on. Stand clear for rhythm analysis!",
      metric: "Pads Position: Anterolateral (Compliant)",
      stepId: "step-5"
    },
    {
      time: "02:18",
      seconds: 138,
      title: "Shock Delivered (120J Biphasic)",
      type: "compliance",
      desc: "Shock delivered safely for shockable rhythm. Safe clearance confirmed.",
      guideline: "AHA ACLS Section 3.2: Deliver shock immediately if rhythm is Ventricular Fibrillation (VF) or Pulseless Ventricular Tachycardia (pVT). Verify all personnel are clear.",
      transcript: "LEADER (Marcus): Rhythm is V-Fib. Charging defibrillator to 120 Joules. Everyone clear? I'm clear, you're clear, we're all clear. Shocking now. Shock delivered.",
      metric: "Rhythm: Ventricular Fibrillation (Shockable)",
      stepId: "step-6"
    },
    {
      time: "02:22",
      seconds: 142,
      title: "CPR Pause Delay (Protocol Deviation)",
      type: "deviation",
      desc: "Interruption in chest compressions during defibrillation cycle exceeded 10 seconds.",
      guideline: "AHA ACLS Section 3.3: Minimize interruptions in chest compressions. Interruptions for rhythm analysis and shock administration must be kept under 10 seconds to maintain coronary perfusion pressure.",
      transcript: "SARAH: Shock delivered. Wait, let me adjust the pads... okay, they are secure now. Resuming compressions.",
      metric: "Hands-off Time: 14 seconds (Non-compliant, Target: < 10s)",
      stepId: "step-7"
    },
    {
      time: "03:05",
      seconds: 185,
      title: "Epinephrine 1mg IV Administered",
      type: "compliance",
      desc: "First epinephrine dose administered intravenously after the second rhythm check.",
      guideline: "AHA ACLS Cardiac Arrest Algorithm: Administer Epinephrine 1mg IV/IO every 3-5 minutes. The first dose is typically given after the second shockable rhythm analysis.",
      transcript: "LEADER (Marcus): Epi 1mg IV push. Flush with 20cc saline. Note the time.",
      metric: "Epinephrine Timing: 3 min 05s (Compliant)",
      stepId: "step-8"
    }
  ];

  // Guideline checklist metadata for review panel
  let checklistItems = [
    { id: "chk-1", text: "Rapid arrest recognition (<10s)", compliant: true, timelineSec: 12 },
    { id: "chk-2", text: "Code Blue activation (<30s)", compliant: true, timelineSec: 28 },
    { id: "chk-3", text: "High-quality chest compressions", compliant: true, timelineSec: 45 },
    { id: "chk-4", text: "Proper compression-ventilation ratio", compliant: true, timelineSec: 92 },
    { id: "chk-5", text: "Defibrillator pads placement", compliant: true, timelineSec: 122 },
    { id: "chk-6", text: "Minimize CPR interruptions (<10s)", compliant: false, timelineSec: 142 },
    { id: "chk-7", text: "Epinephrine dose & timing (3-5m)", compliant: true, timelineSec: 185 }
  ];

  // Graded report categories
  const reportCategories = [
    { name: "Recognition & Response Activation", score: 100, status: "emerald" },
    { name: "CPR Quality (Depth & Rate)", score: 95, status: "emerald" },
    { name: "Defibrillation Protocol Compliance", score: 80, status: "amber" },
    { name: "Pharmacotherapy Protocol Compliance", score: 100, status: "emerald" },
    { name: "Team Leadership & Comm Skills", score: 90, status: "emerald" }
  ];

  // ==========================================================================
  // Core Application State
  // ==========================================================================
  
  let state = {
    currentScreen: "screen-login",
    activeStudent: "Marcus Chen",
    videoUploaded: false,
    transcriptUploaded: false,
    activeTimelineEventIndex: null,
    monitorPlaying: false,
    monitorTime: 0, // seconds
    monitorDuration: 210, // 3:30 in seconds
    monitorAnimationId: null,
    compliancePercentage: 82
  };

  // ==========================================================================
  // DOM Elements selector caching
  // ==========================================================================
  
  const screens = {
    login: document.getElementById("screen-login"),
    dashboard: document.getElementById("content-dashboard"),
    library: document.getElementById("content-library"),
    newAssessment: document.getElementById("content-new-assessment"),
    aiReview: document.getElementById("content-ai-review"),
    report: document.getElementById("content-report"),
    portalShell: document.getElementById("portal-shell")
  };

  const navItems = {
    dashboard: document.getElementById("nav-dashboard"),
    library: document.getElementById("nav-library")
  };

  // ==========================================================================
  // Navigation & Screen Transition Controller
  // ==========================================================================

  function showScreen(screenId, pageTitle = "Dashboard") {
    // Stop monitor play if leaving AI review
    if (state.currentScreen === "screen-ai-review" && screenId !== "screen-ai-review") {
      pauseMonitor();
    }

    // Hide all screens
    Object.values(screens).forEach(s => {
      if (s) s.classList.add("hidden");
    });
    
    // Manage sidebar highlight
    Object.values(navItems).forEach(nav => {
      if (nav) nav.classList.remove("active");
    });

    if (screenId === "screen-login") {
      screens.login.classList.remove("hidden");
      screens.login.classList.add("active-screen");
      screens.portalShell.classList.add("hidden");
    } else {
      screens.portalShell.classList.remove("hidden");
      
      if (screenId === "screen-dashboard") {
        screens.dashboard.classList.remove("hidden");
        screens.dashboard.classList.add("active-screen");
        navItems.dashboard.classList.add("active");
      } else if (screenId === "screen-library") {
        screens.library.classList.remove("hidden");
        screens.library.classList.add("active-screen");
        navItems.library.classList.add("active");
      } else if (screenId === "screen-new-assessment") {
        screens.newAssessment.classList.remove("hidden");
        screens.newAssessment.classList.add("active-screen");
      } else if (screenId === "screen-ai-review") {
        screens.aiReview.classList.remove("hidden");
        screens.aiReview.classList.add("active-screen");
        initMonitorCanvas();
        resetMonitor();
        populateAIReviewTimeline();
        populateAIReviewChecklist();
      } else if (screenId === "screen-report") {
        screens.report.classList.remove("hidden");
        screens.report.classList.add("active-screen");
        populateFinalReport();
      }
      
      document.getElementById("header-page-title").textContent = pageTitle;
      screens.portalShell.querySelector("main").scrollTop = 0;
    }
    
    state.currentScreen = screenId;
  }

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================

  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================================
  // Screen 1: Login Handler
  // ==========================================================================

  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("btn-login");
  const loginText = loginBtn.querySelector(".btn-text");
  const loginSpinner = loginBtn.querySelector(".spinner");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    loginBtn.disabled = true;
    loginText.classList.add("hidden");
    loginSpinner.classList.remove("hidden");
    
    setTimeout(() => {
      loginBtn.disabled = false;
      loginText.classList.remove("hidden");
      loginSpinner.classList.add("hidden");
      
      showScreen("screen-dashboard", "Assessor Dashboard");
      showToast("Signed in as Dr. Sarah Jenkins", "info");
    }, 1500);
  });

  // Logout Handler
  document.getElementById("btn-logout").addEventListener("click", () => {
    showScreen("screen-login");
  });

  // ==========================================================================
  // Screen 2: Dashboard Handler
  // ==========================================================================

  // Review buttons click handlers
  document.querySelectorAll(".btn-review").forEach(btn => {
    btn.addEventListener("click", (e) => {
      state.activeStudent = e.target.getAttribute("data-student");
      showScreen("screen-library", "Assessment Frameworks Library");
    });
  });

  // Sidebar navigation click handlers
  navItems.dashboard.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("screen-dashboard", "Assessor Dashboard");
  });

  navItems.library.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("screen-library", "Assessment Frameworks Library");
  });

  // ==========================================================================
  // Screen 3: Assessment Library Handler
  // ==========================================================================

  const btnStartCpr = document.getElementById("btn-start-cpr-assessment");
  btnStartCpr.addEventListener("click", () => {
    showScreen("screen-new-assessment", "Set Up New Assessment");
  });

  // ==========================================================================
  // Screen 4: New Assessment Upload Handlers
  // ==========================================================================

  const dropZoneVideo = document.getElementById("drop-zone-video");
  const inputVideoFile = document.getElementById("input-video-file");
  const videoStateDefault = document.getElementById("video-state-default");
  const videoStateProgress = document.getElementById("video-state-progress");
  const videoStateComplete = document.getElementById("video-state-complete");
  const videoProgressBar = document.getElementById("video-progress-bar");
  const videoProgressPct = document.getElementById("video-progress-pct");
  const btnLoadDemoVideo = document.getElementById("btn-load-demo-video");
  const btnClearVideo = document.getElementById("btn-clear-video");

  const dropZoneTranscript = document.getElementById("drop-zone-transcript");
  const inputTranscriptFile = document.getElementById("input-transcript-file");
  const transcriptStateDefault = document.getElementById("transcript-state-default");
  const transcriptStateProgress = document.getElementById("transcript-state-progress");
  const transcriptStateComplete = document.getElementById("transcript-state-complete");
  const transcriptProgressBar = document.getElementById("transcript-progress-bar");
  const transcriptProgressPct = document.getElementById("transcript-progress-pct");
  const btnLoadDemoTranscript = document.getElementById("btn-load-demo-transcript");
  const btnClearTranscript = document.getElementById("btn-clear-transcript");

  const selectStudent = document.getElementById("select-student");
  const btnRunAI = document.getElementById("btn-run-ai-assessment");

  // Track student selection
  selectStudent.addEventListener("change", (e) => {
    state.activeStudent = e.target.value;
  });

  function updateRunAIButton() {
    btnRunAI.disabled = !(state.videoUploaded && state.transcriptUploaded);
  }

  // Simulated Video Upload Process
  function startVideoUpload(filename, sizeStr) {
    videoStateDefault.classList.add("hidden");
    videoStateProgress.classList.remove("hidden");
    videoProgressBar.style.width = "0%";
    videoProgressPct.textContent = "0%";
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          videoStateProgress.classList.add("hidden");
          videoStateComplete.classList.remove("hidden");
          document.getElementById("video-complete-details").textContent = `${filename} (${sizeStr})`;
          state.videoUploaded = true;
          updateRunAIButton();
          showToast("Simulation video uploaded successfully.");
        }, 300);
      }
      videoProgressBar.style.width = `${progress}%`;
      videoProgressPct.textContent = `${progress}%`;
    }, 100);
  }

  // Simulated Transcript Upload Process
  function startTranscriptUpload(filename, sizeStr) {
    transcriptStateDefault.classList.add("hidden");
    transcriptStateProgress.classList.remove("hidden");
    transcriptProgressBar.style.width = "0%";
    transcriptProgressPct.textContent = "0%";

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          transcriptStateProgress.classList.add("hidden");
          transcriptStateComplete.classList.remove("hidden");
          document.getElementById("transcript-complete-details").textContent = `${filename} (${sizeStr})`;
          state.transcriptUploaded = true;
          updateRunAIButton();
          showToast("Dialogue transcript uploaded successfully.");
        }, 300);
      }
      transcriptProgressBar.style.width = `${progress}%`;
      transcriptProgressPct.textContent = `${progress}%`;
    }, 800 / 15);
  }

  // Browse file click bindings
  btnLoadDemoVideo.addEventListener("click", (e) => {
    e.stopPropagation();
    startVideoUpload("cpr_session_run_4.mp4", "145.2 MB");
  });
  
  btnLoadDemoTranscript.addEventListener("click", (e) => {
    e.stopPropagation();
    startTranscriptUpload("cpr_session_run_4.vtt", "24 KB");
  });

  btnClearVideo.addEventListener("click", (e) => {
    e.stopPropagation();
    videoStateComplete.classList.add("hidden");
    videoStateDefault.classList.remove("hidden");
    state.videoUploaded = false;
    updateRunAIButton();
  });

  btnClearTranscript.addEventListener("click", (e) => {
    e.stopPropagation();
    transcriptStateComplete.classList.add("hidden");
    transcriptStateDefault.classList.remove("hidden");
    state.transcriptUploaded = false;
    updateRunAIButton();
  });

  // File picker changes
  inputVideoFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      startVideoUpload(file.name, `${sizeMB} MB`);
    }
  });

  inputTranscriptFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeKB = (file.size / 1024).toFixed(1);
      startTranscriptUpload(file.name, `${sizeKB} KB`);
    }
  });

  // Run AI Assessment - Multi-Step Modal Loader
  const aiOverlay = document.getElementById("ai-processing-overlay");
  
  btnRunAI.addEventListener("click", () => {
    aiOverlay.classList.remove("hidden");
    
    const steps = [
      document.getElementById("ai-step-1"),
      document.getElementById("ai-step-2"),
      document.getElementById("ai-step-3"),
      document.getElementById("ai-step-4")
    ];

    // Reset step states
    steps.forEach((step, idx) => {
      if (!step) return;
      step.className = "progress-step-item";
      const bullet = step.querySelector(".step-bullet") || step.querySelector(".step-bullet-dot");
      if (idx === 0) {
        step.classList.add("step-active");
        if (bullet) {
          bullet.innerHTML = `<div class="spinner-sm"></div>`;
        }
      } else {
        if (bullet) {
          bullet.innerHTML = `<div class="step-bullet-dot"></div>`;
        }
      }
    });

    // Step 1: Processing video
    setTimeout(() => {
      setStepComplete(steps[0]);
      setStepActive(steps[1]);
      
      // Step 2: Dialogue transcript
      setTimeout(() => {
        setStepComplete(steps[1]);
        setStepActive(steps[2]);
        
        // Step 3: CPR compressions checking
        setTimeout(() => {
          setStepComplete(steps[2]);
          setStepActive(steps[3]);
          
          // Step 4: Compliance score compile
          setTimeout(() => {
            setStepComplete(steps[3]);
            
            // Finish analysis and load AI Review Screen
            setTimeout(() => {
              aiOverlay.classList.add("hidden");
              showScreen("screen-ai-review", `AI Clinical Audit: ${state.activeStudent}`);
            }, 600);
            
          }, 900);
        }, 1200);
      }, 1000);
    }, 1100);
  });

  function setStepComplete(stepEl) {
    if (!stepEl) return;
    stepEl.classList.remove("step-active");
    stepEl.classList.add("step-done");
    const bullet = stepEl.querySelector(".step-bullet") || stepEl.querySelector(".step-bullet-dot");
    if (bullet) {
      bullet.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:var(--emerald-600);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }
  }

  function setStepActive(stepEl) {
    if (!stepEl) return;
    stepEl.classList.add("step-active");
    const bullet = stepEl.querySelector(".step-bullet") || stepEl.querySelector(".step-bullet-dot");
    if (bullet) {
      bullet.innerHTML = `<div class="spinner-sm"></div>`;
    }
  }

  // ==========================================================================
  // Screen 5: AI Review Timeline & Verification Handlers
  // ==========================================================================

  function populateAIReviewTimeline() {
    const list = document.getElementById("findings-list");
    list.innerHTML = "";
    
    timelineEvents.forEach((ev, index) => {
      const item = document.createElement("div");
      item.className = `timeline-item ${ev.type === "compliance" ? "compliance-step" : "deviation-step"}`;
      item.setAttribute("data-index", index);
      
      item.innerHTML = `
        <div class="item-time">${ev.time}</div>
        <div class="item-content">
          <div class="item-title">${ev.title}</div>
          <div class="item-desc">${ev.desc}</div>
        </div>
      `;
      
      item.addEventListener("click", () => selectTimelineEvent(index));
      list.appendChild(item);
    });
  }

  function selectTimelineEvent(index) {
    state.activeTimelineEventIndex = index;
    
    // Highlight list element
    const items = document.querySelectorAll(".timeline-item");
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add("active-timeline-item");
      } else {
        item.classList.remove("active-timeline-item");
      }
    });

    const ev = timelineEvents[index];
    const explainPanel = document.getElementById("explainability-panel-content");
    
    // Set video/monitor play time to match event trigger
    setMonitorTime(ev.seconds);
    
    explainPanel.innerHTML = `
      <div class="explain-content-active">
        <div class="explain-heading">${ev.title}</div>
        <div class="explain-body">
          <strong>AI RATIONALE:</strong>
          ${ev.desc}
          <div style="font-weight:700; color:var(--slate-700); margin-top:8px; font-size:11.5px;">${ev.metric}</div>
        </div>
        <div class="explain-guideline">
          <strong>CLINICAL GUIDELINE CITATION:</strong>
          ${ev.guideline}
        </div>
        <div class="explain-transcript">
          <strong>DIALOGUE AUDIO EVIDENCE:</strong>
          "${ev.transcript}"
        </div>
      </div>
    `;
  }

  function populateAIReviewChecklist() {
    const checklist = document.getElementById("guideline-checklist-items");
    checklist.innerHTML = "";
    
    checklistItems.forEach((item) => {
      const el = document.createElement("li");
      el.className = "checklist-item";
      el.id = `checklist-node-${item.id}`;
      
      const passIcon = `<svg class="check-pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      const failIcon = `<svg class="check-fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      
      el.innerHTML = `
        <div class="checklist-left">
          <span class="check-marker">${item.compliant ? passIcon : failIcon}</span>
          <span>${item.text}</span>
        </div>
        <button class="checklist-override-btn ${!item.compliant ? "overridden" : ""}" data-id="${item.id}">
          ${item.compliant ? "Override Fail" : "Override Pass"}
        </button>
      `;
      
      // Override Button Click Handler
      el.querySelector(".checklist-override-btn").addEventListener("click", (e) => {
        toggleChecklistItem(item.id);
      });

      checklist.appendChild(el);
    });
  }

  function toggleChecklistItem(id) {
    const item = checklistItems.find(c => c.id === id);
    if (!item) return;
    
    item.compliant = !item.compliant;
    
    // Re-render compliance checklists and recalculate scores
    populateAIReviewChecklist();
    recalculateComplianceScore();
    
    showToast(`Guideline item overridden: "${item.text}" set to ${item.compliant ? "Pass" : "Fail"}.`);
  }

  function recalculateComplianceScore() {
    const passedCount = checklistItems.filter(c => c.compliant).length;
    const totalCount = checklistItems.length;
    state.compliancePercentage = Math.round((passedCount / totalCount) * 100);
    
    // Update radial progress display
    document.getElementById("compliance-percentage-text").textContent = `${state.compliancePercentage}%`;
    
    const ring = document.getElementById("compliance-ring-fill");
    // Dasharray circumference: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const offset = 251.2 - (state.compliancePercentage / 100) * 251.2;
    ring.style.strokeDashoffset = offset;
  }

  // Reset/reanalyze button
  document.getElementById("btn-reanalyze").addEventListener("click", () => {
    // Reset checklists to defaults
    checklistItems[5].compliant = false; // index 5 is minimizing interruptions
    recalculateComplianceScore();
    populateAIReviewChecklist();
    resetMonitor();
    
    // Reset explainability empty state
    document.getElementById("explainability-panel-content").innerHTML = `
      <div class="explain-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <p>Click any timeline event to review the clinical reasoning, guideline citations, and transcript references.</p>
      </div>
    `;
    
    const items = document.querySelectorAll(".timeline-item");
    items.forEach(item => item.classList.remove("active-timeline-item"));
    
    showToast("Assessor overrides reset to default AI recommendations.", "info");
  });

  // Approve & Certify Button Action
  document.getElementById("btn-approve-certify").addEventListener("click", () => {
    showScreen("screen-report", "Grades & Certification Report");
    showToast("Simulation evaluation certified successfully.");
  });

  // ==========================================================================
  // Simulated Clinical Vitals Monitor (Canvas Animator)
  // ==========================================================================
  
  let canvas, ctx;
  let ecgX = 0;
  let ecgY = 150;
  const canvasPoints = [];
  
  function initMonitorCanvas() {
    canvas = document.getElementById("patient-monitor-canvas");
    ctx = canvas.getContext("2d");
    
    // Clean canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ecgX = 0;
    canvasPoints.length = 0;
  }

  function startMonitor() {
    if (state.monitorPlaying) return;
    
    state.monitorPlaying = true;
    document.getElementById("svg-play").classList.add("hidden");
    document.getElementById("svg-pause").classList.remove("hidden");
    
    // Start canvas animation frame loop
    animateMonitor();
  }

  function pauseMonitor() {
    state.monitorPlaying = false;
    document.getElementById("svg-play").classList.remove("hidden");
    document.getElementById("svg-pause").classList.add("hidden");
    
    if (state.monitorAnimationId) {
      cancelAnimationFrame(state.monitorAnimationId);
      state.monitorAnimationId = null;
    }
  }

  function resetMonitor() {
    pauseMonitor();
    setMonitorTime(0);
  }

  function setMonitorTime(seconds) {
    state.monitorTime = Math.max(0, Math.min(seconds, state.monitorDuration));
    updateMonitorUI();
  }

  // Monitor playback play/pause trigger
  document.getElementById("btn-player-play").addEventListener("click", () => {
    if (state.monitorPlaying) {
      pauseMonitor();
    } else {
      startMonitor();
    }
  });

  // Monitor timeline scrubber click handler
  const progressContainer = document.getElementById("player-progress-container");
  progressContainer.addEventListener("click", (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = clickX / width;
    
    const clickSeconds = Math.round(pct * state.monitorDuration);
    setMonitorTime(clickSeconds);
    
    // Highlight matching timeline event if close
    findClosestTimelineEvent(clickSeconds);
  });

  function findClosestTimelineEvent(sec) {
    let closestIndex = null;
    let minDiff = 10; // margin of seconds to snap
    
    timelineEvents.forEach((ev, i) => {
      const diff = Math.abs(ev.seconds - sec);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });
    
    if (closestIndex !== null) {
      selectTimelineEvent(closestIndex);
    }
  }

  function formatTime(secTotal) {
    const min = Math.floor(secTotal / 60);
    const sec = Math.floor(secTotal % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function updateMonitorUI() {
    const timeStr = formatTime(state.monitorTime);
    document.getElementById("monitor-timestamp").textContent = timeStr;
    document.getElementById("time-curr").textContent = timeStr;
    
    const progressPct = (state.monitorTime / state.monitorDuration) * 100;
    document.getElementById("player-progress-bar").style.width = `${progressPct}%`;
    
    // Update Vitals depending on current time window
    const sec = state.monitorTime;
    const vitals = {
      hr: "--", bp: "--/--", spo2: "--", rhythm: "VENTRICULAR FIBRILLATION", color: "#ef4444"
    };

    if (sec < 138) { // 0:00 to 2:18 - VF (Pre-Shock)
      vitals.hr = "0";
      vitals.bp = "0/0";
      vitals.spo2 = "45";
      vitals.rhythm = "VF - VENTRICULAR FIBRILLATION";
      vitals.color = "#ef4444"; // red
    } else if (sec >= 138 && sec < 140) { // 2:18 to 2:20 - Shock delivery
      vitals.hr = "0";
      vitals.bp = "0/0";
      vitals.spo2 = "--";
      vitals.rhythm = "DEFIB SHOCK DELIVERED";
      vitals.color = "#ffffff"; // white
    } else if (sec >= 140 && sec < 180) { // 2:20 to 3:00 - CPR restarted with artifact
      vitals.hr = "112"; // matches chest compression rate
      vitals.bp = "68/42";
      vitals.spo2 = "76";
      vitals.rhythm = "CPR COMPRESSION ARTIFACT";
      vitals.color = "#eab308"; // yellow
    } else { // 3:00 to end - ROSC (Sinus Rhythm)
      vitals.hr = "82";
      vitals.bp = "118/72";
      vitals.spo2 = "98";
      vitals.rhythm = "ROSC - SINUS RHYTHM";
      vitals.color = "#22c55e"; // green
    }

    document.getElementById("monitor-hr").textContent = vitals.hr;
    document.getElementById("monitor-bp").textContent = vitals.bp;
    document.getElementById("monitor-spo2").textContent = vitals.spo2;
    document.getElementById("monitor-rhythm").textContent = vitals.rhythm;
    document.getElementById("monitor-rhythm").style.color = vitals.color;
  }

  // Scrolling ECG Waveform generator loop
  let lastTimeUpdate = 0;
  let ecgStep = 0;

  function animateMonitor(timestamp) {
    if (!state.monitorPlaying) return;

    if (!lastTimeUpdate) lastTimeUpdate = timestamp;
    const elapsed = timestamp - lastTimeUpdate;
    
    // Accumulate playback time
    if (elapsed >= 1000) {
      state.monitorTime += 1;
      if (state.monitorTime >= state.monitorDuration) {
        state.monitorTime = state.monitorDuration;
        pauseMonitor();
      }
      updateMonitorUI();
      lastTimeUpdate = timestamp;
    }

    drawECGWave();
    
    state.monitorAnimationId = requestAnimationFrame(animateMonitor);
  }

  function drawECGWave() {
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Speed of sweep across screen
    const speed = 2.5;
    
    // Clean a small vertical block ahead of the draw point to create scanning effect
    ctx.fillStyle = "#000000";
    ctx.fillRect(ecgX, 0, 16, height);
    
    // Generate height matching rhythm type
    const sec = state.monitorTime;
    let targetY = height / 2;
    
    ecgStep++;

    if (sec < 138) { // V-Fib (Crazy erratic high frequency wave)
      const freq = 0.25;
      const amp = 30 + Math.sin(ecgStep * 0.05) * 15;
      targetY = (height / 2) + Math.sin(ecgStep * freq) * amp * Math.random();
    } else if (sec >= 138 && sec < 140) { // Defib Shock pulse
      if (ecgStep % 60 < 5) {
        // Shock pulse spike
        targetY = 20;
      } else if (ecgStep % 60 < 10) {
        targetY = height - 20;
      } else {
        targetY = height / 2; // flat
      }
    } else if (sec >= 140 && sec < 180) { // CPR compressions artifact (regular large waves)
      // Standard regular compression rate ~110bpm
      const pulsePeriod = 24; // step counts
      const t = ecgStep % pulsePeriod;
      
      if (t < 4) {
        targetY = (height / 2) - (t * 18); // compression spike down
      } else if (t < 10) {
        targetY = (height / 2) + ((t - 4) * 22); // compression rebound up
      } else {
        targetY = (height / 2); // rest recoil
      }
    } else { // Normal Sinus Rhythm (QRS Complex)
      // Heart rate ~80 bpm
      const pulsePeriod = 36; // step counts
      const t = ecgStep % pulsePeriod;
      
      if (t === 0) { // P wave
        targetY = (height / 2) - 8;
      } else if (t === 2) {
        targetY = height / 2;
      } else if (t === 5) { // Q wave (slight dip)
        targetY = (height / 2) + 6;
      } else if (t === 6) { // R wave (huge spike up)
        targetY = (height / 2) - 65;
      } else if (t === 7) { // S wave (dip down)
        targetY = (height / 2) + 20;
      } else if (t === 9) {
        targetY = height / 2;
      } else if (t === 14) { // T wave (moderate curve)
        targetY = (height / 2) - 15;
      } else if (t === 18) {
        targetY = height / 2;
      } else {
        targetY = height / 2; // flat baseline
      }
    }

    // Draw lines
    ctx.strokeStyle = sec < 138 ? "#f43f5e" : (sec < 180 ? "#eab308" : "#10b981");
    if (sec >= 138 && sec < 140) ctx.strokeStyle = "#ffffff"; // white shock pulse
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = ctx.strokeStyle;
    
    ctx.beginPath();
    ctx.moveTo(ecgX - speed, ecgY);
    ctx.lineTo(ecgX, targetY);
    ctx.stroke();
    
    // Save last position
    ecgY = targetY;
    
    // Increment sweep point, wrapping around screen
    ecgX += speed;
    if (ecgX >= width) {
      ecgX = 0;
    }
  }

  // ==========================================================================
  // Screen 6: Graded Assessment Report Card
  // ==========================================================================

  function populateFinalReport() {
    document.getElementById("report-val-student").textContent = state.activeStudent;
    
    // Generate certified timestamp
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById("report-val-date").textContent = formattedDate;
    document.getElementById("report-cert-date").textContent = formattedDate;
    
    // Update Score outputs
    const reportScore = Math.max(50, Math.min(100, Math.round(state.compliancePercentage * 0.9 + 11.2))); // scale slightly
    document.getElementById("report-overall-score").textContent = reportScore;
    
    // Score Badge Pass/Fail Status
    const passFailEl = document.querySelector(".pass-fail-badge");
    if (reportScore >= 80) {
      passFailEl.className = "pass-fail-badge pass";
      passFailEl.textContent = "PASS - CERTIFIED";
    } else {
      passFailEl.className = "pass-fail-badge fail";
      passFailEl.textContent = "CRITICAL FAIL";
      passFailEl.style.backgroundColor = "var(--rose-50)";
      passFailEl.style.color = "var(--rose-700)";
      passFailEl.style.border = "1px solid var(--rose-100)";
    }

    // Update Graded Categories Progress bars
    const barsContainer = document.getElementById("report-summary-bars");
    barsContainer.innerHTML = "";
    
    // Scale categories dynamically depending on overall compliance
    reportCategories.forEach((cat) => {
      let finalCatScore = cat.score;
      if (cat.name === "Defibrillation Protocol Compliance") {
        finalCatScore = checklistItems[5].compliant ? 100 : 70; // index 5 is minimizing interruptions
      }
      
      let barClass = "bar-emerald";
      if (finalCatScore < 80) barClass = "bar-rose";
      else if (finalCatScore < 95) barClass = "bar-amber";
      
      const row = document.createElement("div");
      row.className = "summary-bar-row";
      row.innerHTML = `
        <span class="summary-row-label">${cat.name}</span>
        <div class="summary-bar-outer">
          <div class="summary-bar-inner ${barClass}" style="width:${finalCatScore}%"></div>
        </div>
        <span class="summary-row-pct">${finalCatScore}%</span>
      `;
      barsContainer.appendChild(row);
    });

    // Populate strengths & weaknesses lists based on deviations status
    const strengthsList = document.getElementById("report-strengths-list");
    const weaknessesList = document.getElementById("report-weaknesses-list");
    const coachingList = document.getElementById("report-coaching-list");

    weaknessesList.innerHTML = "";
    coachingList.innerHTML = "";

    // If chest compressions minimize interruptions is marked compliant
    if (checklistItems[5].compliant) {
      weaknessesList.innerHTML = `
        <li><strong>No critical protocol deviations:</strong> All ACLS compressions and ventilation intervals met guideline thresholds.</li>
        <li><strong>Ventilation volume:</strong> 2 bag-valve ventilations exceeded the target tidal volume (minor hyperinflation noted).</li>
      `;
      coachingList.innerHTML = `
        <li>Practice ventilation delivery on a volume-feedback clinical trainer to establish muscle memory for chest rise without exceeding target pressure limits.</li>
        <li>Maintain current excellent standard for compression rate and defibrillator cycle timing.</li>
      `;
    } else {
      weaknessesList.innerHTML = `
        <li><strong>Delay in CPR restart:</strong> Pause in chest compressions during defibrillator charging cycle was 14s (AHA guideline threshold: &lt; 10s).</li>
        <li><strong>Ventilation over-volume:</strong> 2 bag-valve ventilations exceeded the target tidal volume (visible hyperinflation).</li>
      `;
      coachingList.innerHTML = `
        <li>Practice defibrillator pad pre-charging while chest compressions are actively occurring. Do not halt active compressions while the unit charges; compressions should only halt for rhythm check and shock delivery.</li>
        <li>Conduct BVM ventilation practice on a volume-feedback trainer to gain muscle memory for appropriate chest rise without hyperventilating the patient.</li>
      `;
    }

    // Set comments
    const commentsArea = document.getElementById("instructor-feedback");
    document.getElementById("report-comments-text").textContent = commentsArea.value;
  }

  // Return to dashboard link
  document.getElementById("btn-return-dashboard").addEventListener("click", () => {
    showScreen("screen-dashboard", "Assessor Dashboard");
  });

  // ==========================================================================
  // Report Download (PDF Print Driver)
  // ==========================================================================

  const btnPrintPdf = document.getElementById("btn-print-pdf");
  btnPrintPdf.addEventListener("click", () => {
    window.print();
  });

  // ==========================================================================
  // Report Share (Student Email Modal)
  // ==========================================================================

  const btnShareStudent = document.getElementById("btn-share-student");
  const shareModal = document.getElementById("share-modal");
  const btnCloseModal = document.getElementById("btn-close-share-modal");
  const btnCancelShare = document.getElementById("btn-cancel-share");
  const btnSendShare = document.getElementById("btn-send-share");
  const studentEmailInput = document.getElementById("share-student-email");

  btnShareStudent.addEventListener("click", () => {
    // Preset default email depending on selected student name
    const emailName = state.activeStudent.toLowerCase().replace(" ", ".");
    studentEmailInput.value = `${emailName}@simcenter.org`;
    
    // Open modal
    shareModal.classList.remove("hidden");
  });

  function closeModal() {
    shareModal.classList.add("hidden");
  }

  btnCloseModal.addEventListener("click", closeModal);
  btnCancelShare.addEventListener("click", closeModal);

  btnSendShare.addEventListener("click", () => {
    const textEl = btnSendShare.querySelector(".btn-text");
    const spinnerEl = btnSendShare.querySelector(".spinner");

    // Loading transition
    btnSendShare.disabled = true;
    textEl.classList.add("hidden");
    spinnerEl.classList.remove("hidden");

    setTimeout(() => {
      // Complete
      btnSendShare.disabled = false;
      textEl.classList.remove("hidden");
      spinnerEl.classList.add("hidden");
      
      closeModal();
      showToast(`Evaluation report shared with ${state.activeStudent} successfully.`, "success");
    }, 1500);
  });

  // Clock Update Driver
  function updateTime() {
    const timeEl = document.getElementById("system-time");
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleDateString("en-US", { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }) + " | " + now.toLocaleTimeString("en-US", { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
    }
  }
  setInterval(updateTime, 1000);
  updateTime();

  // Initialize first screen
  showScreen("screen-login");

});
