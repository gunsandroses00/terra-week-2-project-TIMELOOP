const $=(id)=> document.getElementById(id);
const STORAGE_KEY="timeloop-data-v1";

function loadHistory(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && saved.days){
      return saved.days;
    }
    if(saved && saved.days){
      return saved.days;
    }
    if(saved && saved.date){
      return{
        [saved.date]:saved
      };
    }
  }catch(error){
    console.warn("Could not load saved history:",error);
  }
  return{};
}
let history=loadHistory();
function todayKey(){
  const d=new Date();
  const year=d.getFullYear();
  const month=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}
function loadData(){
  return history[todayKey()]||{
    date:todayKey(),
    tasks:[],
    sessions:[]
  };
}
let data=loadData();
let duration=25*60;
let remaining=duration;
let interval=null;
let running=false;
let startedAt=null;
let sessionName="";
let endAt=null;
let weeklyChartInstance=null;
let tasksChartInstance=null;
function saveData(){
  try{
    history[data.date]=data;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({days:history})
    );
  }catch(error){
    console.error("Couls not save data:",error);
    alert("Your browser could could not save the data.");
  }
}
function formatTime(seconds){
  const h=Math.floor(seconds/3600);
  const m=Math.floor((seconds%3600)/60);
  const s=seconds%60;
  if(h>0){
    return[h,m,s]
    .map(n=>String(n).padStart(2,"0"))
    .join(":");
  }
  return[m,s]
  .map(n=> String(n).padStart(2,"0"))
  .join(":");
}
function renderTimer(){
  $("timer").textContent=formatTime(remaining);
  $("focusTotal").textContent=formatTime(
    data.sessions.reduce(
      (sum,session)=>sum+session.seconds,
      0    
    )
  );
  $("sessionCount").textContent=data.sessiona.length;
}
function renderTimer() {
    $("timer").textContent = formatTime(remaining);

    $("focusTotal").textContent = formatTime(
        data.sessions.reduce(
            (sum, session) => sum + session.seconds,
            0
        )
    );

    $("sessionCount").textContent = data.sessions.length;
}

// RENDER TASKS
function renderTasks() {
    const list = $("taskList");
    list.replaceChildren();

    data.tasks.forEach(task => {
        const li = document.createElement("li");

        li.className = "task-item" + (task.done ? " done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.setAttribute("aria-label", "Complete " + task.text);

        checkbox.addEventListener("change", () => {
            task.done = checkbox.checked;
            saveData();
            renderTasks();
        });

        const text = document.createElement("span");
        text.textContent = task.text;

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete " + task.text);

        remove.addEventListener("click", () => {
            data.tasks = data.tasks.filter(
                item => item.id !== task.id
            );

            saveData();
            renderTasks();
        });

        li.append(checkbox, text, remove);
        list.append(li);
    });

    $("emptyTasks").hidden = data.tasks.length > 0;

    $("completedCount").textContent =
        data.tasks.filter(task => task.done).length;

    $("taskBadge").textContent =
        `${data.tasks.length} task${data.tasks.length === 1 ? "" : "s"}`;

    renderAnalytics();
}
function renderTimeline() {
    const list = $("timelineList");
    list.replaceChildren();

    if (data.sessions.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Your focus sessions will appear here.";

        list.append(empty);
        return;
    }

    [...data.sessions].reverse().forEach(session => {
        const entry = document.createElement("div");
        entry.className = "timeline-entry";

        const title = document.createElement("strong");
        title.textContent = session.name;

        const detail = document.createElement("span");

        detail.textContent =
            `${session.time} · ${formatTime(session.seconds)} focused`;

        entry.append(title, detail);
        list.append(entry);
    });
}


function renderAnalytics() {
    const today = new Date();

    const labels = [];
    const focusMinutes = [];
    const completedTasks = [];

    let totalFocus = 0;
    let totalTasks = 0;
    let totalSessions = 0;

   
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        const dateKey = `${year}-${month}-${day}`;

        const dayData = dateKey === data.date
            ? data
            : history[dateKey] || {
                tasks: [],
                sessions: []
            };

        const minutes = dayData.sessions.reduce(
            (sum, session) => sum + session.seconds / 60,
            0
        );

        const tasksDone = dayData.tasks.filter(
            task => task.done
        ).length;

        labels.push(
            date.toLocaleDateString(undefined, {
                weekday: "short"
            })
        );

        focusMinutes.push(Math.round(minutes));
        completedTasks.push(tasksDone);

        totalFocus += minutes;
        totalTasks += tasksDone;
        totalSessions += dayData.sessions.length;
    }
    const hours = Math.floor(totalFocus / 60);
    const minutes = Math.round(totalFocus % 60);
    $("weeklyFocus").textContent = `${hours}h ${minutes}m`;
    $("weeklyTasks").textContent = totalTasks;
    $("weeklySessions").textContent = totalSessions;
    if (typeof Chart === "undefined") {
        console.error("Chart.js is not loaded.");
        return;
    }

    const focusCanvas = $("weeklyChart");

    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
    }

    weeklyChartInstance = new Chart(focusCanvas, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [{
                label: "Focus minutes",
                data: focusMinutes,
                backgroundColor: "#a7f36b",
                borderRadius: 7
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: "#f0f2f8"
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#858c9e"
                    },
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: "#858c9e"
                    },

                    grid: {
                        color: "#292d38"
                    }
                }
            }
        }
    });

 
    const tasksCanvas = $("tasksChart");

    if (tasksChartInstance) {
        tasksChartInstance.destroy();
    }

    tasksChartInstance = new Chart(tasksCanvas, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [{
                label: "Completed tasks",
                data: completedTasks,
                backgroundColor: "#f48fb1",
                borderRadius: 7
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: "#f0f2f8"
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#858c9e"
                    },
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: "#858c9e",
                        precision: 0
                    },

                    grid: {
                        color: "#292d38"
                    }
                }
            }
        }
    });
}
function renderAll() {
    renderTimer();
    renderTasks();
    renderTimeline();
}
function startTimer() {
    if (running) {
        pauseTimer();
        return;
    }
    if (remaining <= 0) {
        remaining = duration;
    }
    sessionName = $("activity").value.trim() || "Focus session";
    running = true;
    if (!startedAt) {
        startedAt = Date.now();
    }
    endAt = Date.now() + remaining * 1000;
    $("startBtn").textContent = "Pause";
    $("timerStatus").textContent = "Focus mode active. Stay on task.";

    interval = setInterval(() => {
        remaining = Math.max(
            0,
            Math.ceil((endAt - Date.now()) / 1000)
        );

        renderTimer();

        if (remaining <= 0) {
            completeSession();
        }
    }, 250);
}
function pauseTimer() {
    if (!running) return;
    running = false;
    clearInterval(interval);
    interval = null;
    endAt = null;
    $("startBtn").textContent = "Resume focus";
    $("timerStatus").textContent = "Paused. Take a breath.";
}
function resetTimer() {
    pauseTimer();
    remaining = duration;
    startedAt = null;
    $("startBtn").textContent = "Start focus";
    $("timerStatus").textContent = "Ready when you are.";
    renderTimer();
}
function completeSession() {
    pauseTimer();
    const elapsed = Math.max(
        0,
        Math.round((Date.now() - startedAt) / 1000)
    );
    data.sessions.push({
        name: sessionName,
        seconds: Math.min(duration, elapsed),
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    });
    saveData();
    remaining = duration;
    startedAt = null;
    $("startBtn").textContent = "Start focus";
    $("timerStatus").textContent = "Session complete. Nice work.";

    renderAll();
}
$("startBtn").addEventListener("click", startTimer);
$("resetBtn").addEventListener("click", resetTimer);
$("taskForm").addEventListener("submit", event => {
    event.preventDefault();
    const text = $("taskInput").value.trim();
    if (!text) return;
    data.tasks.push({
        id: Date.now() + Math.random(),
        text,
        done: false
    });
    $("taskInput").value = "";
    saveData();
    renderTasks();
});
$("today").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
});
console.log("SCRIPT REACHED END");
console.log("Start button:", $("startBtn"));
console.log("Task form:", $("taskForm"));
renderAll();


