/*************************************************
 🔥 FIREBASE CONFIG
*************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyDnJSn5ttZYpHlglJ0suze4obmDxE5A5ZU",
  authDomain: "migration-dashboard-45c0a.firebaseapp.com",
  projectId: "migration-dashboard-45c0a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/*************************************************
 🔧 GLOBAL STATE
*************************************************/
let projects = [];
let editId = null;
let statusChart = null;

/*************************************************
 🧩 DOM ELEMENTS
*************************************************/
const modal = document.getElementById("modal");
const product = document.getElementById("product");
const country = document.getElementById("country");
const status = document.getElementById("status");
const start = document.getElementById("start");
const end = document.getElementById("end");
const pages = document.getElementById("pages");
const zoho = document.getElementById("zoho");

const tableBody = document.getElementById("tableBody");
const statusFilter = document.getElementById("statusFilter");
const countryFilter = document.getElementById("countryFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

const total = document.getElementById("total");
const pending = document.getElementById("pending");
const issue = document.getElementById("issue");
const released = document.getElementById("released");

const chartCanvas = document.getElementById("statusChart");

/*************************************************
 🪟 MODAL CONTROLS
*************************************************/
function openModal(p = null) {
  modal.style.display = "flex";
  editId = null;

  if (p) {
    editId = p.id;
    product.value = p.product || "";
    country.value = p.country || "";
    status.value = p.status || "Yet to Start";
    start.value = p.start || "";
    end.value = p.end || "";
    pages.value = p.pages || "";
    zoho.value = p.zoho || "";
  }
}

function closeModal() {
  modal.style.display = "none";
  editId = null;
  document.querySelector(".modal-content").reset();
}

/*************************************************
 💾 SAVE / UPDATE PROJECT
*************************************************/
function saveProject(e) {
  e.preventDefault();

  const data = {
    product: product.value.trim(),
    country: country.value.trim(),
    status: status.value,
    start: start.value || "",
    end: end.value || "",
    pages: pages.value || "",
    zoho: zoho.value || "",
    created: firebase.firestore.Timestamp.now()
  };

  if (!data.product || !data.country || !data.status) {
    alert("Product, Country, and Status are required");
    return;
  }

  if (editId) {
    db.collection("projects").doc(editId).set(data);
  } else {
    db.collection("projects").add(data);
  }

  closeModal();
}

/*************************************************
 🗑 DELETE PROJECT
*************************************************/
function deleteProject(id) {
  if (confirm("Are you sure you want to delete this project?")) {
    db.collection("projects").doc(id).delete();
  }
}

/*************************************************
 📥 REAL-TIME DATA LOAD
*************************************************/
db.collection("projects")
  .orderBy("created", "desc")
  .onSnapshot(snapshot => {
    projects = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    applyFilters();
  });

/*************************************************
 🎯 FILTERS (CASE-INSENSITIVE)
*************************************************/
function applyFilters() {
  let filtered = [...projects];

  // Status filter
  if (statusFilter.value) {
    const s = statusFilter.value.toLowerCase();
    filtered = filtered.filter(p =>
      p.status && p.status.toLowerCase() === s
    );
  }

  // Country filter (partial + case-insensitive)
  if (countryFilter.value.trim()) {
    const c = countryFilter.value.trim().toLowerCase();
    filtered = filtered.filter(p =>
      p.country && p.country.toLowerCase().includes(c)
    );
  }

  // Date range filter
  const from = fromDate.value ? new Date(fromDate.value) : null;
  const to = toDate.value ? new Date(toDate.value) : null;

  if (from && to) {
    filtered = filtered.filter(p => {
      const created = p.created.toDate();
      return created >= from && created <= to;
    });
  }

  renderTable(filtered);
  updateStats(filtered);
  renderChart(filtered);
}

/*************************************************
 📋 TABLE RENDER
*************************************************/
function renderTable(list) {
  tableBody.innerHTML = "";

  list.forEach(p => {
    tableBody.innerHTML += `
      <tr>
        <td>${p.product}</td>
        <td>${p.country}</td>
        <td>
          <span class="badge ${p.status.replace(/ /g, "").toLowerCase()}">
            ${p.status}
          </span>
        </td>
        <td>${p.start || "-"}</td>
        <td>${p.end || "-"}</td>
        <td>${p.pages || "-"}</td>
        <td>${p.zoho ? `<a href="${p.zoho}" target="_blank">Open</a>` : "-"}</td>
        <td>
          <button onclick='openModal(${JSON.stringify(p)})'>✏️</button>
          <button onclick='deleteProject("${p.id}")'>🗑️</button>
        </td>
      </tr>
    `;
  });
}

/*************************************************
 📊 STATS
*************************************************/
function updateStats(list) {
  total.innerText = list.length;
  pending.innerText = list.filter(p => p.status === "Pending").length;
  issue.innerText = list.filter(p => p.status === "Issue").length;
  released.innerText = list.filter(p => p.status === "Released").length;
}

/*************************************************
 📈 CHART (CONTROLLED SIZE)
*************************************************/
function renderChart(list) {
  const counts = {
    "Yet to Start": 0,
    "Pending": 0,
    "Issue": 0,
    "Released": 0,
    "Updated to Local": 0
  };

  list.forEach(p => counts[p.status]++);

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [
          "#9ca3af",
          "#fb923c",
          "#ef4444",
          "#22c55e",
          "#38bdf8"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

/*************************************************
 📤 EXPORT CSV (EXCEL)
*************************************************/
function exportExcel() {
  let csv = "Product,Country,Status,Start Date,End Date,Pages,Zoho Sheet\n";

  projects.forEach(p => {
    csv += `"${p.product}","${p.country}","${p.status}","${p.start}","${p.end}","${p.pages}","${p.zoho}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "migration_projects.csv";
  link.click();
}
