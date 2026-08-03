import { useState } from "react";
import "./App.css";
import { CaseFilesPage } from "./pages/CaseFilesPage";
import { Ps41Page } from "./pages/Ps41Page";

type Tab = "caseFiles" | "ps41";

function App() {
  const [tab, setTab] = useState<Tab>("caseFiles");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>路燈案件統計分析系統</h1>
        <nav className="tab-nav">
          <button type="button" className={`tab-btn${tab === "caseFiles" ? " active" : ""}`} onClick={() => setTab("caseFiles")}>
            案件主檔／自主API派工
          </button>
          <button type="button" className={`tab-btn${tab === "ps41" ? " active" : ""}`} onClick={() => setTab("ps41")}>
            PS4.1 分析系統
          </button>
        </nav>
      </header>

      {tab === "caseFiles" ? <CaseFilesPage /> : <Ps41Page />}
    </div>
  );
}

export default App;
