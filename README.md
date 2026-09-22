# 🚆 TM-FAILURE ANALYSIS AND SURVEILLANCE TOOL
### Indian Railways / South Western Railway (SWR) Specialized Track Machine Fleet Surveillance

A real-time reliability, MTTR analytics, and repetitive breakdown surveillance web dashboard for Indian Railways Track Machines.

---

## 🎨 Theme & Visual Identity
- **Pista Green (`#93c572`) & Golden (`#d4af37`)** atmospheric dark theme with an ambient site-repair backdrop of a Plasser & Theurer Unimat track machine undergoing night restoration under golden floodlights.
- **Strict Divisional Color Mapping**:
  - 🔵 **SBC (Bengaluru Division)**: Blue (`#2563eb`)
  - 🟢 **MYS (Mysuru Division)**: Green (`#16a34a`)
  - 🟤 **UBL (Hubballi Division)**: Maroon (`#800000`)

---

## 📊 Authentic Fleet Coverage (19 Verified Machines, 684 Incidents)
- **UBL Division (12 Machines, 314 Incidents)**: BCM-351, BCM-400, CSM-945, FRM-1899, FRM-57160, MDU-57218, MDU-57220, MDU-57222, UTV-001, MPT-12008, MPT-56577, MPT-56944
- **SBC Division (4 Machines, 245 Incidents)**: UNIMAT-8269, DUO-8112, MPT-12015, SQRS-7&8
- **MYS Division (3 Machines, 125 Incidents)**: FRM-1889, DUO-3324, DUO-8128
- **New Machine Support**: Direct upload of history registers under any category (`CSM`, `DTE`, `DUO`, `UNI/PCTM`, `MPT`, `BCM`, `SBCM/FRM`, `BRM`, `SQRS`, `T28`, `DGS`, `UTV`, `RMBV`, `MDU`).

---

## 🚀 Key Features
1. **Repetitive Failure Surveillance Radar**: Detects recurring subsystem/component failures within 60 days on the same machine.
2. **MTTR & Restoration Lifecycle Analytics**: Mean Time to Repair, down days tracking, root cause analyses (RCA), and future preventive measures.
3. **Multi-Sheet SWR Parser**: Ingests Indian Railways Track Machine failure registers (`TAMPING UNIT FAILURES`, `ENGINE FAILURES`, `MECHANICAL`, `PNEUMATIC`, `HYDRAULIC`, `ELECTRICAL`, `CRANE FAILURES`).
4. **Offline & Client-Side Architecture**: Pure HTML5, CSS3, vanilla JavaScript, Chart.js, and SheetJS. No backend database required.

---

## 🌐 Deploying to GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Branch**, select `main` (root) and click **Save**.
4. Access the live dashboard globally at:  
   `https://<your-username>.github.io/<repo-name>/`
